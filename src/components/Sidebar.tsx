import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, LogOut, Settings, Tag, Menu, X, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './Sidebar.css';

const NAV_SUPER = [
  { to: '/admin',            icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/admin/lojas',      icon: Building2,       label: 'Lojas'       },
  { to: '/admin/pagamentos', icon: CreditCard,      label: 'Pagamentos'  },
];

const NAV_CLIENTE = [
  { to: '/cliente',          icon: LayoutDashboard, label: 'Minha Assinatura' },
  { to: '/cliente/faturas',  icon: CreditCard,      label: 'Faturas'          },
  { to: '/cliente/perfil',   icon: Tag,             label: 'Tipo de Loja'     },
  { to: '/cliente/config',   icon: Settings,        label: 'Configurações'    },
];

function ini(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function Sidebar() {
  const { sessao, logout } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const isSuperAdmin = sessao?.role === 'superadmin';
  const nav = isSuperAdmin ? NAV_SUPER : NAV_CLIENTE;

  return (
    <>
      {/* Topbar mobile */}
      <div className="mobile-topbar">
        <div className="sidebar-logo" style={{ padding: 0, border: 'none', margin: 0 }}>
          <img src="/logo-aldevsoftware-padrao.png" alt="AlDevSoftware" style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
          <div className="sidebar-logo-nome">AlDevSoftware</div>
        </div>
        <button className="btn-ghost" onClick={() => setAberto(v => !v)} style={{ padding: 8 }}>
          {aberto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay */}
      {aberto && <div className="sidebar-overlay" onClick={() => setAberto(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${aberto ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo-aldevsoftware-padrao.png" alt="AlDevSoftware" style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
          <div>
            <div className="sidebar-logo-nome">AlDevSoftware</div>
            <div className="sidebar-logo-sub">{isSuperAdmin ? 'Super Admin' : 'Minha Conta'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              end={to.endsWith('/admin') || to.endsWith('/cliente')}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setAberto(false)}>
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
          <button className="btn-ghost sidebar-logout" onClick={() => setModalSenha(true)} title="Trocar senha">
            <KeyRound size={14} />
          </button>
          <button className="btn-ghost sidebar-logout" onClick={logout} title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {modalSenha && <ModalTrocarSenha onClose={() => setModalSenha(false)} />}
    </>
  );
}

function ModalTrocarSenha({ onClose }: { onClose: () => void }) {
  const [atual, setAtual]   = useState('');
  const [nova, setNova]     = useState('');
  const [conf, setConf]     = useState('');
  const [erro, setErro]     = useState('');
  const [ok, setOk]         = useState(false);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setErro('');
    if (!atual || !nova) { setErro('Preencha todos os campos.'); return; }
    if (nova.length < 8) { setErro('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (nova !== conf) { setErro('A confirmação não confere.'); return; }
    setSaving(true);
    try {
      await api.post('/api/auth/trocar-senha', { senhaAtual: atual, novaSenha: nova });
      setOk(true);
      setTimeout(onClose, 1600);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Trocar senha</h2>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {ok ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
              <p style={{ color: 'var(--green)', fontWeight: 600 }}>Senha alterada com sucesso!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Senha atual</label>
                <input type="password" value={atual} onChange={e => setAtual(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Nova senha</label>
                <input type="password" value={nova} onChange={e => setNova(e.target.value)} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar nova senha</label>
                <input type="password" value={conf} onChange={e => setConf(e.target.value)} />
              </div>
              {erro && <p style={{ color: 'var(--red)', fontSize: 13 }}>{erro}</p>}
            </div>
          )}
        </div>
        {!ok && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}