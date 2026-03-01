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
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in relative z-10 w-full pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Agencias y Sucursales
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Administra las ubicaciones físicas y sus prefijos de casillero.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                >
                    <Plus className="h-5 w-5" />
                    Añadir Sucursal
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-sm"></div>
                        <p className="text-sm font-bold text-slate-500">Cargando sucursales...</p>
                    </div>
                ) : (
                    branches.map((b, idx) => (
                        <div
                            key={b.id}
                            className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-slide-up relative overflow-hidden group/card"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover/card:scale-x-100 transition-transform origin-left"></div>
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 text-white flex-shrink-0 group-hover/card:scale-105 transition-transform mb-5">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">{b.nombre}</h3>
                            <div className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 shadow-sm mt-3 mb-6 font-mono tracking-widest uppercase">
                                <span className="text-blue-500">PREFIJO:</span> {b.prefijo_casillero}-
                            </div>

                            <button
                                onClick={() => toggleStatus(b.id, b.activa)}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${b.activa ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                            >
                                {b.activa ? 'Activa y Operando' : 'Sucursal Inactiva'}
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
                    <div className="glass-dark rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border border-slate-200/50">
                        <div className="px-6 py-5 border-b border-slate-200/50 flex items-center gap-4 bg-white/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm text-white flex-shrink-0">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Nueva Sucursal</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5 bg-white/80">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre de la Sede</label>
                                <input
                                    required type="text" placeholder="Ej. Agencia Tapachula"
                                    value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 sm:text-sm font-medium placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Prefijo de Casillero</label>
                                <input
                                    required type="text" placeholder="Ej. YBT" maxLength={4}
                                    value={form.prefijo_casillero} onChange={e => setForm({ ...form, prefijo_casillero: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase() })}
                                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 sm:text-sm font-bold tracking-widest font-mono uppercase placeholder:text-slate-400"
                                />
                                <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-50 border border-slate-100 p-2 rounded-lg">
                                    Sugerido: 3 a 4 letras. Ej: <span className="font-mono text-slate-700 font-bold bg-white px-1 border border-slate-200 rounded">YBQ</span> (Quiché).
                                </p>
                            </div>

                            <div className="pt-5 flex gap-3 justify-end border-t border-slate-200/60">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !form.nombre || !form.prefijo_casillero}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                                >
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
