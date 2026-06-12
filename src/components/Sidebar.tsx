import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, LogOut, Settings, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_SUPER = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/admin/lojas',    icon: Building2,       label: 'Lojas'       },
  { to: '/admin/pagamentos', icon: CreditCard,    label: 'Pagamentos'  },
];

const NAV_CLIENTE = [
  { to: '/cliente',           icon: LayoutDashboard, label: 'Minha Assinatura' },
  { to: '/cliente/faturas',   icon: CreditCard,      label: 'Faturas'          },
  { to: '/cliente/config',    icon: Settings,        label: 'Configurações'    },
  { to: '/cliente/perfil',    icon: Tag,             label: 'Tipo de Loja'     },
];

function ini(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function Sidebar() {
  const { sessao, logout } = useAuth();
  const isSuperAdmin = sessao?.role === 'superadmin';
  const nav = isSuperAdmin ? NAV_SUPER : NAV_CLIENTE;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⬡</div>
        <div>
          <div className="sidebar-logo-nome">LojaMVP</div>
          <div className="sidebar-logo-sub">{isSuperAdmin ? 'Super Admin' : 'Minha Conta'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to.endsWith('/admin') || to.endsWith('/cliente')}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <Icon size={16} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{ini(sessao?.nome ?? 'U')}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-nome">{sessao?.nome}</div>
          <div className="sidebar-user-role">{sessao?.email}</div>
        </div>
        <button className="btn-ghost sidebar-logout" onClick={logout} title="Sair">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
