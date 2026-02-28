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

export function Users() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // New user form state
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        rol_id: '',
        sucursal_id: '',
        password: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchSucursales();
    }, []);

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

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        try {
            setSaving(true);
            const { data, error } = await supabase.from('usuarios').insert([{
                nombre: formData.nombre,
                apellido: formData.apellido,
                email: formData.email.toLowerCase(),
                telefono: formData.telefono,
                rol_id: formData.rol_id,
                sucursal_id: formData.sucursal_id,
                password_hash: formData.password,
                activo: true
            }]);

            if (error) throw error;

            setShowModal(false);
            setFormData({ nombre: '', apellido: '', email: '', telefono: '', rol_id: roles[0]?.id || '', sucursal_id: sucursales[0]?.id || '', password: '' });
            fetchUsers();
        } catch (error: any) {
            console.error('Error creating user:', error);
            alert(error.message || 'Error al crear usuario. Verifica que el correo no esté duplicado.');
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Equipo de Trabajo (Staff)</h1>
                    <p className="text-sm text-slate-500">Gestión de jerarquía de usuarios y permisos administrativos.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
                >
                    <Plus className="h-4 w-4" />
                    Añadir Miembro
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Usuario</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Contacto</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Rol & Sucursal</th>
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
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {u.email}</div>
                                            {u.telefono && <div className="flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5" /> {u.telefono}</div>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 space-y-2">
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
                                            <button onClick={() => resetPassword(u.id)} className="text-slate-400 hover:text-blue-600 mr-4" title="Cambiar Contraseña">
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
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Crear Miembro del Equipo</h2>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
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

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Ingreso</label>
                                <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" placeholder="Contraseña temporal" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                    <input type="text" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol / Jerarquía</label>
                                    <select required value={formData.rol_id} onChange={e => setFormData({ ...formData, rol_id: e.target.value })} className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border capitalize">
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

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
                                    Guardar Perfil
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
