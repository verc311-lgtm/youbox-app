import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Copy, MessageCircle, Mail } from 'lucide-react';
import { useAuth, getAddressText } from '../context/AuthContext';

type Step = 'form' | 'success';

export function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>('form');
    const [registeredUser, setRegisteredUser] = useState<{
        nombre: string; locker_id: string; email: string; telefono: string;
    } | null>(null);

    const [form, setForm] = useState({
        nombre: '', apellido: '', email: '', telefono: '', password: '', confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.nombre || !form.apellido || !form.email || !form.telefono || !form.password) {
            setError('Completa todos los campos obligatorios.'); return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Las contraseñas no coinciden.'); return;
        }
        if (form.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.'); return;
        }
        setLoading(true);
        const result = await register({
            nombre: form.nombre,
            apellido: form.apellido,
            email: form.email,
            telefono: form.telefono,
            password: form.password,
        });
        setLoading(false);
        if (result.error) { setError(result.error); return; }
        if (result.user) {
            const userData = {
                nombre: result.user.nombre,
                locker_id: result.user.locker_id!,
                email: result.user.email,
                telefono: form.telefono,
            };
            setRegisteredUser(userData);

            // El correo y WhatsApp ahora se disparan en segundo plano via Supabase Webhook + Edge Function

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30 mb-3">
                            <Boxes className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">YOUBOX GT</h1>
                        <p className="text-slate-400 text-sm">Crear cuenta de cliente</p>
                    </div>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
                                <input
                                    name="nombre" value={form.nombre} onChange={handleChange}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="Juan"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Apellido *</label>
                                <input
                                    name="apellido" value={form.apellido} onChange={handleChange}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="Perez"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo Electronico *</label>
                            <input
                                name="email" type="email" value={form.email} onChange={handleChange}
                                className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                placeholder="tu@correo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                WhatsApp / Telefono * <span className="text-slate-500 font-normal">(con codigo de pais)</span>
                            </label>
                            <input
                                name="telefono" value={form.telefono} onChange={handleChange}
                                className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                placeholder="50255551234"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Contrasena *</label>
                            <div className="relative">
                                <input
                                    name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 pr-10 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="Minimo 6 caracteres"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmar Contrasena *</label>
                            <input
                                name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
                                className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                placeholder="Repite tu contrasena"
                            />
                        </div>

                        <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm">
                            <p className="text-blue-400 font-medium">Tu casillero se asignara automaticamente</p>
                            <p className="text-slate-400 text-xs mt-0.5">Recibiras tu numero de casillero unico (YBG4000+) al crear tu cuenta.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 transition-all shadow-lg shadow-blue-500/20 text-sm"
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
                            Ya tienes cuenta?{' '}
                            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Iniciar sesion
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
