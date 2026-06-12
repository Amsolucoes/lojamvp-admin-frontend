import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
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
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [sucesso, setSucesso]     = useState<string | null>(null);
  const [erro, setErro]           = useState('');

  useEffect(() => {
    api.get<Perfil[]>('/api/perfis').then(setPerfis).finally(() => setLoading(false));
  }, []);

  async function aplicar(perfilId: string, nomePerfil: string) {
    setAplicando(perfilId); setErro(''); setSucesso(null);
    try {
      await api.post('/api/perfis/aplicar', { perfilLojaId: perfilId });
      setSucesso(nomePerfil);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAplicando(null);
    }
  }

  if (loading) return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tipo de Loja</h1>
          <p className="page-subtitle">Escolha o perfil que melhor representa sua loja</p>
        </div>
      </div>

      {sucesso && (
        <div style={{
          background: 'var(--green-bg)', border: '1px solid rgba(74,222,128,.2)',
          borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)',
        }}>
          <Check size={16} />
          Perfil <strong>{sucesso}</strong> aplicado! As categorias do seu cadastro de produtos foram atualizadas.
        </div>
      )}

      {erro && (
        <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{erro}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {perfis.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius)',
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>
                {p.icone}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.descricao}</div>
              </div>
            </div>

            {/* Categorias */}
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

            {/* Campos extras */}
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

            {/* Botão */}
            <button
              className="btn-primary"
              style={{ marginTop: 'auto' }}
              onClick={() => aplicar(p.id, p.nome)}
              disabled={aplicando === p.id}
            >
              {aplicando === p.id ? 'Aplicando...' : `Usar ${p.nome}`}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20, padding: '14px 18px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          💡 <strong style={{ color: 'var(--text-2)' }}>Dica:</strong> Ao aplicar um perfil, as categorias do seu cadastro de produtos serão atualizadas automaticamente. Você pode trocar de perfil a qualquer momento.
        </p>
      </div>
    </div>
  );
}