import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'cliente' | 'operador' | 'facturador' | 'viewer' | string;

export interface AuthUser {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    locker_id?: string;
    role: UserRole;
    sucursal_id?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ error?: string }>;
    register: (data: RegisterData) => Promise<{ error?: string; user?: AuthUser }>;
    logout: () => void;
    isAdmin: boolean;
}

export interface RegisterData {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    password: string;
    sucursal_id?: string;
    sucursal_prefix?: string;
    // Guatemala address
    departamento?: string;
    municipio?: string;
    direccion_linea1?: string;
    direccion_linea2?: string;
    referencia?: string;
    acepto_tyc?: boolean;
    fecha_acepto_tyc?: string;
}

// ─── Addresses (from company images) ────────────────────────────────────────
export const YOUBOX_ADDRESSES = {
    greensboro: {
        titulo: '🇺🇸 Vía Marítima — Estados Unidos',
        bodega: 'Greensboro, NC',
        nombre: 'YBG + Tu Nombre',
        direccion: '4100 Tulsa Dr',
        suiteApt: '{CASILLERO}',
        ciudad: 'Greensboro',
        estado: 'Carolina del Norte (NC)',
        zipCode: '27406',
        telefono: '3365496890',
    },
    laredo: {
        titulo: '🇺🇸 Vía Terrestre — Estados Unidos',
        bodega: 'Laredo, TX',
        nombre: 'YBG + Tu Nombre',
        direccion: '1900 Justo Penn St',
        suiteApt: '{CASILLERO}',
        ciudad: 'Laredo',
        estado: 'Texas',
        zipCode: '78041',
        telefono: '7572437074',
    },
    tapachula: {
        titulo: '🇲🇽 Vía Terrestre — México',
        bodega: 'Tapachula, Chiapas',
        nombre: 'YBG + Tu Nombre',
        direccion: 'Calle El Carmen Manzana 6 Casa 4',
        referencias: 'Infonavit El Carmen + {CASILLERO}',
        distrito: 'Tapachula',
        ciudad: 'Tapachula',
        estado: 'Chiapas',
        codPostal: '30799',
        telefono: '9621210423',
    },
};

export function getAddressText(locker: string) {
    const a = YOUBOX_ADDRESSES;
    return `
🎉 ¡Bienvenido a YOUBOX GT! Tu casillero es: *${locker}*

📦 *DIRECCIÓN GREENSBORO, NC (Vía Marítima USA)*
Nombre: YBG + Tu Nombre  
Dirección: 4100 Tulsa Dr  
Suite/Apt: ${locker}  
Ciudad: Greensboro, NC  
ZIP: 27406  
Tel: ${a.greensboro.telefono}

📦 *DIRECCIÓN LAREDO, TX (Vía Terrestre USA)*
Nombre: YBG + Tu Nombre  
Dirección: 1900 Justo Penn St  
Suite/Apt: ${locker}  
Ciudad: Laredo, TX  
ZIP: 78041  
Tel: ${a.laredo.telefono}

📦 *DIRECCIÓN TAPACHULA, MX (Vía Terrestre México)*
Nombre: YBG + Tu Nombre  
Dirección: Calle El Carmen Manzana 6 Casa 4  
Referencias: Infonavit El Carmen + ${locker}  
Ciudad: Tapachula, Chiapas  
CP: 30799  
Tel: ${a.tapachula.telefono}

⚠️ Escribe los datos tal como se indican. Recuerda revisar términos y condiciones.
  `.trim();
}

