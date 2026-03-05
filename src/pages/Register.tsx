import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Copy, MessageCircle, Mail, MapPin, ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth, getAddressText } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Step = 'form' | 'success';

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

export function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>('form');
    const [registeredUser, setRegisteredUser] = useState<{
        nombre: string; locker_id: string; email: string; telefono: string;
    } | null>(null);

    const [form, setForm] = useState({
        nombre: '', apellido: '', email: '', telefono: '', password: '', confirmPassword: '', sucursal_id: '',
        // Address
        departamento: '', municipio: '', direccion_linea1: '', direccion_linea2: '', referencia: ''
    });
    const [aceptoTyC, setAceptoTyC] = useState(false);
    const [municipios, setMunicipios] = useState<string[]>([]);

    const [sucursales, setSucursales] = useState<{ id: string, nombre: string, prefijo_casillero: string }[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchSucursales = async () => {
            const { data } = await supabase.from('sucursales').select('*').eq('activa', true).order('nombre');
            if (data) {
                setSucursales(data);
                if (data.length > 0) {
                    setForm(prev => ({ ...prev, sucursal_id: data[0].id }));
                }
            }
        };
        fetchSucursales();
    }, []);

    // Update municipalities when department changes
    useEffect(() => {
        if (form.departamento) {
            const munis = GUATEMALA_DATA[form.departamento] || [];
            setMunicipios(munis);
            setForm(prev => ({ ...prev, municipio: munis[0] || '' }));
        }
    }, [form.departamento]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validations
        if (!form.nombre || !form.apellido || !form.email || !form.telefono || !form.password) {
            setError('Completa todos los campos obligatorios.'); return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Las contraseñas no coinciden.'); return;
        }
        if (form.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.'); return;
        }
        if (!form.sucursal_id) {
            setError('Por favor selecciona una sucursal.'); return;
        }
        if (!form.departamento || !form.municipio || !form.direccion_linea1) {
            setError('Por favor completa tu dirección de entrega en Guatemala.'); return;
        }
        if (!aceptoTyC) {
            setError('Debes aceptar los Términos y Condiciones para continuar.'); return;
        }

        const selectedSucursal = sucursales.find(s => s.id === form.sucursal_id);

        setLoading(true);
        const result = await register({
            nombre: form.nombre,
            apellido: form.apellido,
            email: form.email,
            telefono: form.telefono,
            password: form.password,
            sucursal_id: selectedSucursal?.id,
            sucursal_prefix: selectedSucursal?.prefijo_casillero,
            // address
            departamento: form.departamento,
            municipio: form.municipio,
            direccion_linea1: form.direccion_linea1,
            direccion_linea2: form.direccion_linea2,
            referencia: form.referencia,
            acepto_tyc: true,
            fecha_acepto_tyc: new Date().toISOString(),
        });
        setLoading(false);
        if (result.error) { setError(result.error); return; }
        if (result.user) {
            setRegisteredUser({
                nombre: result.user.nombre,
                locker_id: result.user.locker_id!,
                email: result.user.email,
                telefono: form.telefono,
            });
            setStep('success');
        }
    };

    const sendWhatsApp = () => {
        if (!registeredUser) return;
        const message = encodeURIComponent(getAddressText(registeredUser.locker_id));
        const phone = registeredUser.telefono.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const sendEmail = () => {
        if (!registeredUser) return;
        const subject = encodeURIComponent(`Bienvenido a YOUBOX GT! Tu casillero es ${registeredUser.locker_id}`);
        const body = encodeURIComponent(getAddressText(registeredUser.locker_id));
        window.open(`mailto:${registeredUser.email}?subject=${subject}&body=${body}`, '_blank');
    };

    const copyAddress = () => {
        if (!registeredUser) return;
        navigator.clipboard.writeText(getAddressText(registeredUser.locker_id));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Success screen ──────────────────────────────────────────────────────────
    if (step === 'success' && registeredUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
                </div>

                <div className="relative w-full max-w-2xl">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30 mx-auto mb-4">
                                <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-black text-white">
                                Cuenta Creada Exitosamente
                            </h1>
                            <p className="text-slate-300 mt-1">
                                Bienvenido/a, <span className="text-blue-400 font-bold">{registeredUser.nombre}</span>
                            </p>
                            <div className="mt-3 inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 rounded-full px-5 py-2">
                                <span className="text-slate-300 text-sm">Tu casillero:</span>
                                <span className="text-blue-300 font-black text-lg tracking-widest">{registeredUser.locker_id}</span>
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="space-y-3 mb-6">
                            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
                                Tus 3 Direcciones de Recepcion
                            </h3>

                            {/* Greensboro */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <p className="text-blue-400 font-bold text-sm mb-2">🇺🇸 Greensboro, NC — Via Maritima</p>
                                <div className="text-slate-300 text-sm space-y-0.5 font-mono">
                                    <p><span className="text-slate-500">Nombre:</span> YBG {registeredUser.nombre} {registeredUser.locker_id}</p>
                                    <p><span className="text-slate-500">Dir:</span> 4100 Tulsa Dr</p>
                                    <p><span className="text-slate-500">Suite/Apt:</span> {registeredUser.locker_id}</p>
                                    <p><span className="text-slate-500">Ciudad:</span> Greensboro, NC 27406</p>
                                    <p><span className="text-slate-500">Tel:</span> 3365496890</p>
                                </div>
                            </div>

                            {/* Laredo */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <p className="text-blue-400 font-bold text-sm mb-2">🇺🇸 Laredo, TX — Via Terrestre</p>
                                <div className="text-slate-300 text-sm space-y-0.5 font-mono">
                                    <p><span className="text-slate-500">Nombre:</span> YBG {registeredUser.nombre} {registeredUser.locker_id}</p>
                                    <p><span className="text-slate-500">Dir:</span> 1900 Justo Penn St</p>
                                    <p><span className="text-slate-500">Suite/Apt:</span> {registeredUser.locker_id}</p>
                                    <p><span className="text-slate-500">Ciudad:</span> Laredo, TX 78041</p>
                                    <p><span className="text-slate-500">Tel:</span> 7572437074</p>
                                </div>
                            </div>

                            {/* Tapachula */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <p className="text-amber-400 font-bold text-sm mb-2">🇲🇽 Tapachula, Chiapas — Via Terrestre Mexico</p>
                                <div className="text-slate-300 text-sm space-y-0.5 font-mono">
                                    <p><span className="text-slate-500">Nombre:</span> YBG {registeredUser.nombre} {registeredUser.locker_id}</p>
                                    <p><span className="text-slate-500">Dir:</span> Calle El Carmen Manzana 6 Casa 4</p>
                                    <p><span className="text-slate-500">Ref:</span> Infonavit El Carmen + {registeredUser.locker_id}</p>
                                    <p><span className="text-slate-500">Ciudad:</span> Tapachula, Chiapas CP 30799</p>
                                    <p><span className="text-slate-500">Tel:</span> 9621210423</p>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <button
                                onClick={sendWhatsApp}
                                className="flex flex-col items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/15 p-3 text-green-400 hover:bg-green-500/25 transition-colors text-xs font-medium"
                            >
                                <MessageCircle className="h-5 w-5" />
                                Enviar WhatsApp
                            </button>
                            <button
                                onClick={sendEmail}
                                className="flex flex-col items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/15 p-3 text-blue-400 hover:bg-blue-500/25 transition-colors text-xs font-medium"
                            >
                                <Mail className="h-5 w-5" />
                                Enviar Email
                            </button>
                            <button
                                onClick={copyAddress}
                                className="flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-3 text-slate-300 hover:bg-white/10 transition-colors text-xs font-medium"
                            >
                                <Copy className="h-5 w-5" />
                                {copied ? '¡Copiado!' : 'Copiar Info'}
                            </button>
                        </div>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2.5 transition-all shadow-lg shadow-blue-500/20 text-sm"
                        >
                            Ir al Panel Principal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Registration form ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4 py-10">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-6">
                        <img
                            src="https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-03-1.png"
                            alt="YOUBOX GT Logo"
                            className="h-20 w-auto object-contain mb-3"
                        />
                        <h1 className="text-2xl font-black text-white tracking-tight">YOUBOX GT</h1>
                        <p className="text-slate-400 text-sm">Crear cuenta de cliente</p>
                    </div>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* ── Section 1: BRANCH ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-emerald-400" />
                                ¿En qué Sucursal recoges tus paquetes? *
                            </label>
                            <select
                                name="sucursal_id"
                                value={form.sucursal_id}
                                onChange={handleChange}
                                className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors text-sm font-medium"
                            >
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id} className="bg-slate-800">{s.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* ── Section 2: PERSONAL INFO ── */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ChevronRight className="h-3 w-3" /> Información Personal
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Nombre *</label>
                                    <input
                                        name="nombre" value={form.nombre} onChange={handleChange}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                        placeholder="Juan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Apellido *</label>
                                    <input
                                        name="apellido" value={form.apellido} onChange={handleChange}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                        placeholder="Perez"
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Correo Electrónico *</label>
                                <input
                                    name="email" type="email" value={form.email} onChange={handleChange}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="tu@correo.com"
                                />
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    WhatsApp / Teléfono * <span className="text-slate-500 font-normal">(con código de país, ej: 502 para GT)</span>
                                </label>
                                <input
                                    name="telefono" value={form.telefono} onChange={handleChange}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="50255551234"
                                />
                            </div>
                        </div>

                        {/* ── Section 3: GUATEMALA ADDRESS ── */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ChevronRight className="h-3 w-3" /> 🇬🇹 Dirección de Entrega en Guatemala
                            </p>
                            <div className="space-y-3 bg-white/3 rounded-xl border border-white/8 p-4">
                                {/* Departamento */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Departamento *</label>
                                    <select
                                        name="departamento"
                                        value={form.departamento}
                                        onChange={handleChange}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    >
                                        <option value="" className="bg-slate-800">— Selecciona tu departamento —</option>
                                        {DEPARTAMENTOS.map(dep => (
                                            <option key={dep} value={dep} className="bg-slate-800">{dep}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Municipio */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Municipio *</label>
                                    <select
                                        name="municipio"
                                        value={form.municipio}
                                        onChange={handleChange}
                                        disabled={!form.departamento}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm disabled:opacity-40"
                                    >
                                        <option value="" className="bg-slate-800">— Selecciona tu municipio —</option>
                                        {municipios.map(mun => (
                                            <option key={mun} value={mun} className="bg-slate-800">{mun}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dirección Línea 1 */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Calle / Avenida / Zona *</label>
                                    <input
                                        name="direccion_linea1" value={form.direccion_linea1} onChange={handleChange}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                        placeholder="Ej: 5ta Calle 10-25, Zona 1"
                                    />
                                </div>

                                {/* Dirección Línea 2 */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Colonia / Residencial / Apartamento</label>
                                    <input
                                        name="direccion_linea2" value={form.direccion_linea2} onChange={handleChange}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                        placeholder="Ej: Residencial Las Flores, Casa 3"
                                    />
                                </div>

                                {/* Referencia */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Referencia (para encontrarte fácil)</label>
                                    <textarea
                                        name="referencia" value={form.referencia} onChange={handleChange}
                                        rows={2}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm resize-none"
                                        placeholder="Ej: Frente al parque, casa verde con portón negro"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section 4: PASSWORD ── */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ChevronRight className="h-3 w-3" /> Seguridad
                            </p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña *</label>
                                    <div className="relative">
                                        <input
                                            name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange}
                                            className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 pr-10 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Confirmar Contraseña *</label>
                                    <input
                                        name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                        placeholder="Repite tu contraseña"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── LOCKER NOTICE ── */}
                        <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm">
                            <p className="text-blue-400 font-medium">Tu casillero se asignará automáticamente</p>
                            <p className="text-slate-400 text-xs mt-0.5">Recibirás tu número de casillero único (YBG4000+) al crear tu cuenta.</p>
                        </div>

                        {/* ── TERMS AND CONDITIONS ── */}
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-none mt-0.5">
                                    <input
                                        type="checkbox"
                                        id="tyc"
                                        checked={aceptoTyC}
                                        onChange={(e) => setAceptoTyC(e.target.checked)}
                                        className="h-4 w-4 rounded border-amber-500/50 bg-white/10 text-amber-500 focus:ring-amber-500/30"
                                    />
                                </div>
                                <label htmlFor="tyc" className="text-sm text-slate-300 cursor-pointer leading-relaxed">
                                    He leído y acepto los{' '}
                                    <a
                                        href="https://youboxgt.online/services-2/tyc/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Términos y Condiciones de YOUBOX GT
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                    {' '}incluyendo la política de uso del casillero, tarifas y responsabilidades de envío. <span className="text-red-400 font-bold">*</span>
                                </label>
                            </div>
                            {!aceptoTyC && (
                                <p className="text-amber-500/70 text-xs mt-2 pl-7">Requerido para crear tu cuenta.</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !aceptoTyC}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 transition-all shadow-lg shadow-blue-500/20 text-sm"
                        >
                            {loading ? (
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <UserPlus className="h-4 w-4" />
                            )}
                            {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <p className="text-slate-400 text-sm">
                            ¿Ya tienes cuenta?{' '}
                            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Iniciar sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
