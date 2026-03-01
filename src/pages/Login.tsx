import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setError('Completa todos los campos.'); return; }
        setError('');
        setLoading(true);
        const result = await login(email, password);
        setLoading(false);
        if (result.error) { setError(result.error); return; }
        navigate('/');
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

                    <h2 className="text-xl font-bold text-white mb-6 text-center">Iniciar Sesión</h2>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 transition-all shadow-lg shadow-blue-500/20 text-sm mt-2"
                        >
                            {loading ? (
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <LogIn className="h-4 w-4" />
                            )}
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>

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
