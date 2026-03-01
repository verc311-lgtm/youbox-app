import React, { useState, useEffect } from 'react';
import { User, Lock, MapPin, Mail, Phone, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Guatemala 22 departments + their municipalities
const GUATEMALA_DATA: Record<string, string[]> = {
    "Alta Verapaz": ["Cobán", "Chahal", "Chisec", "Fray Bartolomé de las Casas", "Lanquín", "Panzós", "Raxruhá", "San Cristóbal Verapaz", "San Juan Chamelco", "San Pedro Carchá", "Santa Catalina la Tinta", "Senahú", "Tucurú"],
    "Baja Verapaz": ["Salamá", "Cubulco", "El Chol", "Granados", "Purulhá", "Rabinal", "San Jerónimo", "San Miguel Chicaj", "Santa Cruz el Chol", "San Bartolomé Jocotenango"],
    "Chimaltenango": ["Chimaltenango", "Acatenango", "El Tejar", "Parramos", "Patzicía", "Patzún", "Pochuta", "San Andrés Itzapa", "San José Poaquil", "San Martín Jilotepeque", "Santa Apolonia", "Santa Cruz Balanyá", "Tecpán", "Yepocapa", "Zaragoza"],
    "Chiquimula": ["Chiquimula", "Camotán", "Concepción Las Minas", "Esquipulas", "Ipala", "Jocotán", "Olopa", "Quezaltepeque", "San Jacinto", "San Juan Ermita", "San José la Arada"],
    "El Progreso": ["Guastatoya", "El Jícaro", "Morazán", "San Agustín Acasaguastlán", "San Antonio La Paz", "San Cristóbal Acasaguastlán", "Sanarate", "Sansare"],
    "Escuintla": ["Escuintla", "Guanagazapa", "Iztapa", "La Democracia", "La Gomera", "Masagua", "Nueva Concepción", "Palín", "San José", "San Vicente Pacaya", "Santa Lucía Cotzumalguapa", "Siquinalá", "Tiquisate"],
    "Guatemala": ["Guatemala City", "Amatitlán", "Chinautla", "Chuarrancho", "Fraijanes", "Mixco", "Palencia", "Petapa", "San José del Golfo", "San José Pinula", "San Juan Sacatepéquez", "San Miguel Petapa", "San Pedro Ayampuc", "San Pedro Sacatepéquez", "San Raymundo", "Santa Catarina Pinula", "Villa Canales", "Villa Nueva"],
    "Huehuetenango": ["Huehuetenango", "Aguacatán", "Chiantla", "Colotenango", "Concepción Huista", "Cuilco", "Ixtahuacán", "Jacaltenango", "La Democracia", "La Libertad", "Malacatancito", "Nentón", "San Antonio Huista", "San Gaspar Ixchil", "San Idelfonso Ixtahuacán", "San Juan Atitán", "San Juan Ixcoy", "San Marcos Huista", "San Mateo Ixtatán", "San Miguel Acatán", "San Pedro Necta", "San Pedro Soloma", "San Rafael La Independencia", "San Rafael Petzal", "San Sebastián Coatán", "San Sebastián Huehuetenango", "Santa Ana Huista", "Santa Bárbara", "Santa Cruz Barillas", "Santa Eulalia", "Santiago Chimaltenango", "Tectitán", "Todos Santos Cuchumatán", "Unión Cantinil"],
    "Izabal": ["Puerto Barrios", "El Estor", "Livingston", "Los Amates", "Morales"],
    "Jalapa": ["Jalapa", "Mataquescuintla", "Monjas", "San Carlos Alzatate", "San Luis Jilotepeque", "San Manuel Chaparrón", "San Pedro Pinula"],
    "Jutiapa": ["Jutiapa", "Agua Blanca", "Asunción Mita", "Atescatempa", "Conguaco", "El Adelanto", "El Progreso", "Jalpatagua", "Jerez", "Moyuta", "Pasaco", "Quesada", "San José Acatempa", "Santa Catarina Mita", "Yupiltepeque", "Zapotitlán"],
    "Petén": ["Flores", "Dolores", "El Chal", "La Libertad", "Las Cruces", "Melchor de Mencos", "Poptún", "San Andrés", "San Benito", "San Francisco", "San José", "San Luis", "Sayaxché", "Santa Ana"],
    "Quetzaltenango": ["Quetzaltenango", "Almolonga", "Cabricán", "Cajolá", "Cantel", "Coatepeque", "Colomba", "Concepción Chiquirichapa", "El Palmar", "Flores Costa Cuca", "Génova", "Huitán", "La Esperanza", "Palestina de Los Altos", "Salcajá", "San Carlos Sija", "San Francisco La Unión", "San Juan Ostuncalco", "San Marcos Sija", "San Mateo", "San Miguel Sigüilá", "San Sebastián", "Sibilia", "Zunil"],
    "Quiché": ["Santa Cruz del Quiché", "Canillá", "Chajul", "Chicamán", "Chiché", "Chichicastenango", "Chinique", "Cunén", "Ixcán", "Joyabaj", "Nebaj", "Pachalum", "Patzité", "Sacapulas", "San Andrés Sajcabajá", "San Antonio Ilotenango", "San Bartolomé Jocotenango", "San Juan Cotzal", "San Pedro Jocopilas", "Uspantán", "Zacualpa"],
    "Retalhuleu": ["Retalhuleu", "Champerico", "El Asintal", "Nuevo San Carlos", "San Andrés Villa Seca", "San Felipe", "San Martín Zapotitlán", "San Sebastián", "Santa Cruz Muluá"],
    "Sacatepéquez": ["Antigua Guatemala", "Alotenango", "Ciudad Vieja", "Jocotenango", "Magdalena Milpas Altas", "Pastores", "San Antonio Aguas Calientes", "San Bartolomé Milpas Altas", "San Lucas Sacatepéquez", "San Miguel Dueñas", "Santa Catarina Barahona", "Santa Lucía Milpas Altas", "Santa María de Jesús", "Santiago Sacatepéquez", "Santo Domingo Xenacoj", "Sumpango", "Santa Inés del Monte Pulido"],
    "San Marcos": ["San Marcos", "Ayutla", "Catarina", "Comitancillo", "Concepción Tutuapa", "El Quetzal", "El Rodeo", "El Tumbador", "Esquipulas Palo Gordo", "Ixchiguán", "La Blanca", "La Reforma", "Malacatán", "Nuevo Progreso", "Ocós", "Pajapita", "Río Blanco", "San Antonio Sacatepéquez", "San Cristóbal Cucho", "San José Ojetenám", "San Lorenzo", "San Miguel Ixtahuacán", "San Pablo", "San Pedro Sacatepéquez", "San Rafael Pie de la Cuesta", "Sibinal", "Sipacapa", "Tacaná", "Tajumulco", "Tejutla"],
    "Santa Rosa": ["Cuilapa", "Barberena", "Casillas", "Chiquimulilla", "Guazacapán", "Nueva Santa Rosa", "Oratorio", "Pueblo Nuevo Viñas", "San Juan Tecuaco", "San Rafael Las Flores", "Santa Cruz Naranjo", "Santa María Ixhuatán", "Santa Rosa de Lima", "Taxisco"],
    "Sololá": ["Sololá", "Concepción", "Nahuala", "Panajachel", "San Andrés Semetabaj", "San Antonio Palopó", "San José Chacayá", "San Juan La Laguna", "San Lucas Tolimán", "San Marcos La Laguna", "San Pablo La Laguna", "San Pedro La Laguna", "Santa Catarina Ixtahuacán", "Santa Catarina Palopó", "Santa Clara La Laguna", "Santa Cruz La Laguna", "Santa Lucía Utatlán", "Santa María Visitación", "Santiago Atitlán"],
    "Suchitepéquez": ["Mazatenango", "Chicacao", "Cuyotenango", "Patulul", "Pueblo Nuevo", "Río Bravo", "Samayac", "San Antonio Suchitepéquez", "San Bernardino", "San Francisco Zapotitlán", "San Gabriel", "San José El Ídolo", "San Juan Bautista", "San Lorenzo", "San Miguel Panán", "San Pablo Jocopilas", "Santa Barbara", "Santo Domingo Suchitepéquez", "Santo Tomás La Unión", "Zunilito"],
    "Totonicapán": ["Totonicapán", "Momostenango", "San Andrés Xecul", "San Bartolo", "San Cristóbal Totonicapán", "San Francisco El Alto", "Santa Lucía La Reforma", "Santa María Chiquimula"],
    "Zacapa": ["Zacapa", "Cabañas", "Estanzuela", "Gualán", "Huité", "La Unión", "Rio Hondo", "San Diego", "San Jorge", "Teculután", "Usumatán"],
};

const DEPARTAMENTOS = Object.keys(GUATEMALA_DATA).sort();

export function Profile() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        telefono: '',
        departamento: '',
        municipio: '',
        direccion_linea1: '',
        direccion_linea2: '',
        referencia: '',
        password: '' // Only for clients right now since we store it in notas or password_hash
    });
    const [municipios, setMunicipios] = useState<string[]>([]);
    const [originalPassword, setOriginalPassword] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                if (user.role === 'cliente') {
                    const { data, error } = await supabase
                        .from('clientes')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (data && !error) {
                        setForm({
                            nombre: data.nombre || '',
                            apellido: data.apellido || '',
                            telefono: data.telefono || '',
                            departamento: data.departamento || '',
                            municipio: data.municipio || '',
                            direccion_linea1: data.direccion_linea1 || '',
                            direccion_linea2: data.direccion_linea2 || '',
                            referencia: data.referencia || '',
                            password: data.notas || ''
                        });
                        setOriginalPassword(data.notas || '');
                    }
                } else {
                    const { data, error } = await supabase
                        .from('usuarios')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (data && !error) {
                        setForm({
                            ...form,
                            nombre: data.nombre || '',
                            apellido: data.apellido || '',
                            telefono: data.telefono || '',
                            password: data.password_hash || ''
                        });
                        setOriginalPassword(data.password_hash || '');
                    }
                }
            } catch (err) {
                console.error("Error fetching profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Update municipalities when department changes
    useEffect(() => {
        if (form.departamento) {
            const munis = GUATEMALA_DATA[form.departamento] || [];
            setMunicipios(munis);
            if (!munis.includes(form.municipio)) {
                setForm(prev => ({ ...prev, municipio: munis[0] || '' }));
            }
        } else {
            setMunicipios([]);
        }
    }, [form.departamento]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.nombre || !form.apellido) {
            setError('El nombre y apellido son obligatorios.'); return;
        }

        setSaving(true);
        try {
            if (user?.role === 'cliente') {
                const updates = {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    telefono: form.telefono,
                    departamento: form.departamento,
                    municipio: form.municipio,
                    direccion_linea1: form.direccion_linea1,
                    direccion_linea2: form.direccion_linea2,
                    referencia: form.referencia,
                    ...(form.password !== originalPassword && {
                        notas: form.password, // Keep fallback support
                        // password_hash: form.password // Removed as per instruction
                    })
                };

                const { error: updateError } = await supabase
                    .from('clientes')
                    .update(updates)
                    .eq('id', user.id);

                if (updateError) throw updateError;

            } else {
                const updates = {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    telefono: form.telefono,
                    ...(form.password !== originalPassword && {
                        password_hash: form.password
                    })
                };

                const { error: updateError } = await supabase
                    .from('usuarios')
                    .update(updates)
                    .eq('id', user?.id);

                if (updateError) throw updateError;
            }

            setSuccess('Perfil actualizado exitosamente.');
            setOriginalPassword(form.password);

            // Note: Does not update local storage user if they change names, 
            // but next login or refresh context does if we implemented context reload.
            // For now, it updates the DB.
        } catch (err: any) {
            setError(err.message || 'Error al guardar los cambios.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Actualiza tu información personal y de entrega.
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {success && (
                <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                    <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm text-green-700">{success}</span>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* ── Readonly fields ── */}
                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tu Casillero</p>
                                    <p className="text-lg font-bold text-blue-600">{user?.locker_id || 'N/A'}</p>
                                </div>
                                <AlertCircle className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Correo Electrónico</p>
                                <p className="text-slate-700 mt-1 font-medium">{user?.email}</p>
                            </div>
                        </div>

                        {/* ── Personal Info ── */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600" />
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                                    <input
                                        type="text"
                                        name="apellido"
                                        value={form.apellido}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                        <Phone className="h-4 w-4 text-slate-400" /> WhatsApp / Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={form.telefono}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Address (Only for clients) ── */}
                        {user?.role === 'cliente' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2 mt-8 pt-6 border-t border-slate-100">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    Dirección de Entrega
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                                            <select
                                                name="departamento"
                                                value={form.departamento}
                                                onChange={handleChange}
                                                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                            >
                                                <option value="">— Selecciona —</option>
                                                {DEPARTAMENTOS.map(dep => (
                                                    <option key={dep} value={dep}>{dep}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Municipio</label>
                                            <select
                                                name="municipio"
                                                value={form.municipio}
                                                onChange={handleChange}
                                                disabled={!form.departamento}
                                                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border disabled:bg-slate-50"
                                            >
                                                <option value="">— Selecciona —</option>
                                                {municipios.map(mun => (
                                                    <option key={mun} value={mun}>{mun}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Calle / Avenida / Zona</label>
                                        <input
                                            type="text"
                                            name="direccion_linea1"
                                            value={form.direccion_linea1}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Colonia / Residencial / Apartamento</label>
                                        <input
                                            type="text"
                                            name="direccion_linea2"
                                            value={form.direccion_linea2}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Referencia</label>
                                        <textarea
                                            name="referencia"
                                            value={form.referencia}
                                            onChange={handleChange}
                                            rows={2}
                                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Security ── */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2 mt-8 pt-6 border-t border-slate-100">
                                <Lock className="h-5 w-5 text-blue-600" />
                                Seguridad
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                    placeholder="Deja en blanco si no quieres cambiarla"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Modifica este campo solo si quieres cambiar tu contraseña actual.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {saving ? (
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
