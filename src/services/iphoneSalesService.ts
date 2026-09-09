import { supabase } from '../lib/supabase';

export type TipoOrden = 'pre_orden' | 'orden';
export type EstadoOrden = 'pendiente_compra' | 'comprado' | 'en_transito' | 'en_bodega' | 'entregado' | 'cancelado';

export interface OrdenIphone {
    id: string;
    numero_orden: string;
    tipo_orden: TipoOrden;
    cliente_id?: string | null;
    cliente_nombre: string;
    cliente_telefono?: string | null;
    cliente_email?: string | null;
    locker_id?: string | null;
    modelo: string;
    capacidad: string;
    color?: string | null;
    estado_equipo: string;
    precio_total: number;
    anticipo_pagado: number;
    saldo_pendiente: number;
    metodo_pago?: string | null;
    referencia_pago?: string | null;
    estado: EstadoOrden;
    imei_serie?: string | null;
    tracking_proveedor?: string | null;
    notas?: string | null;
    creado_por?: string | null;
    sucursal_id?: string | null;
    created_at: string;
    updated_at: string;
}

const LOCAL_STORAGE_KEY = 'youbox_ventas_iphone_cache';

// Helper local storage
function getLocalOrders(): OrdenIphone[] {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveLocalOrders(orders: OrdenIphone[]) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
        console.error('Error guardando en localStorage:', e);
    }
}

// Genera el siguiente número correlativo ORD-IPH-0001
export function generateNextOrderNumber(existingOrders: OrdenIphone[]): string {
    let maxNum = 0;
    const regex = /ORD-IPH-(\d+)/i;

    existingOrders.forEach(o => {
        const match = o.numero_orden?.match(regex);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const nextNum = maxNum + 1;
    return `ORD-IPH-${String(nextNum).padStart(4, '0')}`;
}

export const iphoneSalesService = {
    async getOrders(): Promise<{ orders: OrdenIphone[]; isLocal: boolean }> {
        try {
            const { data, error } = await supabase
                .from('ventas_iphone')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Table might not exist yet in Supabase
                console.warn('Usando almacenamiento local para ventas de iPhone:', error.message);
                return { orders: getLocalOrders(), isLocal: true };
            }

            const orders: OrdenIphone[] = (data || []).map((item: any) => ({
                ...item,
                precio_total: Number(item.precio_total) || 0,
                anticipo_pagado: Number(item.anticipo_pagado) || 0,
                saldo_pendiente: Number(item.saldo_pendiente) || 0
            }));

            // Sync with local cache
            saveLocalOrders(orders);
            return { orders, isLocal: false };
        } catch (e) {
            console.error('Excepción al obtener ventas de iPhone:', e);
            return { orders: getLocalOrders(), isLocal: true };
        }
    },

    async createOrder(data: Omit<OrdenIphone, 'id' | 'numero_orden' | 'saldo_pendiente' | 'created_at' | 'updated_at'>): Promise<OrdenIphone> {
        const currentOrders = (await this.getOrders()).orders;
        const nextOrderNumber = generateNextOrderNumber(currentOrders);

        // Pre-orden: 100% anticipo. Orden: al menos 50%.
        const precioTotal = Number(data.precio_total) || 0;
        const anticipo = Number(data.anticipo_pagado) || 0;
        const saldoPendiente = Math.max(0, precioTotal - anticipo);

        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'iph-' + Date.now();
        const now = new Date().toISOString();

        const orderPayload: OrdenIphone = {
            ...data,
            id: newId,
            numero_orden: nextOrderNumber,
            precio_total: precioTotal,
            anticipo_pagado: anticipo,
            saldo_pendiente: saldoPendiente,
            created_at: now,
            updated_at: now
        };

        try {
            const { data: inserted, error } = await supabase
                .from('ventas_iphone')
                .insert([
                    {
                        numero_orden: orderPayload.numero_orden,
                        tipo_orden: orderPayload.tipo_orden,
                        cliente_id: orderPayload.cliente_id || null,
                        cliente_nombre: orderPayload.cliente_nombre,
                        cliente_telefono: orderPayload.cliente_telefono || null,
                        cliente_email: orderPayload.cliente_email || null,
                        locker_id: orderPayload.locker_id || null,
                        modelo: orderPayload.modelo,
                        capacidad: orderPayload.capacidad,
                        color: orderPayload.color || null,
                        estado_equipo: orderPayload.estado_equipo,
                        precio_total: orderPayload.precio_total,
                        anticipo_pagado: orderPayload.anticipo_pagado,
                        saldo_pendiente: orderPayload.saldo_pendiente,
                        metodo_pago: orderPayload.metodo_pago || null,
                        referencia_pago: orderPayload.referencia_pago || null,
                        estado: orderPayload.estado,
                        imei_serie: orderPayload.imei_serie || null,
                        tracking_proveedor: orderPayload.tracking_proveedor || null,
                        notas: orderPayload.notas || null,
                        creado_por: orderPayload.creado_por === 'admin-001' ? null : orderPayload.creado_por || null,
                        sucursal_id: orderPayload.sucursal_id || null
                    }
                ])
                .select()
                .single();

            if (error) {
                console.warn('Error insertando en Supabase, guardando localmente:', error.message);
                const local = [orderPayload, ...getLocalOrders()];
                saveLocalOrders(local);
                return orderPayload;
            }

            const result: OrdenIphone = {
                ...inserted,
                precio_total: Number(inserted.precio_total),
                anticipo_pagado: Number(inserted.anticipo_pagado),
                saldo_pendiente: Number(inserted.saldo_pendiente)
            };

            const local = [result, ...getLocalOrders().filter(o => o.id !== result.id)];
            saveLocalOrders(local);
            return result;
        } catch (err) {
            console.warn('Error conectando a Supabase, guardando local:', err);
            const local = [orderPayload, ...getLocalOrders()];
            saveLocalOrders(local);
            return orderPayload;
        }
    },

    async updateOrderStatus(id: string, nuevoEstado: EstadoOrden, extraData?: Partial<OrdenIphone>): Promise<void> {
        const now = new Date().toISOString();
        try {
            const updatePayload: any = {
                estado: nuevoEstado,
                updated_at: now,
                ...(extraData || {})
            };

            // Remove non-db fields if any
            delete updatePayload.id;

            const { error } = await supabase
                .from('ventas_iphone')
                .update(updatePayload)
                .eq('id', id);

            if (error) {
                console.warn('Error actualizando en Supabase, actualizando local:', error.message);
            }
        } catch (e) {
            console.warn('Error en conexión Supabase, actualizando local:', e);
        }

        // Always update local cache
        const local = getLocalOrders().map(o => {
            if (o.id === id) {
                return {
                    ...o,
                    estado: nuevoEstado,
                    ...(extraData || {}),
                    updated_at: now
                };
            }
            return o;
        });
        saveLocalOrders(local);
    },

    async deleteOrder(id: string): Promise<void> {
        try {
            await supabase.from('ventas_iphone').delete().eq('id', id);
        } catch (e) {
            console.warn('Error eliminando de Supabase:', e);
        }

        const local = getLocalOrders().filter(o => o.id !== id);
        saveLocalOrders(local);
    }
};
