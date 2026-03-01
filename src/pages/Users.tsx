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
                .limit(5000);

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

    async function resetPassword(id: string) {
        const newPass = prompt("Ingresa la nueva contraseña temporal para este usuario:");
        if (!newPass) return;

        try {
            const { error } = await supabase.from('usuarios').update({ password_hash: newPass }).eq('id', id);
            if (error) throw error;
            alert("Contraseña actualizada exitosamente.");
        } catch (error) {
            alert("Error al actualizar la contraseña.");
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
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Usuarios</h1>
                    <p className="text-sm text-slate-500">Administra tanto a tu equipo de trabajo como a tu base de clientes.</p>
                </div>
                <button
                    onClick={handleNewClick}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 w-fit"
                >
                    <Plus className="h-4 w-4" />
                    {activeTab === 'staff' ? 'Añadir Miembro' : 'Nuevo Cliente'}
                </button>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Equipo de Trabajo
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Clientes
                    </button>
                </div>

                {activeTab === 'clients' && (
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UsersIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {activeTab === 'staff' ? (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Usuario</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hidden md:table-cell">Contacto</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hidden sm:table-cell">Rol & Sucursal</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estado</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-500 text-sm">Cargando equipo...</td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-500 text-sm">No hay miembros configurados en el equipo.</td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                        {u.nombre[0]}{u.apellido ? u.apellido[0] : ''}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{u.nombre} {u.apellido}</div>
                                                        {u.email === 'admin@youbox.gt' && <div className="text-xs text-blue-600 font-medium tracking-wide">MASTER O SUPERADMIN</div>}
                                                        <div className="sm:hidden text-xs text-slate-500 mt-1">
                                                            {u.email} <br />
                                                            <span className="capitalize">{u.roles?.nombre || 'Sin Rol'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {u.email}</div>
                                                {u.telefono && <div className="flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5" /> {u.telefono}</div>}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 space-y-2 hidden sm:table-cell">
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 capitalize">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        {u.roles?.nombre || 'Sin Rol'}
                                                    </span>
                                                </div>
                                                {u.sucursales?.nombre && (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                            {u.sucursales.nombre}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                                                <button
                                                    onClick={() => toggleStatus(u.id, u.activo)}
                                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${u.activo ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100' : 'bg-slate-100 text-slate-700 ring-slate-600/20 hover:bg-slate-200'}`}
                                                >
                                                    {u.activo ? 'Activo' : 'Suspendido'}
                                                </button>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button onClick={() => handleEditClick(u, 'staff')} className="text-slate-400 hover:text-blue-600 mr-4" title="Editar Miembro">
                                                    Editar
                                                </button>
                                                <button onClick={() => resetPassword(u.id)} className="text-slate-400 hover:text-amber-600 mr-4" title="Cambiar Contraseña">
                                                    <KeyRound className="w-4 h-4" />
                                                </button>
                                                {u.email !== 'admin@youbox.gt' && (
                                                    <button className="text-slate-400 hover:text-red-600" title="Eliminar Permanente">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Cliente</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Casillero</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hidden md:table-cell">Contacto</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hidden sm:table-cell">Sucursal</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estado</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">Cargando clientes...</td>
                                    </tr>
                                ) : filteredClientes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">No se encontraron clientes.</td>
                                    </tr>
                                ) : (
                                    filteredClientes.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold hidden sm:flex">
                                                        {c.nombre[0]}{c.apellido ? c.apellido[0] : ''}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{c.nombre} {c.apellido}</div>
                                                        <div className="sm:hidden text-xs text-slate-500 mt-1">
                                                            {c.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm font-mono font-medium text-blue-600">
                                                {c.locker_id}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 hidden md:table-cell">
                                                {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {c.email}</div>}
                                                {c.telefono && <div className="flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5" /> {c.telefono}</div>}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 hidden sm:table-cell">
                                                {c.sucursales?.nombre && (
                                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                        {c.sucursales.nombre}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                                                <button
                                                    onClick={() => toggleClientStatus(c.id, c.activo)}
                                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${c.activo ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100' : 'bg-slate-100 text-slate-700 ring-slate-600/20 hover:bg-slate-200'}`}
                                                >
                                                    {c.activo ? 'Activo' : 'Inactivo'}
                                                </button>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button onClick={() => handleEditClick(c, 'clients')} className="text-slate-400 hover:text-blue-600 mr-4">
                                                    Editar
                                                </button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                            <UsersIcon className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-800">
                                {editingId ? (
                                    activeTab === 'staff' ? 'Editar Miembro de Equipo' : 'Editar Cliente'
                                ) : (
                                    activeTab === 'staff' ? 'Crear Miembro del Equipo' : 'Nuevo Cliente'
                                )}
                            </h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                    <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                                    <input type="text" value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                                    <input required={activeTab === 'staff'} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                    <input type="text" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                </div>
                            </div>

                            {activeTab === 'staff' ? (
                                <>
                                    {!editingId && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Ingreso</label>
                                            <input required={!editingId} type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" placeholder="Contraseña temporal" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Rol / Jerarquía</label>
                                        <select required value={formData.rol_id} onChange={e => setFormData({ ...formData, rol_id: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border capitalize">
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
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Casillero ID</label>
                                            <input required type="text" placeholder="Ej: YBG123" value={formData.locker_id} onChange={e => setFormData({ ...formData, locker_id: e.target.value.toUpperCase() })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                                            <input type="text" value={formData.departamento} onChange={e => setFormData({ ...formData, departamento: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Municipio</label>
                                        <input type="text" value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asignación de Sucursal</label>
                                <select required value={formData.sucursal_id} onChange={e => setFormData({ ...formData, sucursal_id: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border">
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md ring-1 ring-inset ring-slate-300">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center gap-2">
                                    {saving && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    {editingId ? 'Guardar Cambios' : (activeTab === 'staff' ? 'Guardar Perfil' : 'Guardar Cliente')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
