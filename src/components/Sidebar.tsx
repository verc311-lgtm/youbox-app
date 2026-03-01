import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PackagePlus,
  Boxes,
  Layers,
  Users,
  Map,
  Calculator,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Inbox,
  Receipt,
  BarChart3,
  Building2,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'General' },
  { name: 'Quick Entry', href: '/entry', icon: PackagePlus, section: 'Operaciones' },
  { name: 'Warehouse', href: '/warehouse', icon: Inbox, section: 'Operaciones' },
  { name: 'Inventario', href: '/inventory', icon: Boxes, section: 'Operaciones' },
  { name: 'Consolidación', href: '/consolidation', icon: Layers, section: 'Operaciones' },
  { name: 'Facturación', href: '/billing', icon: FileText, section: 'Finanzas' },
  { name: 'Pagos', href: '/payments', icon: CreditCard, section: 'Finanzas' },
  { name: 'Gastos', href: '/expenses', icon: Receipt, section: 'Finanzas' },
  { name: 'Reportes', href: '/reports', icon: BarChart3, section: 'Finanzas' },
  { name: 'Sucursales', href: '/branches', icon: Building2, section: 'Configuración' },
  { name: 'Usuarios', href: '/users', icon: Users, section: 'Configuración' },
  { name: 'Geografía', href: '/geography', icon: Map, section: 'Configuración' },
  { name: 'Tarifas', href: '/tariffs', icon: Calculator, section: 'Configuración' },
  { name: 'Ajustes', href: '/settings', icon: Settings, section: 'Configuración' },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen = true, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const customerNavSections = ['Mis Servicios'];

  const customerNavigation = [
    { name: 'Mis Paquetes', href: '/inventory', icon: Boxes, section: 'Mis Servicios' },
    { name: 'Facturación', href: '/billing', icon: FileText, section: 'Mis Servicios' },
    { name: 'Pagos', href: '/payments', icon: CreditCard, section: 'Mis Servicios' },
  ];

  const currentNav = user?.role === 'admin' ? navigation : customerNavigation;
  const sections = user?.role === 'admin'
    ? Array.from(new Set(navigation.map(item => item.section)))
    : customerNavSections;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 outline-none shadow-2xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-lg border border-white/10 shadow-inner">
              <img
                src="https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-03-1.png"
                alt="YOUBOX GT"
                className="h-6 w-auto object-contain drop-shadow-md"
              />
            </div>
            <span className="text-lg font-bold text-white tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">YOUBOX GT</span>
          </div>
          {/* Close button strictly for mobile */}
          <button
            onClick={() => setIsOpen?.(false)}
            className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors lg:hidden rounded-md hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <nav className="flex-1 space-y-8">
            {sections.map((section) => (
              <div key={section} className="animate-fade-in">
                <h3 className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-500/80">
                  {section}
                </h3>
                <ul className="space-y-1.5">
                  {currentNav
                    .filter((item) => item.section === section)
                    .map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            onClick={() => setIsOpen?.(false)}
                            className={cn(
                              isActive
                                ? 'bg-blue-600/10 text-blue-400 shadow-[inset_2px_0_0_0_#3b82f6]'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                              'group flex items-center gap-x-3 rounded-xl p-2.5 text-sm font-medium transition-all duration-200'
                            )}
                          >
                            <item.icon
                              className={cn(
                                isActive ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-500 group-hover:text-slate-300',
                                'h-5 w-5 shrink-0 transition-all duration-200'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* User info + logout */}
        <div className="border-t border-white/5 p-4 bg-slate-900/50 backdrop-blur-md">
          <Link
            to="/profile"
            onClick={() => setIsOpen?.(false)}
            className="flex items-center gap-3 mb-2 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 group border border-transparent hover:border-white/5 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg ring-2 ring-slate-900 shrink-0 transform group-hover:scale-105 transition-transform duration-200">
              <span className="text-sm font-bold">{user?.nombre?.[0]?.toUpperCase() ?? 'U'}</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{user?.nombre} {user?.apellido}</p>
              {user?.locker_id && (
                <p className="text-xs text-blue-400/90 font-medium tracking-wide truncate mt-0.5">{user.locker_id}</p>
              )}
              {user?.role === 'admin' && (
                <p className="text-[10px] uppercase font-bold text-emerald-400/90 tracking-wider mt-0.5">Admin</p>
              )}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-x-2 rounded-xl p-2.5 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
}
