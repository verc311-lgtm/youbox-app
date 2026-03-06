/**
 * src/hooks/useQueries.ts
 *
 * Centralized React Query hooks for fetching core entities.
 * Using these hooks ensures data is cached and shared across pages,
 * dramatically reducing redundant Supabase API calls.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Query Keys ────────────────────────────────────────────────────────────────
// Centralised keys prevent typos and allow precise cache invalidation.
export const QUERY_KEYS = {
  clientes: ['clientes'] as const,
  bodegas: ['bodegas'] as const,
  transportistas: ['transportistas'] as const,
  zonas: ['zonas'] as const,
  paquetes: (filters?: Record<string, unknown>) => ['paquetes', filters] as const,
  tarifas: (bodegaId?: string) => ['tarifas', bodegaId] as const,
  sucursales: ['sucursales'] as const,
};

// ─── Clients ──────────────────────────────────────────────────────────────────
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  locker_id: string;
  email: string;
  sucursal_id?: string;
  activo?: boolean;
}

export function useClientes() {
  return useQuery({
    queryKey: QUERY_KEYS.clientes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, apellido, locker_id, email, sucursal_id, activo')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

// ─── Warehouses / Bodegas ─────────────────────────────────────────────────────
export interface Bodega {
  id: string;
  nombre: string;
  activo?: boolean;
}

export function useBodegas() {
  return useQuery({
    queryKey: QUERY_KEYS.bodegas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bodegas')
        .select('id, nombre, activo')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as Bodega[];
    },
  });
}

// ─── Carriers / Transportistas ────────────────────────────────────────────────
export interface Transportista {
  id: string;
  nombre: string;
}

export function useTransportistas() {
  return useQuery({
    queryKey: QUERY_KEYS.transportistas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transportistas')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as Transportista[];
    },
  });
}

// ─── Delivery Zones ───────────────────────────────────────────────────────────
export interface Zona {
  id: string;
  nombre: string;
}

export function useZonas() {
  return useQuery({
    queryKey: QUERY_KEYS.zonas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zonas_entrega')
        .select('id, nombre')
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as Zona[];
    },
  });
}

// ─── Tariffs (per warehouse) ──────────────────────────────────────────────────
export interface Tarifa {
  id: string;
  nombre_servicio: string;
  tarifa_q: number;
  tipo_cobro: string;
  bodega_id: string;
}

export function useTarifas(bodegaId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tarifas(bodegaId),
    queryFn: async () => {
      if (!bodegaId) return [];
      const { data, error } = await supabase
        .from('tarifas')
        .select('id, nombre_servicio, tarifa_q, tipo_cobro, bodega_id')
        .eq('bodega_id', bodegaId)
        .eq('activa', true)
        .order('nombre_servicio');
      if (error) throw error;
      return (data ?? []) as Tarifa[];
    },
    enabled: !!bodegaId,
  });
}

// ─── Packages ─────────────────────────────────────────────────────────────────
export interface PaqueteBase {
  id: string;
  tracking: string;
  peso_lbs: number;
  peso_volumetrico: number;
  piezas: number;
  estado: string;
  notas?: string;
  created_at: string;
  foto_url?: string;
  cliente_id?: string;
  bodega_id?: string;
  transportista_id?: string;
}

interface PaquetesFilters extends Record<string, unknown> {
  sucursalId?: string;
  estado?: string;
  bodegaId?: string;
}

export function usePaquetes(filters: PaquetesFilters = {}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;

  return useQuery({
    queryKey: QUERY_KEYS.paquetes(filters),
    queryFn: async () => {
      let query = supabase
        .from('paquetes')
        .select(`
          id, tracking, peso_lbs, peso_volumetrico, piezas, estado, notas,
          created_at, foto_url, cliente_id, bodega_id, transportista_id,
          clientes(id, nombre, apellido, locker_id, sucursal_id),
          bodegas(id, nombre),
          transportistas(id, nombre)
        `)
        .order('created_at', { ascending: false });

      // Scope to branch for non-super-admins
      if (!isSuperAdmin && user?.sucursal_id) {
        query = query.eq('clientes.sucursal_id', user.sucursal_id);
      }

      if (filters.estado) query = query.eq('estado', filters.estado);
      if (filters.bodegaId) query = query.eq('bodega_id', filters.bodegaId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown[];
    },
  });
}

// ─── Delete Package Mutation ──────────────────────────────────────────────────
export function useDeletePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('paquetes').delete().eq('id', id);
      if (error) throw error;
    },
    // Optimistic update: instantly remove from cache before server responds
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['paquetes'] });
      const snapshots = qc.getQueriesData({ queryKey: ['paquetes'] });
      qc.setQueriesData({ queryKey: ['paquetes'] }, (old: unknown[]) =>
        old ? old.filter((p: any) => p.id !== id) : []
      );
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      // Roll back if something went wrong
      if (ctx?.snapshots) {
        ctx.snapshots.forEach(([key, value]) => qc.setQueryData(key, value));
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['paquetes'] });
    },
  });
}
