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
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 outline-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">YOUBOX GT</span>
          </div>
          {/* Close button strictly for mobile */}
          <button
            onClick={() => setIsOpen?.(false)}
            className="p-2 -mr-2 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <nav className="flex-1 space-y-6">
            {sections.map((section) => (
              <div key={section}>
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {section}
                </h3>
                <ul className="space-y-1">
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
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                              'group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors'
                            )}
                          >
                            <item.icon
                              className={cn(
                                isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white',
                                'h-5 w-5 shrink-0 transition-colors'
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
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
              {user?.nombre?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.nombre} {user?.apellido}</p>
              {user?.locker_id && (
                <p className="text-xs text-blue-400 truncate">{user.locker_id}</p>
              )}
              {user?.role === 'admin' && (
                <p className="text-xs text-amber-400">Administrador</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-x-2 rounded-md p-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
}
