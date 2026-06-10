import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../services/api';

export function ClienteConfig() {
  const [form, setForm]     = useState({ nome: '', corPrimaria: '#6366f1', logoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk]         = useState(false);
  const [erro, setErro]     = useState('');

  useEffect(() => {
    api.get<any>('/api/cliente/config').then(res => {
      setForm({ nome: res.nome, corPrimaria: res.corPrimaria, logoUrl: res.logoUrl ?? '' });
    }).finally(() => setLoading(false));
  }, []);

  async function salvar() {
    setSaving(true); setErro(''); setOk(false);
    try {
      await api.patch('/api/cliente/config', form);
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) { setErro((e as Error).message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Personalize sua loja</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Nome da loja</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Aparece na tela de login e no topo do sistema.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Cor principal</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.corPrimaria} onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))} style={{ width: 48, height: 40, padding: 2, flex: 'none' }} />
              <input value={form.corPrimaria} onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))} placeholder="#6366f1" />
            </div>
            <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: form.corPrimaria, opacity: .8 }} />
          </div>

          <div className="form-group">
            <label className="form-label">URL da logo <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
            <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Cole o link de uma imagem hospedada (ex: Imgur, Google Drive).</p>
          </div>

          {erro && <p style={{ color: 'var(--red)', fontSize: 13 }}>{erro}</p>}
          {ok   && <p style={{ color: 'var(--green)', fontSize: 13 }}>✓ Configurações salvas!</p>}

          <button className="btn-primary" onClick={salvar} disabled={saving} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={15} /> {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}
