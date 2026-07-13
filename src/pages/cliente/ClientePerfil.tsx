import { useState, useEffect } from 'react';
import { Check, Lock } from 'lucide-react';
import { api } from '../../services/api';

interface Perfil {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  categorias: { id: string; nome: string; ordem: number }[];
  camposExtras: { id: string; chave: string; label: string; tipo: string; opcoes?: string; obrigatorio: boolean }[];
}

export function ClientePerfil() {
  const [perfis, setPerfis]       = useState<Perfil[]>([]);
  const [loading, setLoading]     = useState(true);
  const [perfilAtualId, setPerfilAtualId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Perfil[]>('/api/perfis').then(setPerfis).finally(() => setLoading(false));
    api.get<any>('/api/loja/situacao').then(res => setPerfilAtualId(res.perfilAtualId ?? null)).catch(() => {});
  }, []);

  if (loading) return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tipo de Loja</h1>
          <p className="page-subtitle">Perfil configurado na sua loja</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Lock size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          O perfil da sua loja já foi definido. Para alterar (o que atualiza categorias e módulos), fale com o suporte da AldevSoftware.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {perfis.map(p => {
          const ehAtual = p.id === perfilAtualId;
          return (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: perfilAtualId && !ehAtual ? 0.5 : 1, borderColor: ehAtual ? 'var(--accent-border)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius)',
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {p.icone}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.nome}
                    {ehAtual && <span className="badge badge-green" style={{ fontSize: 10 }}><Check size={10} style={{ verticalAlign: -1 }} /> Atual</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.descricao}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  Categorias
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {p.categorias.map(c => (
                    <span key={c.id} className="badge badge-accent" style={{ fontSize: 11 }}>{c.nome}</span>
                  ))}
                </div>
              </div>

              {p.camposExtras.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                    Campos extras
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {p.camposExtras.map(c => (
                      <div key={c.id} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--accent)' }}>+</span>
                        <strong>{c.label}</strong>
                        {c.opcoes && <span style={{ color: 'var(--text-3)' }}>({c.opcoes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}