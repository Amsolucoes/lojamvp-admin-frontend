import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/login/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLojas } from './pages/admin/AdminLojas';
import { ClienteDashboard } from './pages/cliente/ClienteDashboard';
import { ClienteConfig } from './pages/cliente/ClienteConfig';
import './index.css';

function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main"><Outlet /></main>
    </div>
  );
}

function Rotas() {
  const { sessao } = useAuth();

  if (!sessao) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isSuperAdmin = sessao.role === 'superadmin';

  return (
    <Routes>
      <Route element={<Layout />}>
        {isSuperAdmin ? (
          <>
            <Route path="/admin"           element={<AdminDashboard />} />
            <Route path="/admin/lojas"     element={<AdminLojas />} />
            <Route path="*"               element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/cliente"         element={<ClienteDashboard />} />
            <Route path="/cliente/config"  element={<ClienteConfig />} />
            <Route path="*"               element={<Navigate to="/cliente" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Rotas />
      </BrowserRouter>
    </AuthProvider>
  );
}
