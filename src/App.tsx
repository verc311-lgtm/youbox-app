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
import { Login } from './pages/Login';
import { Expenses } from './pages/Expenses';
import { Register } from './pages/Register';

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

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // If not admin, restrict access and redirect to their main view
  if (user?.role !== 'admin' && user?.role !== 'operador' && user?.role !== 'facturador') {
    return <Navigate to="/inventory" replace />;
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
        <Route path="entry" element={<AdminRoute><QuickEntry /></AdminRoute>} />
        <Route path="warehouse" element={<AdminRoute><Warehouse /></AdminRoute>} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="consolidation" element={<AdminRoute><Consolidation /></AdminRoute>} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
        <Route path="tariffs" element={<AdminRoute><Tariffs /></AdminRoute>} />
        <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="expenses" element={<AdminRoute><Expenses /></AdminRoute>} />

        {/* Pages under development or placeholders */}
        <Route path="payments" element={<Navigate to="/billing" replace />} />
        <Route path="geography" element={<AdminRoute><Navigate to="/settings" replace /></AdminRoute>} />
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
