import { useState, useEffect, useRef } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { api } from '../../services/api';

const CLOUDINARY_CLOUD = 'dnwnwshvq';
const CLOUDINARY_PRESET = 'loja-logos';

export function ClienteConfig() {
  const [form, setForm]           = useState({ nome: '', corPrimaria: '#6366f1', logoUrl: '' });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ok, setOk]               = useState(false);
  const [erro, setErro]           = useState('');
  const fileRef                   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<any>('/api/cliente/config').then(res => {
      setForm({ nome: res.nome, corPrimaria: res.corPrimaria, logoUrl: res.logoUrl ?? '' });
    }).finally(() => setLoading(false));
  }, []);

  async function uploadLogo(file: File) {
    setUploading(true); setErro('');
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', CLOUDINARY_PRESET);
      data.append('folder', 'logos');

      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Erro no upload');
      setForm(f => ({ ...f, logoUrl: json.secure_url }));
    } catch (e) {
      setErro('Erro ao fazer upload: ' + (e as Error).message);
    } finally { setUploading(false); }
  }

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

          {/* Logo */}
          <div className="form-group">
            <label className="form-label">Logo da loja</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', background: 'var(--bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {form.logoUrl
                  ? <img src={form.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 28 }}>✦</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {uploading
                    ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Enviando...</>
                    : <><Upload size={14} /> Upload da logo</>}
                </button>
                {form.logoUrl && (
                  <button className="btn-ghost" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
                    <X size={12} /> Remover logo
                  </button>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>PNG, JPG ou SVG. Recomendado: 200x200px</p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label className="form-label">Nome da loja</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Aparece na tela de login e no topo do sistema.</p>
          </div>

          {/* Cor */}
          <div className="form-group">
            <label className="form-label">Cor principal</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.corPrimaria}
                onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                style={{ width: 48, height: 40, padding: 2, flex: 'none' }} />
              <input value={form.corPrimaria}
                onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                placeholder="#6366f1" />
            </div>
            <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: form.corPrimaria, opacity: .8 }} />
          </div>

          {erro && <p style={{ color: 'var(--red)', fontSize: 13 }}>{erro}</p>}
          {ok   && <p style={{ color: 'var(--green)', fontSize: 13 }}>✓ Configurações salvas!</p>}

          <button className="btn-primary" onClick={salvar} disabled={saving}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={15} /> {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}