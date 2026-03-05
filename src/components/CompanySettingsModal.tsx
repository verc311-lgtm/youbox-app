import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Save, X, Loader2 } from 'lucide-react';

interface CompanySettingsModalProps {
    onClose: () => void;
}

export function CompanySettingsModal({ onClose }: CompanySettingsModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        id: '',
        nombre_empresa: '',
        direccion: '',
        telefono: '',
        email: '',
        sitio_web: '',
        logo_url: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setFormData({
                    id: data.id,
                    nombre_empresa: data.nombre_empresa || '',
                    direccion: data.direccion || '',
                    telefono: data.telefono || '',
                    email: data.email || '',
                    sitio_web: data.sitio_web || '',
                    logo_url: data.logo_url || ''
                });
            }
        } catch (err: any) {
            console.error('Error fetching company settings:', err);
            alert('Hubo un error al cargar la configuración de la empresa.');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (formData.id) {
                // Update existing
                const { error } = await supabase
                    .from('configuracion_empresa')
                    .update({
                        nombre_empresa: formData.nombre_empresa,
                        direccion: formData.direccion,
                        telefono: formData.telefono,
                        email: formData.email,
                        sitio_web: formData.sitio_web,
                        logo_url: formData.logo_url,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', formData.id);

                if (error) throw error;
            } else {
                // Insert new (should rarely happen due to migration)
                const { error } = await supabase
                    .from('configuracion_empresa')
                    .insert([{
                        nombre_empresa: formData.nombre_empresa,
                        direccion: formData.direccion,
                        telefono: formData.telefono,
                        email: formData.email,
                        sitio_web: formData.sitio_web,
                        logo_url: formData.logo_url
                    }]);

                if (error) throw error;
            }

            onClose();
        } catch (err: any) {
            console.error('Error saving company settings:', err);
            alert('Hubo un error al guardar la configuración.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Información de la Empresa</h2>
                            <p className="text-sm text-slate-500">Datos visibles en facturas y documentos generados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {fetching ? (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">Nombre de la Empresa</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.nombre_empresa}
                                    onChange={(e) => setFormData({ ...formData, nombre_empresa: e.target.value })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                    placeholder="Ej. YOUBOX GT"
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">Dirección Completa</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm resize-none"
                                    placeholder="Ej. 13 Av. 4-60 Zona 3, Quetzaltenango"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                    placeholder="Ej. +502 5646-6611"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Correo Electrónico</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                    placeholder="Ej. info@youboxgt.com"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Sitio Web</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.sitio_web}
                                    onChange={(e) => setFormData({ ...formData, sitio_web: e.target.value })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                    placeholder="Ej. youboxgt.com"
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">URL del Logo (Link web)</label>
                                <input
                                    required
                                    type="url"
                                    value={formData.logo_url}
                                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                    placeholder="https://youboxgt.online/..."
                                />
                                {formData.logo_url && (
                                    <div className="mt-2 p-2 border border-slate-200 rounded-lg bg-white inline-block">
                                        <img src={formData.logo_url} alt="Logo Preview" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Configuración
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
