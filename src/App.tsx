import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { QuickEntry } from './pages/QuickEntry';
import { Warehouse } from './pages/Warehouse';
import { Inventory } from './pages/Inventory';
import { Consolidation } from './pages/Consolidation';
import { Billing } from './pages/Billing';
import { Settings } from './pages/Settings';
import { Tariffs } from './pages/Tariffs';
import { Users } from './pages/Users';
import { Branches } from './pages/Branches';
import { Login } from './pages/Login';
import { Expenses } from './pages/Expenses';
import { Register } from './pages/Register';
import { Reports } from './pages/Reports';
import { PublicTracking } from './pages/PublicTracking';
import { Profile } from './pages/Profile';

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
  const { user } = useAuth();
  const isClient = user && (user.role === 'cliente');

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/tracking" element={<PublicTracking />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={!isClient ? <Dashboard /> : <Navigate to="/inventory" replace />}
        />
        <Route path="entry" element={<OperadorRoute><QuickEntry /></OperadorRoute>} />
        <Route path="warehouse" element={<OperadorRoute><Warehouse /></OperadorRoute>} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="consolidation" element={<OperadorRoute><Consolidation /></OperadorRoute>} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
        <Route path="tariffs" element={<AdminOnlyRoute><Tariffs /></AdminOnlyRoute>} />
        <Route path="users" element={<AdminOnlyRoute><Users /></AdminOnlyRoute>} />
        <Route path="branches" element={<AdminOnlyRoute><Branches /></AdminOnlyRoute>} />
        <Route path="expenses" element={<FacturadorRoute><Expenses /></FacturadorRoute>} />
        <Route path="reports" element={<FacturadorRoute><Reports /></FacturadorRoute>} />

        {/* Pages under development or placeholders */}
        <Route path="profile" element={<Profile />} />
        <Route path="payments" element={<Navigate to="/billing" replace />} />
        <Route path="geography" element={<AdminOnlyRoute><Navigate to="/settings" replace /></AdminOnlyRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
