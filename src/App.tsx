import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';

// Lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const QuickEntry = lazy(() => import('./pages/QuickEntry').then(m => ({ default: m.QuickEntry })));
const ClientEntry = lazy(() => import('./pages/ClientEntry').then(m => ({ default: m.ClientEntry })));
const Warehouse = lazy(() => import('./pages/Warehouse').then(m => ({ default: m.Warehouse })));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Consolidation = lazy(() => import('./pages/Consolidation').then(m => ({ default: m.Consolidation })));
const Billing = lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Tariffs = lazy(() => import('./pages/Tariffs').then(m => ({ default: m.Tariffs })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Branches = lazy(() => import('./pages/Branches').then(m => ({ default: m.Branches })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Payments = lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const PublicTracking = lazy(() => import('./pages/PublicTracking').then(m => ({ default: m.PublicTracking })));
const PublicEstimator = lazy(() => import('./pages/PublicEstimator').then(m => ({ default: m.PublicEstimator })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const PreAlertsAdmin = lazy(() => import('./pages/PreAlertsAdmin').then(m => ({ default: m.PreAlertsAdmin })));
const ClientPreAlerts = lazy(() => import('./pages/ClientPreAlerts').then(m => ({ default: m.ClientPreAlerts })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));

// Loading Component for Suspense
const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
    <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm font-bold text-slate-500 animate-pulse">Cargando módulo...</p>
  </div>
);

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Staff route (Admin, Operador, Facturador)
function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin' && user?.role !== 'operador' && user?.role !== 'facturador') {
    return <Navigate to="/inventory" replace />;
  }
  return <>{children}</>;
}

// Operador Route (Admin, Operador)
function OperadorRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin' && user?.role !== 'operador') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Facturador Route (Admin, Facturador)
function FacturadorRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin' && user?.role !== 'facturador') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Admin Only Route (Admin)
function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      {/* Only loaded in development – zero cost in production */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
