import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Plus, ShieldAlert, Building2 } from 'lucide-react';

interface Sucursal {
    id: string;
    nombre: string;
    prefijo_casillero: string;
    activa: boolean;
    created_at: string;
}

export function Branches() {
    const [branches, setBranches] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        nombre: '',
        prefijo_casillero: ''
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('sucursales').select('*').order('created_at', { ascending: true });
        if (!error) setBranches(data || []);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('sucursales').insert([{
                nombre: form.nombre,
                prefijo_casillero: form.prefijo_casillero.toUpperCase(),
                activa: true
            }]);
            if (error) throw error;

            setForm({ nombre: '', prefijo_casillero: '' });
            setShowModal(false);
            fetchBranches();
        } catch (error: any) {
            alert(error.message || 'Error al crear la sucursal.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase.from('sucursales').update({ activa: !currentStatus }).eq('id', id);
        if (!error) fetchBranches();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agencias y Sucursales</h1>
                    <p className="text-sm text-slate-500">Administra las ubicaciones físicas y sus prefijos de casillero.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
                >
                    <Plus className="h-4 w-4" />
                    Añadir Sucursal
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500 text-sm">Cargando sucursales...</div>
                ) : (
                    branches.map((b) => (
                        <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{b.nombre}</h3>
                            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 tracking-widest mt-2 mb-6">
                                PREFIJO: {b.prefijo_casillero}-
                            </div>

                            <button
                                onClick={() => toggleStatus(b.id, b.activa)}
                                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${b.activa ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {b.activa ? 'Activa y Operando' : 'Sucursal Inactiva'}
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Nueva Sucursal</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Sede</label>
                                <input
                                    required type="text" placeholder="Ej. Agencia Tapachula"
                                    value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prefijo de Casillero</label>
                                <input
                                    required type="text" placeholder="Ej. YBT" maxLength={4}
                                    value={form.prefijo_casillero} onChange={e => setForm({ ...form, prefijo_casillero: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase() })}
                                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border font-mono uppercase"
                                />
                                <p className="text-xs text-slate-500 mt-1">Sugerido: 3 a 4 letras. Ej: YBQ (Quiché).</p>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md ring-1 ring-inset ring-slate-300">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving || !form.nombre || !form.prefijo_casillero} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                                    {saving ? 'Guardando...' : 'Guardar Sede'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
