import { createContext, useContext, useState, ReactNode } from 'react';
import { api } from '../services/api';
import { gravarSessao, lerSessaoBruta, limparSessao } from '../services/sessaoStorage';

interface Sessao {
  nome: string; email: string;
  role: 'superadmin' | 'admin' | 'operador';
  token: string;
  suporte?: boolean;    // superadmin vendo o painel de um cliente (aba de suporte)
  lojaNome?: string;
}

interface AuthCtx {
  sessao: Sessao | null;
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function salvar(s: Sessao) { gravarSessao(JSON.stringify(s)); }
function carregar(): Sessao | null {
  try { return JSON.parse(lerSessaoBruta() ?? 'null'); }
  catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(carregar);

  async function login(email: string, senha: string) {
    try {
      const res = await api.post<any>('/api/auth/login', { email, senha });
      const s: Sessao = { nome: res.nome, email: res.email, role: res.role, token: res.token };
      setSessao(s);
      salvar(s);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: (e as Error).message };
    }
  }

  function logout() {
    setSessao(null);
    limparSessao();
    window.location.href = '/login';
  }

  return <Ctx.Provider value={{ sessao, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
