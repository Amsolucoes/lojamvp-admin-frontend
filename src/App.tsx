import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/login/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLojas } from './pages/admin/AdminLojas';
import { AdminPagamentos } from './pages/admin/AdminPagamentos';
import { AdminVideosAjuda } from './pages/admin/AdminVideosAjuda';
import { AdminAcessorios } from './pages/admin/AdminAcessorios';
import { AdminPedidosAcessorios } from './pages/admin/AdminPedidosAcessorios';
import { ClienteDashboard } from './pages/cliente/ClienteDashboard';
import { ToastProvider } from './context/ToastContext';
import './index.css';

// Puxar a tela pra baixo no topo do scroll recarrega o app — padrão comum em apps mobile
function usePullToRefresh(containerRef: React.RefObject<HTMLElement | null>, onRefresh: () => void) {
  const [pull, setPull] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const startY = useRef(0);
  const puxando = useRef(false);
  const pullAtual = useRef(0);
  const ultimoScroll = useRef(0);   // quando a lista rolou pela última vez (rolagem com inércia ainda em andamento)

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Qualquer rolagem cancela um "puxar" em andamento e marca o momento: a inércia de uma rolagem rápida
    // de volta ao topo não pode ser confundida com o gesto de puxar para recarregar
    // No mobile quem rola é a página (window); no desktop é o <main>. Um dos dois é sempre 0.
    const topoDaRolagem = () => Math.max(window.scrollY, el!.scrollTop);

    function onScroll() {
      ultimoScroll.current = Date.now();
      if (puxando.current && topoDaRolagem() > 0) {
        puxando.current = false;
        pullAtual.current = 0;
        setPull(0);
      }
    }
    function onTouchStart(e: TouchEvent) {
      puxando.current = false;
      pullAtual.current = 0;
      const rolouAgora = Date.now() - ultimoScroll.current < 350;
      if (topoDaRolagem() <= 0 && !rolouAgora) {
        startY.current = e.touches[0].clientY;
        puxando.current = true;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!puxando.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && topoDaRolagem() <= 0) {
        if (delta < 16) return;   // folga: um leve arrasto não mostra o carregando
        const novoPull = Math.min((delta - 16) * 0.5, 90);
        pullAtual.current = novoPull;
        setPull(novoPull);
      } else {
        puxando.current = false;
        pullAtual.current = 0;
        setPull(0);
      }
    }
    function onTouchEnd() {
      if (!puxando.current) { setPull(0); return; }
      puxando.current = false;
      if (pullAtual.current > 60) {
        setRecarregando(true);
        setPull(60);
        onRefresh();
        setTimeout(() => { setRecarregando(false); setPull(0); }, 600);
      } else {
        setPull(0);
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef, onRefresh]);

  return { pull, recarregando };
}

function Layout() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);   // remonta a tela (refaz os fetches) sem recarregar o app
  const { pull, recarregando } = usePullToRefresh(mainRef, refresh);

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
        <Outlet key={refreshKey} />
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
            <Route path="/admin/pagamentos" element={<AdminPagamentos />} />
            <Route path="/admin/videos"    element={<AdminVideosAjuda />} />
            <Route path="/admin/acessorios" element={<AdminAcessorios />} />
            <Route path="/admin/acessorios/pedidos" element={<AdminPedidosAcessorios />} />
            <Route path="*"               element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/cliente"         element={<ClienteDashboard />} />
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
