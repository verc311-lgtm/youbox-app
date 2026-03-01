import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        if (!email || !password) { setError('Completa todos los campos.'); return; }
        setError('');
        setLoading(true);
        const result = await login(email, password);
        setLoading(false);
        if (result.error) { setError(result.error); return; }
        navigate('/');
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!forgotEmail) {
            setError('Ingresa tu correo electrónico.');
            return;
        }

        setLoading(true);
        try {
            // Check if client exists
            const { data: client, error: clientError } = await supabase
                .from('clientes')
                .select('id, nombre, email')
                .eq('email', forgotEmail.toLowerCase())
                .single();

            if (clientError || !client) {
                // If not client, check staff
                const { data: staff, error: staffError } = await supabase
                    .from('usuarios')
                    .select('id')
                    .eq('email', forgotEmail.toLowerCase())
                    .single();

                if (staff && !staffError) {
                    setError('Eres miembro del equipo. Por favor, solicita a un Administrador que restablezca tu contraseña.');
                } else {
                    setError('No se encontró ninguna cuenta con ese correo.');
                }
                setLoading(false);
                return;
            }

            // Generate temporary password
            const tempPassword = 'YBG-' + Math.random().toString(36).substring(2, 6).toUpperCase();

            // Update client password
            const { error: updateError } = await supabase
                .from('clientes')
                .update({ password_hash: tempPassword, notas: tempPassword })
                .eq('id', client.id);

            if (updateError) throw updateError;

            // Queue email notification
            const { error: notifError } = await supabase
                .from('notificaciones')
                .insert([{
                    cliente_id: client.id,
                    tipo: 'email',
                    asunto: 'Recuperación de Contraseña - YOUBOX GT',
                    mensaje: `Hola ${client.nombre},\n\nHemos recibido una solicitud de recuperación de contraseña.\n\nTu nueva contraseña temporal es: **${tempPassword}**\n\nPor favor, inicia sesión con esta contraseña y dirígete a "Mi Perfil" (haciendo clic en tu nombre en el menú) para cambiarla de inmediato.`,
                    estado: 'pendiente'
                }]);

            if (notifError) throw notifError;

            setMessage('Se ha enviado una contraseña temporal a tu correo. Revisa tu bandeja de entrada o spam.');
            setTimeout(() => {
                setIsForgotPassword(false);
                setMessage('');
            }, 5000);

        } catch (err: any) {
            console.error('FORGOT PASSWORD ERROR:', err);
            setError(`Error: ${err?.message || 'Ocurrió un error al procesar tu solicitud.'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <img
                            src="https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-03-1.png"
                            alt="YOUBOX GT Logo"
                            className="h-24 w-auto object-contain mb-4"
                        />
                        <h1 className="text-3xl font-black text-white tracking-tight">YOUBOX GT</h1>
                        <p className="text-slate-400 text-sm mt-1">Sistema de Gestión de Paquetes</p>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-6 text-center">
                        {isForgotPassword ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
                    </h2>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {message}
                        </div>
                    )}

                    {!isForgotPassword ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Usuario o Correo
                                </label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="admin o tu@correo.com"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-2.5 pr-10 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                        placeholder="Contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                                    className="text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 transition-all shadow-lg shadow-blue-500/20 text-sm mt-4"
                            >
                                {loading ? (
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                {loading ? 'Ingresando...' : 'Ingresar'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Correo Registrado
                                </label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={e => setForgotEmail(e.target.value)}
                                    className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors text-sm"
                                    placeholder="tu@correo.com"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-400 mt-2">
                                    Te enviaremos una contraseña temporal a este correo.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 mt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 transition-all shadow-lg shadow-blue-500/20 text-sm"
                                >
                                    {loading ? (
                                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : null}
                                    {loading ? 'Enviando...' : 'Recuperar Contraseña'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
                                    className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 space-y-3 text-center">
                        <p className="text-slate-400 text-sm">
                            ¿No tienes cuenta?{' '}
                            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Crear cuenta de cliente
                            </Link>
                        </p>
                        <div className="border-t border-white/10 pt-3">
                            <Link
                                to="/tracking"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                📦 Rastrear mi paquete sin iniciar sesión
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    © 2025 YOUBOX GT — Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
