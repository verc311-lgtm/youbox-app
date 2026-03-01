import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users as UsersIcon, Plus, Shield, ShieldCheck, Mail, Phone, Trash2, KeyRound, Search, X, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../context/AuthContext';

interface Rol {
    id: string;
    nombre: string;
}

interface Sucursal {
    id: string;
    nombre: string;
}

interface StaffUser {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    activo: boolean;
    rol_id: string;
    roles?: { nombre: string };
    sucursal_id?: string;
    sucursales?: { nombre: string };
    password_hash?: string;
    created_at: string;
}

interface Cliente {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    locker_id: string;
    sucursal_id: string;
    sucursales?: { nombre: string };
    departamento: string;
    municipio: string;
    activo: boolean;
    created_at: string;
}

export function Users() {
    const [searchParams] = useSearchParams();
    const initialSearch = searchParams.get('search') || '';

    // Automatically switch to 'clients' tab if there's a search term, since global search mostly targets clients
    const [activeTab, setActiveTab] = useState<'staff' | 'clients'>(initialSearch ? 'clients' : 'staff');
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [editingId, setEditingId] = useState<string | null>(null);

    // New user form state
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        rol_id: '',
        sucursal_id: '',
        password: '',
        locker_id: '', // for clients
        departamento: '', // for clients
        municipio: '' // for clients
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Filter State
    const [filterRol, setFilterRol] = useState<string>('all');
    const [filterSucursal, setFilterSucursal] = useState<string>('all');
    const [filterEstado, setFilterEstado] = useState<string>('all');

    // Clients Sort State
    const [sortField, setSortField] = useState<'nombre' | 'locker_id' | 'created_at' | 'sucursal'>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [showFiltersPanel, setShowFiltersPanel] = useState(false);

    useEffect(() => {
        if (activeTab === 'staff') {
            fetchUsers();
        } else {
            fetchClientes();
        }
        fetchRoles();
        fetchSucursales();
    }, [activeTab]);

    async function fetchSucursales() {
        try {
            const { data, error } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
            if (error) throw error;
            setSucursales(data || []);
            if (data && data.length > 0) {
                setFormData(f => ({ ...f, sucursal_id: data[0].id }));
            }
        } catch (e) {
            console.error('Error fetching sucursales:', e);
        }
    }

    async function fetchRoles() {
        try {
            const { data, error } = await supabase.from('roles').select('id, nombre');
            if (error) throw error;
            setRoles(data || []);
            if (data && data.length > 0 && !formData.rol_id) {
                setFormData(f => ({ ...f, rol_id: data[0].id }));
            }
        } catch (e) {
            console.error('Error fetching roles:', e);
        }
    }

    async function fetchUsers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('usuarios')
                .select(`*, roles ( nombre ), sucursales ( nombre )`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (e) {
            console.error('Error fetching users:', e);
        } finally {
            setLoading(false);
        }
    }

    async function fetchClientes() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clientes')
                .select(`*, sucursales ( nombre )`)
                .order('created_at', { ascending: false })
                .limit(100000);

            if (error) throw error;
            setClientes(data || []);
        } catch (e) {
            console.error('Error fetching clients:', e);
        } finally {
            setLoading(false);
        }
    }

    const handleEditClick = (entity: any, type: 'staff' | 'clients') => {
        setEditingId(entity.id);
        setActiveTab(type);

        if (type === 'staff') {
            setFormData({
                nombre: entity.nombre || '',
                apellido: entity.apellido || '',
                email: entity.email || '',
                telefono: entity.telefono || '',
                rol_id: entity.rol_id || roles[0]?.id || '',
                sucursal_id: entity.sucursal_id || sucursales[0]?.id || '',
                password: '', // Leave password empty on edit
                locker_id: '',
                departamento: '',
                municipio: ''
            });
        } else {
            setFormData({
                nombre: entity.nombre || '',
                apellido: entity.apellido || '',
                email: entity.email || '',
                telefono: entity.telefono || '',
                rol_id: roles[0]?.id || '',
                sucursal_id: entity.sucursal_id || sucursales[0]?.id || '',
                password: '',
                locker_id: entity.locker_id || '',
                departamento: entity.departamento || '',
                municipio: entity.municipio || ''
            });
        }
        setShowModal(true);
    };

    const handleNewClick = () => {
        setEditingId(null);
        setFormData({
            nombre: '', apellido: '', email: '', telefono: '',
            rol_id: roles[0]?.id || '', sucursal_id: sucursales[0]?.id || '',
            password: '', locker_id: '', departamento: '', municipio: ''
        });
        setShowModal(true);
    };

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        try {
            setSaving(true);
            if (activeTab === 'staff') {
                const userData = {
                    nombre: formData.nombre,
                    apellido: formData.apellido,
                    email: formData.email.toLowerCase(),
                    telefono: formData.telefono,
                    rol_id: formData.rol_id,
                    sucursal_id: formData.sucursal_id,
                    ...(formData.password ? { password_hash: formData.password } : {})
                };

                if (editingId) {
                    const { error } = await supabase.from('usuarios').update(userData).eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('usuarios').insert([{ ...userData, activo: true }]);
                    if (error) throw error;
                }
                fetchUsers();
            } else {
                const clientData = {
                    nombre: formData.nombre,
                    apellido: formData.apellido,
                    email: formData.email?.toLowerCase() || null,
                    telefono: formData.telefono,
                    locker_id: formData.locker_id,
                    sucursal_id: formData.sucursal_id,
                    departamento: formData.departamento,
                    municipio: formData.municipio,
                    ...(formData.password ? { notas: formData.password } : {})
                };

                if (editingId) {
                    const { error } = await supabase.from('clientes').update(clientData).eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('clientes').insert([{ ...clientData, activo: true }]);
                    if (error) throw error;
                }
                fetchClientes();
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({
                nombre: '', apellido: '', email: '', telefono: '',
                rol_id: roles[0]?.id || '', sucursal_id: sucursales[0]?.id || '',
                password: '', locker_id: '', departamento: '', municipio: ''
            });
        } catch (error: any) {
            console.error('Error saving:', error);
            alert(error.message || 'Error al guardar. Verifica los datos ingresados.');
        } finally {
            setSaving(false);
        }
    }

    async function resetPassword(id: string, tipo: 'staff' | 'clients' = 'staff') {
        const newPass = prompt("Ingresa la nueva contraseña temporal para este usuario:");
        if (!newPass) return;

        try {
            if (tipo === 'staff') {
                const { error } = await supabase.from('usuarios').update({ password_hash: newPass }).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('clientes').update({ notas: newPass }).eq('id', id);
                if (error) throw error;
            }
            alert("Contraseña actualizada exitosamente.");
        } catch (error: any) {
            console.error("Error reseteando password:", error);
            alert("Error al actualizar la contraseña: " + (error.message || 'Error desconocido'));
        }
    }

    async function toggleStatus(id: string, currentStatus: boolean) {
        try {
            const { error } = await supabase.from('usuarios').update({ activo: !currentStatus }).eq('id', id);
            if (error) throw error;
            fetchUsers();
        } catch (error) {
            alert("Error al cambiar estado.");
        }
    }

    async function toggleClientStatus(id: string, currentStatus: boolean) {
        try {
            const { error } = await supabase.from('clientes').update({ activo: !currentStatus }).eq('id', id);
            if (error) throw error;
            fetchClientes();
        } catch (error) {
            alert("Error al cambiar estado del cliente.");
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.nombre + ' ' + (u.apellido || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRol = filterRol === 'all' || u.rol_id === filterRol;
        const matchesSucursal = filterSucursal === 'all' || u.sucursal_id === filterSucursal;
        const matchesEstado = filterEstado === 'all' || (filterEstado === 'active' ? u.activo : !u.activo);
        return matchesSearch && matchesRol && matchesSucursal && matchesEstado;
    });

    const filteredClientes = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        let list = clientes.filter(c => {
            const fullName = (c.nombre + ' ' + (c.apellido || '')).toLowerCase();
            const matchesSearch = !q ||
                fullName.includes(q) ||
                c.locker_id?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.telefono?.toLowerCase().includes(q) ||
                c.departamento?.toLowerCase().includes(q) ||
                c.municipio?.toLowerCase().includes(q);
            const matchesSucursal = filterSucursal === 'all' || c.sucursal_id === filterSucursal;
            const matchesEstado = filterEstado === 'all' || (filterEstado === 'active' ? c.activo : !c.activo);
            return matchesSearch && matchesSucursal && matchesEstado;
        });

        // Sorting
        list = [...list].sort((a, b) => {
            let va: string;
            let vb: string;
            if (sortField === 'nombre') {
                va = (a.nombre + ' ' + (a.apellido || '')).toLowerCase();
                vb = (b.nombre + ' ' + (b.apellido || '')).toLowerCase();
            } else if (sortField === 'locker_id') {
                va = a.locker_id?.toLowerCase() || '';
                vb = b.locker_id?.toLowerCase() || '';
            } else if (sortField === 'sucursal') {
                va = a.sucursales?.nombre?.toLowerCase() || '';
                vb = b.sucursales?.nombre?.toLowerCase() || '';
            } else {
                // created_at
                va = a.created_at || '';
                vb = b.created_at || '';
            }
            return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        });

        return list;
    }, [clientes, searchTerm, filterSucursal, filterEstado, sortField, sortDir]);

    const activeFilterCount = [filterSucursal !== 'all', filterEstado !== 'all'].filter(Boolean).length;

    // Stats
    const clientTotalCount = clientes.length;
    const clientActiveCount = clientes.filter(c => c.activo).length;
    const clientInactiveCount = clientTotalCount - clientActiveCount;

    function handleSortChange(field: typeof sortField) {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    }

    function clearAllFilters() {
        setSearchTerm('');
        setFilterSucursal('all');
        setFilterEstado('all');
        setSortField('created_at');
        setSortDir('desc');
        setCurrentPage(1);
    }

    // Pagination logic
    const currentList = activeTab === 'staff' ? filteredUsers : filteredClientes;
    const effectiveItemsPerPage = itemsPerPage === 0 ? currentList.length || 1 : itemsPerPage;
    const totalPages = Math.ceil(currentList.length / effectiveItemsPerPage);
    const startIndex = (currentPage - 1) * effectiveItemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + effectiveItemsPerPage);
    const paginatedClientes = itemsPerPage === 0 ? filteredClientes : filteredClientes.slice(startIndex, startIndex + effectiveItemsPerPage);

    // Smart page number generation (show first, last, current ± 1)
    function getPageNumbers(total: number, current: number): (number | '...')[] {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages: (number | '...')[] = [];
        const add = new Set<number>();
        [1, 2, current - 1, current, current + 1, total - 1, total].forEach(p => {
            if (p >= 1 && p <= total) add.add(p);
        });
        const sorted = Array.from(add).sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push('...');
            pages.push(sorted[i]);
        }
        return pages;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Administra tanto a tu equipo de trabajo como a tu base de clientes.
                    </p>
                </div>
                <button
                    onClick={handleNewClick}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-fit"
                >
                    <Plus className="h-4 w-4" />
                    {activeTab === 'staff' ? 'Añadir Miembro' : 'Nuevo Cliente'}
                </button>
            </div>

            {/* Tabs & Search & Filters */}
            <div className="flex flex-col gap-3 glass p-4 rounded-2xl w-full">
                {/* Top Row: Tabs + Search + Filter Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                    <div className="flex p-1.5 bg-slate-100/50 backdrop-blur-sm border border-slate-200/50 rounded-xl w-full sm:w-auto">
                        <button
                            onClick={() => { setActiveTab('staff'); setCurrentPage(1); }}
                            className={`flex-1 sm:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}
                        >
                            Equipo de Trabajo
                        </button>
                        <button
                            onClick={() => { setActiveTab('clients'); setCurrentPage(1); }}
                            className={`flex-1 sm:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}
                        >
                            Clientes
                            {clientes.length > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-blue-100 text-blue-600">
                                    {clientes.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-80 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={activeTab === 'staff' ? "Buscar miembro (nombre, email)..." : "Buscar cliente (nombre, casillero, email, tel, depto)..."}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {activeTab === 'clients' && (
                            <button
                                onClick={() => setShowFiltersPanel(p => !p)}
                                className={`relative flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${showFiltersPanel || activeFilterCount > 0 ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="hidden sm:inline">Filtrar</span>
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Staff-only filter dropdowns */}
                {activeTab === 'staff' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/50">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Rol</label>
                            <select value={filterRol} onChange={(e) => { setFilterRol(e.target.value); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="all">Todos los roles</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Sucursal</label>
                            <select value={filterSucursal} onChange={(e) => { setFilterSucursal(e.target.value); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="all">Todas</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Estado</label>
                            <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="all">Todos</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Client Advanced Filter Panel (collapsible) */}
                {activeTab === 'clients' && showFiltersPanel && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200/50 animate-fade-in">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Sucursal</label>
                            <select value={filterSucursal} onChange={(e) => { setFilterSucursal(e.target.value); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="all">Todas las sucursales</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Estado</label>
                            <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="all">Todos los estados</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos / Suspendidos</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Ordenar por</label>
                            <select value={sortField} onChange={(e) => { setSortField(e.target.value as any); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="created_at">Fecha de registro</option>
                                <option value="nombre">Nombre A-Z</option>
                                <option value="locker_id">Casillero</option>
                                <option value="sucursal">Sucursal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Dirección</label>
                            <select value={sortDir} onChange={(e) => { setSortDir(e.target.value as any); setCurrentPage(1); }} className="w-full text-sm rounded-xl border-slate-200/80 bg-slate-50/50 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 h-10 px-3">
                                <option value="desc">Descendente (más nuevo)</option>
                                <option value="asc">Ascendente (más antiguo)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Active Filter Chips (clients only) */}
                {activeTab === 'clients' && (searchTerm || activeFilterCount > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="text-xs font-medium text-slate-500">Filtros activos:</span>
                        {searchTerm && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1">
                                Búsqueda: "{searchTerm}"
                                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="ml-0.5 hover:text-blue-900"><X className="h-3 w-3" /></button>
                            </span>
                        )}
                        {filterSucursal !== 'all' && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2.5 py-1">
                                Sucursal: {sucursales.find(s => s.id === filterSucursal)?.nombre || filterSucursal}
                                <button onClick={() => { setFilterSucursal('all'); setCurrentPage(1); }} className="ml-0.5 hover:text-emerald-900"><X className="h-3 w-3" /></button>
                            </span>
                        )}
                        {filterEstado !== 'all' && (
                            <span className={`inline-flex items-center gap-1 rounded-lg text-xs font-semibold px-2.5 py-1 border ${filterEstado === 'active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
                                {filterEstado === 'active' ? 'Solo Activos' : 'Solo Inactivos'}
                                <button onClick={() => { setFilterEstado('all'); setCurrentPage(1); }} className="ml-0.5 hover:opacity-70"><X className="h-3 w-3" /></button>
                            </span>
                        )}
                        <button onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-rose-500 underline transition-colors ml-1">
                            Limpiar todo
                        </button>
                        <span className="ml-auto text-xs text-slate-500 font-medium">
                            {filteredClientes.length} de {clientTotalCount} clientes
                        </span>
                    </div>
                )}
            </div>

            {/* Client Stats Bar */}
            {activeTab === 'clients' && !loading && clientes.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-200/60">
                        <div className="text-2xl font-extrabold text-slate-800">{clientTotalCount.toLocaleString()}</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">Clientes Totales</div>
                    </div>
                    <div className="glass rounded-xl p-3 flex flex-col items-center justify-center text-center border border-green-200/60 bg-green-50/30">
                        <div className="text-2xl font-extrabold text-green-700">{clientActiveCount.toLocaleString()}</div>
                        <div className="text-xs font-medium text-green-600 mt-0.5">Activos</div>
                    </div>
                    <div className="glass rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-200/60 bg-slate-50/30">
                        <div className="text-2xl font-extrabold text-slate-500">{clientInactiveCount.toLocaleString()}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">Inactivos</div>
                    </div>
                </div>
            )}

            <div className="rounded-2xl glass overflow-hidden flex flex-col min-w-0 shadow-sm">
                <div className="overflow-x-auto">
                    {activeTab === 'staff' ? (
                        <div>
                            <table className="min-w-full divide-y divide-slate-200/60">
                                <thead className="bg-slate-50/50 backdrop-blur-sm">
                                    <tr>
                                        <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 sm:pl-6">Usuario</th>
                                        <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Contacto</th>
                                        <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Rol & Sucursal</th>
                                        <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                                        <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/40">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-2"></div>
                                                    <p className="text-sm font-medium text-slate-500">Cargando equipo de trabajo...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                                        <UsersIcon className="h-8 w-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-base font-semibold text-slate-700">No hay miembros configurados en el equipo o que coincidan con los filtros.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedUsers.map((u, index) => (
                                            <tr key={u.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${index * 50}ms` }}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm group-hover:scale-105 transition-transform">
                                                            {u.nombre[0]}{u.apellido ? u.apellido[0] : ''}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 tracking-tight">{u.nombre} {u.apellido}</div>
                                                            {u.email === 'admin@youbox.gt' && <div className="text-[10px] mt-0.5 text-white bg-blue-600 rounded px-1.5 py-0.5 w-fit font-bold tracking-wider">MASTER O SUPERADMIN</div>}
                                                            <div className="sm:hidden flex flex-col gap-1 mt-1.5 text-xs text-slate-500">
                                                                <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> {u.email}</span>
                                                                <span className="capitalize font-medium flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-slate-400" /> {u.roles?.nombre || 'Sin Rol'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 hidden md:table-cell">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 font-medium"><Mail className="w-4 h-4 text-slate-400" /> {u.email}</div>
                                                        {u.telefono && <div className="flex items-center gap-2 font-medium"><Phone className="w-4 h-4 text-slate-400" /> {u.telefono}</div>}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 space-y-2 hidden sm:table-cell">
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 capitalize shadow-sm">
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            {u.roles?.nombre || 'Sin Rol'}
                                                        </span>
                                                    </div>
                                                    {u.sucursales?.nombre && (
                                                        <div>
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shadow-sm">
                                                                {u.sucursales.nombre}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                                                    <button
                                                        onClick={() => toggleStatus(u.id, u.activo)}
                                                        className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset shadow-sm transition-all duration-200 ${u.activo ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-600 hover:text-white' : 'bg-slate-100 text-slate-700 ring-slate-600/20 hover:bg-slate-700 hover:text-white'}`}
                                                    >
                                                        {u.activo ? 'Activo' : 'Suspendido'}
                                                    </button>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(u, 'staff')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Miembro">
                                                            Editar
                                                        </button>
                                                        <button onClick={() => resetPassword(u.id, 'staff')} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Cambiar Contraseña">
                                                            <KeyRound className="w-4 h-4" />
                                                        </button>
                                                        {u.email !== 'admin@youbox.gt' && (
                                                            <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar Permanente">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {/* Pagination Controls for Staff */}
                            {filteredUsers.length > itemsPerPage && (
                                <div className="flex items-center justify-between border-t border-slate-200/60 bg-white/50 px-4 py-3 sm:px-6 mt-auto">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-slate-700">
                                                Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> de <span className="font-medium">{filteredUsers.length}</span> resultados
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Anterior</span>
                                                    &larr;
                                                </button>
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${currentPage === page ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'}`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Siguiente</span>
                                                    &rarr;
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <table className="min-w-full divide-y divide-slate-200/60">
                                <thead className="bg-slate-50/50 backdrop-blur-sm">
                                    <tr>
                                        <th scope="col" className="py-4 pl-4 pr-3 text-left sm:pl-6">
                                            <button onClick={() => handleSortChange('nombre')} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors group">
                                                Cliente
                                                <ArrowUpDown className={`h-3 w-3 transition-colors ${sortField === 'nombre' ? 'text-blue-500' : 'text-slate-300 group-hover:text-blue-300'}`} />
                                            </button>
                                        </th>
                                        <th scope="col" className="px-3 py-4 text-left">
                                            <button onClick={() => handleSortChange('locker_id')} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors group">
                                                Casillero
                                                <ArrowUpDown className={`h-3 w-3 transition-colors ${sortField === 'locker_id' ? 'text-blue-500' : 'text-slate-300 group-hover:text-blue-300'}`} />
                                            </button>
                                        </th>
                                        <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Contacto</th>
                                        <th scope="col" className="px-3 py-4 text-left hidden sm:table-cell">
                                            <button onClick={() => handleSortChange('sucursal')} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors group">
                                                Sucursal
                                                <ArrowUpDown className={`h-3 w-3 transition-colors ${sortField === 'sucursal' ? 'text-blue-500' : 'text-slate-300 group-hover:text-blue-300'}`} />
                                            </button>
                                        </th>
                                        <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                                        <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6"><span className="sr-only">Acciones</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/40">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-slate-500 text-sm">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-2"></div>
                                                    <p className="text-sm font-medium text-slate-500">Cargando base de clientes...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedClientes.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                                        <UsersIcon className="h-8 w-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-base font-semibold text-slate-700">No se encontraron clientes.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedClientes.map((c, index) => (
                                            <tr key={c.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${index * 50}ms` }}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-700 font-bold shadow-sm hidden sm:flex group-hover:scale-105 transition-transform">
                                                            {c.nombre[0]}{c.apellido ? c.apellido[0] : ''}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 tracking-tight">{c.nombre} {c.apellido}</div>
                                                            <div className="sm:hidden mt-0.5">
                                                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 border border-blue-100">{c.locker_id}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4">
                                                    <span className="text-sm font-mono font-bold bg-slate-100/80 text-blue-700 px-2.5 py-1 rounded-md tracking-wider shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
                                                        {c.locker_id}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 hidden md:table-cell">
                                                    <div className="flex flex-col gap-1.5 font-medium">
                                                        {c.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {c.email}</div>}
                                                        {c.telefono && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {c.telefono}</div>}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 hidden sm:table-cell">
                                                    {c.sucursales?.nombre && (
                                                        <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shadow-sm">
                                                            {c.sucursales.nombre}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                                                    <button
                                                        onClick={() => toggleClientStatus(c.id, c.activo)}
                                                        className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset shadow-sm transition-all duration-200 ${c.activo ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-600 hover:text-white' : 'bg-slate-100 text-slate-700 ring-slate-600/20 hover:bg-slate-700 hover:text-white'}`}
                                                    >
                                                        {c.activo ? 'Activo' : 'Inactivo'}
                                                    </button>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(c, 'clients')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Cliente">
                                                            Editar
                                                        </button>
                                                        <button onClick={() => resetPassword(c.id, 'clients')} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Cambiar Contraseña">
                                                            <KeyRound className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {/* Smart Pagination Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/60 bg-slate-50/70 px-4 py-3 gap-3 sm:px-6">
                                <div className="flex items-center gap-3">
                                    <p className="text-sm text-slate-600">
                                        {itemsPerPage === 0
                                            ? <><span className="font-semibold text-blue-600">{filteredClientes.length}</span> resultados</>
                                            : <>Mostrando <span className="font-semibold">{filteredClientes.length === 0 ? 0 : startIndex + 1}</span>–<span className="font-semibold">{Math.min(startIndex + effectiveItemsPerPage, filteredClientes.length)}</span> de <span className="font-semibold text-blue-600">{filteredClientes.length}</span></>
                                        }
                                    </p>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="text-xs rounded-lg border border-slate-200 bg-white text-slate-600 font-medium h-7 px-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                                    >
                                        <option value={25}>25 / pág</option>
                                        <option value={50}>50 / pág</option>
                                        <option value={100}>100 / pág</option>
                                        <option value={0}>Todos</option>
                                    </select>
                                </div>

                                {itemsPerPage !== 0 && totalPages > 1 && (
                                    <nav className="flex items-center gap-1" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                                            title="Primera página"
                                        >«</button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-2 flex items-center gap-1 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" /> Ant
                                        </button>

                                        {getPageNumbers(totalPages, currentPage).map((page, i) =>
                                            page === '...' ? (
                                                <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-slate-400 text-xs">…</span>
                                            ) : (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        )}

                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 px-2 flex items-center gap-1 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
                                        >
                                            Sig <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                                            title="Última página"
                                        >»</button>
                                    </nav>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up ring-1 ring-slate-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/80">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                <UsersIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                                {editingId ? (
                                    activeTab === 'staff' ? 'Editar Miembro' : 'Editar Cliente'
                                ) : (
                                    activeTab === 'staff' ? 'Nuevo Miembro' : 'Nuevo Cliente'
                                )}
                            </h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre</label>
                                    <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Apellido</label>
                                    <input type="text" value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo</label>
                                    <input required={activeTab === 'staff'} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono</label>
                                    <input type="text" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                </div>
                            </div>

                            {activeTab === 'staff' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                            {editingId ? 'Nueva Contraseña (opcional)' : 'Contraseña (Obligatoria)'}
                                        </label>
                                        <input required={!editingId} type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" placeholder={editingId ? "Dejar en blanco para mantener la actual" : "Contraseña temporal"} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Rol / Jerarquía</label>
                                        <select required value={formData.rol_id} onChange={e => setFormData({ ...formData, rol_id: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all capitalize">
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id}>{r.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Casillero ID</label>
                                            <input required type="text" placeholder="Ej: YBG123" value={formData.locker_id} onChange={e => setFormData({ ...formData, locker_id: e.target.value.toUpperCase() })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all font-mono uppercase" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Nueva Contraseña (opcional)</label>
                                            <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" placeholder="Dejar en blanco si no cambia" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Departamento</label>
                                            <input type="text" value={formData.departamento} onChange={e => setFormData({ ...formData, departamento: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Municipio</label>
                                            <input type="text" value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Asignación de Sucursal</label>
                                <select required value={formData.sucursal_id} onChange={e => setFormData({ ...formData, sucursal_id: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all">
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-6 flex gap-3 justify-end border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all">
                                    {saving && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    {editingId ? 'Guardar Cambios' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
