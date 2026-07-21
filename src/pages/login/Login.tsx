import { useState, FormEvent } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [senha, setSenha]       = useState('');
  const [mostra, setMostra]     = useState(false);
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [nomeLoja, setNomeLoja] = useState('AlDevSoftware');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return; }
    setErro(''); setLoading(true);
    const res = await login(email, senha);
    setLoading(false);
    if (!res.ok) setErro(res.erro ?? 'Erro ao fazer login.');
  }

  return (
    <div className="login-bg">
      <div className="login-orb-1" /><div className="login-orb-2" />
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">⬡</div>
          <div>
            <div className="login-logo-nome">{nomeLoja}</div>
            <div className="login-logo-sub">Painel de Controle</div>
          </div>
        </div>
        <h1 className="login-title">Entrar</h1>
        <p className="login-sub">Acesse com suas credenciais de administrador ou cliente.</p>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro(''); }}
              placeholder="seu@email.com" autoFocus disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="senha-wrap">
              <input type={mostra ? 'text' : 'password'} value={senha}
                onChange={e => { setSenha(e.target.value); setErro(''); }}
                placeholder="••••••••" disabled={loading} />
              <button type="button" className="olho" onClick={() => setMostra(v => !v)}>
                {mostra ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {erro && <div className="login-erro"><AlertCircle size={14} />{erro}</div>}
          <button type="submit" className={`btn-primary login-btn${loading ? ' loading' : ''}`} disabled={loading}>
            {loading ? <span className="spinner" /> : <><LogIn size={15} /> Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