// ─── Locker ID Generator ─────────────────────────────────────────────────────
async function generateNextLocker(prefix: string = 'YBG'): Promise<string> {
    try {
        const { data } = await supabase
            .from('clientes')
            .select('locker_id')
            .like('locker_id', `${prefix}%`)
            .order('locker_id', { ascending: false })
            .limit(50); // fetch more to sort numerically, not lexicographically

        if (!data || data.length === 0) return `${prefix}1`;

        // Parse numeric suffix and find the actual highest number
        const maxNum = data.reduce((max, row) => {
            const match = row.locker_id.replace(prefix, '').match(/^(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                return num > max ? num : max;
            }
            return max;
        }, 0);

        return `${prefix}${maxNum + 1}`;
    } catch {
        return `${prefix}1`;
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('youbox_user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch { }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<{ error?: string }> => {
        // Admin hardcoded (fallback maestro)
        if (email.toLowerCase() === 'admin' && password === '1234') {
            const adminUser: AuthUser = {
                id: 'admin-001',
                nombre: 'Administrador',
                apellido: 'YOUBOX',
                email: 'admin@youbox.gt',
                role: 'admin',
            };
            setUser(adminUser);
            localStorage.setItem('youbox_user', JSON.stringify(adminUser));
            return {};
        }

        try {
            // First check if it's a client
            const { data: clientData, error: clientError } = await supabase
                .from('clientes')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (!clientError && clientData) {
                // Es cliente
                const storedPassword = clientData.password_hash ?? clientData.notas;
                if (storedPassword !== password) return { error: 'Contraseña incorrecta.' };

                const clientUser: AuthUser = {
                    id: clientData.id,
                    nombre: clientData.nombre,
                    apellido: clientData.apellido,
                    email: clientData.email,
                    telefono: clientData.telefono,
                    locker_id: clientData.locker_id,
                    role: 'cliente',
                    sucursal_id: clientData.sucursal_id
                };
                setUser(clientUser);
                localStorage.setItem('youbox_user', JSON.stringify(clientUser));
                return {};
            }

            // Si no fue cliente, revisamos si es Staff en la tabla 'usuarios'
            const { data: staffData, error: staffError } = await supabase
                .from('usuarios')
                .select('*, roles(nombre)')
                .eq('email', email.toLowerCase())
                .single();

            if (staffError || !staffData) {
                return { error: 'Credenciales incorrectas. Verifica tu email.' };
            }

            if (!staffData.activo) {
                return { error: 'Esta cuenta ha sido suspendida.' };
            }

            // Validar contraseñas del staff
            if (staffData.password_hash !== password) {
                return { error: 'Contraseña incorrecta.' };
            }

            const staffUser: AuthUser = {
                id: staffData.id,
                nombre: staffData.nombre,
                apellido: staffData.apellido,
                email: staffData.email,
                telefono: staffData.telefono,
                role: staffData.roles?.nombre || 'admin', // Default a admin si falla el rol
                sucursal_id: staffData.sucursal_id
            };
            setUser(staffUser);
            localStorage.setItem('youbox_user', JSON.stringify(staffUser));
            return {};

        } catch {
            return { error: 'Error de conexión. Intenta de nuevo.' };
        }
    };

    const register = async (data: RegisterData): Promise<{ error?: string; user?: AuthUser }> => {
        try {
            const lockerId = await generateNextLocker(data.sucursal_prefix || 'YBG');

            const { data: inserted, error } = await supabase
                .from('clientes')
                .insert([{
                    nombre: data.nombre,
                    apellido: data.apellido,
                    email: data.email.toLowerCase(),
                    telefono: data.telefono,
                    locker_id: lockerId,
                    notas: data.password, // guardamos contraseña en 'notas' hasta que exista password_hash
                    activo: true,
                    sucursal_id: data.sucursal_id || null,
                    departamento: data.departamento || null,
                    municipio: data.municipio || null,
                    direccion_linea1: data.direccion_linea1 || null,
                    direccion_linea2: data.direccion_linea2 || null,
                    referencia: data.referencia || null,
                    acepto_tyc: data.acepto_tyc || false,
                    fecha_acepto_tyc: data.fecha_acepto_tyc || null,
                }])
                .select()
                .single();

            if (error) {
                console.error('Supabase register error:', error);
                if (error.code === '23505') return { error: 'Este correo o casillero ya está registrado.' };
                if (error.code === '42501') return { error: 'Sin permisos. Ejecuta el SQL 002_fix_rls_policies.sql en Supabase.' };
                return { error: `Error: ${error.message}` };
            }

            const newUser: AuthUser = {
                id: inserted.id,
                nombre: inserted.nombre,
                apellido: inserted.apellido,
                email: inserted.email,
                telefono: inserted.telefono,
                locker_id: inserted.locker_id,
                role: 'cliente',
                sucursal_id: inserted.sucursal_id
            };

            setUser(newUser);
            localStorage.setItem('youbox_user', JSON.stringify(newUser));
            return { user: newUser };
        } catch {
            return { error: 'Error inesperado. Intenta de nuevo.' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('youbox_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
