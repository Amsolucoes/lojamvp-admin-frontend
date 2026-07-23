import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/login/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLojas } from './pages/admin/AdminLojas';
import { AdminVideosAjuda } from './pages/admin/AdminVideosAjuda';
import { ClienteDashboard } from './pages/cliente/ClienteDashboard';
import { ClienteConfig } from './pages/cliente/ClienteConfig';
import { ClientePerfil } from './pages/cliente/ClientePerfil';
import { ToastProvider } from './context/ToastContext';
import './index.css';

// Puxar a tela pra baixo no topo do scroll recarrega o app — padrão comum em apps mobile
function usePullToRefresh(containerRef: React.RefObject<HTMLElement | null>) {
  const [pull, setPull] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const startY = useRef(0);
  const puxando = useRef(false);
  const pullAtual = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        puxando.current = true;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!puxando.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && el!.scrollTop <= 0) {
        const novoPull = Math.min(delta * 0.5, 90);
        pullAtual.current = novoPull;
        setPull(novoPull);
      } else {
        puxando.current = false;
        pullAtual.current = 0;
        setPull(0);
      }
    }
    function onTouchEnd() {
      if (!puxando.current) return;
      puxando.current = false;
      if (pullAtual.current > 60) {
        setRecarregando(true);
        setPull(60);
        window.location.reload();
      } else {
        setPull(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef]);

  return { pull, recarregando };
}

function Layout() {
  const mainRef = useRef<HTMLElement | null>(null);
  const { pull, recarregando } = usePullToRefresh(mainRef);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main" ref={mainRef} style={{ position: 'relative' }}>
        {pull > 0 && (
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: `translate(-50%, ${pull - 40}px)`,
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 60, boxShadow: 'var(--shadow-lg)',
            transition: recarregando ? 'none' : 'transform 0.1s',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)',
              animation: recarregando ? 'spin 0.6s linear infinite' : 'none',
              transform: recarregando ? 'none' : `rotate(${pull * 3}deg)`,
            }} />
          </div>
        )}
        <Outlet />
      </main>
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
            <Route path="/admin/videos"    element={<AdminVideosAjuda />} />
            <Route path="*"               element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/cliente"         element={<ClienteDashboard />} />
            <Route path="/cliente/config"  element={<ClienteConfig />} />
            <Route path="/cliente/perfil"  element={<ClientePerfil />} />
            <Route path="*"               element={<Navigate to="/cliente" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Rotas />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
    
  );
}
