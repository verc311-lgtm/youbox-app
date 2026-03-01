import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Shield, ShieldCheck, Mail, Phone, Trash2, KeyRound } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'staff' | 'clients'>('staff');
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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
                    municipio: formData.municipio
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
                const { error } = await supabase.from('clientes').update({ password_hash: newPass, notas: newPass }).eq('id', id);
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

    const filteredClientes = clientes.filter(c =>
        (c.nombre + ' ' + (c.apellido || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.locker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass p-4 rounded-2xl w-full">
                <div className="flex p-1.5 bg-slate-100/50 backdrop-blur-sm border border-slate-200/50 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex-1 sm:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}
                    >
                        Equipo de Trabajo
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`flex-1 sm:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}
                    >
                        Clientes
                    </button>
                </div>

                {activeTab === 'clients' && (
                    <div className="relative w-full sm:w-80 group">
                        <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
                        />
                    </div>
                )}
            </div>

            <div className="rounded-2xl glass overflow-hidden flex flex-col min-w-0 shadow-sm">
                <div className="overflow-x-auto">
                    {activeTab === 'staff' ? (
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
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                                    <UsersIcon className="h-8 w-8 text-slate-400" />
                                                </div>
                                                <p className="text-base font-semibold text-slate-700">No hay miembros configurados en el equipo.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u, index) => (
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
                                                    <button onClick={() => resetPassword(u.id)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Cambiar Contraseña">
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
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200/60">
                            <thead className="bg-slate-50/50 backdrop-blur-sm">
                                <tr>
                                    <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 sm:pl-6">Cliente</th>
                                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Casillero</th>
                                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Contacto</th>
                                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Sucursal</th>
                                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                                    <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Acciones</span>
                                    </th>
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
                                ) : filteredClientes.length === 0 ? (
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
                                    filteredClientes.map((c, index) => (
                                        <tr key={c.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${index * 50}ms` }}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-700 font-bold shadow-sm hidden sm:flex group-hover:scale-105 transition-transform">
                                                        {c.nombre[0]}{c.apellido ? c.apellido[0] : ''}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 tracking-tight">{c.nombre} {c.apellido}</div>
                                                        <div className="sm:hidden text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {c.email}
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
                                    {!editingId && (
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Contraseña (Obligatoria)</label>
                                            <input required={!editingId} type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" placeholder="Contraseña temporal" />
                                        </div>
                                    )}
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
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Departamento</label>
                                            <input type="text" value={formData.departamento} onChange={e => setFormData({ ...formData, departamento: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Municipio</label>
                                        <input type="text" value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm p-2.5 border transition-all" />
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
