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
  const [emailForm, setEmailForm] = useState({ novoEmail: '', senhaAtual: '' });
  const [trocandoEmail, setTrocandoEmail] = useState(false);
  const [emailOk, setEmailOk] = useState('');
  const [emailErro, setEmailErro] = useState('');
  const [agConfig, setAgConfig] = useState({ ativo: false, confirmacao: 'aprovacao', slug: '' });
  const [salvandoAg, setSalvandoAg] = useState(false);
  const [agOk, setAgOk] = useState('');
  const [agErro, setAgErro] = useState('');
  const [temServicos, setTemServicos] = useState(false);
  const [modulosAtivos, setModulosAtivos] = useState<string[]>([]);
  const [modulosDisponiveis, setModulosDisponiveis] = useState<{ chave: string; nome: string; valor: number; disponivelParaAtivar: boolean }[]>([]);
  const [alternandoModulo, setAlternandoModulo] = useState<string | null>(null);
  const [confirmDesativar, setConfirmDesativar] = useState<{ chave: string; nome: string } | null>(null);

  useEffect(() => {
    api.get<any>('/api/cliente/config').then(res => {
      setForm({ nome: res.nome, corPrimaria: res.corPrimaria, logoUrl: res.logoUrl ?? '' });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<any>('/api/loja/situacao').then(res => {
      setAgConfig({
        ativo: res.agendamentoOnlineAtivo ?? false,
        confirmacao: res.agendamentoOnlineConfirmacao ?? 'aprovacao',
        slug: res.slug ?? '',
      });
      setTemServicos((res.modulosAtivos ?? []).includes('servicos'));
      setModulosAtivos(res.modulosAtivos ?? []);
    }).catch(() => {});

    api.get<any[]>('/api/modulos-preco').then(setModulosDisponiveis).catch(() => {});
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

  async function trocarEmail() {
    setEmailErro(''); setEmailOk('');
    if (!emailForm.novoEmail.trim() || !emailForm.senhaAtual) {
      setEmailErro('Preencha o novo e-mail e sua senha atual.');
      return;
    }
    setTrocandoEmail(true);
    try {
      await api.patch('/api/cliente/email', emailForm);
      setEmailOk('E-mail atualizado! Use o novo e-mail no próximo login.');
      setEmailForm({ novoEmail: '', senhaAtual: '' });
    } catch (e) {
      setEmailErro((e as Error).message);
    } finally {
      setTrocandoEmail(false);
    }
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

  async function salvarAgendamento() {
    setAgErro(''); setAgOk('');
    if (agConfig.ativo && !agConfig.slug.trim()) {
      setAgErro('Defina um link (slug) antes de ativar.');
      return;
    }
    setSalvandoAg(true);
    try {
      const res = await api.patch<any>('/api/loja/agendamento-online', {
        ativo: agConfig.ativo,
        confirmacao: agConfig.confirmacao,
        slug: agConfig.slug.trim() || null,
      });
      setAgConfig({
        ativo: res.agendamentoOnlineAtivo,
        confirmacao: res.agendamentoOnlineConfirmacao,
        slug: res.slug ?? '',
      });
      setAgOk('Configuração salva!');
      setTimeout(() => setAgOk(''), 3000);
    } catch (e) {
      setAgErro((e as Error).message);
    } finally {
      setSalvandoAg(false);
    }
  }

  async function alternarModulo(chave: string, nome: string, ativar: boolean) {
    setAlternandoModulo(chave);
    try {
      const res = await api.patch<any>('/api/loja/modulos', { chave, ativar });
      setModulosAtivos((res.modulosAtivos ?? '').split(',').filter(Boolean));
      setConfirmDesativar(null);
    } catch (e) {
      alert('Erro: ' + (e as Error).message); // substitua por seu padrão de toast se preferir
    } finally {
      setAlternandoModulo(null);
    }
  }

  function pedirDesativacao(chave: string, nome: string) {
    setConfirmDesativar({ chave, nome });
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

      {/* Trocar e-mail de login */}
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>E-mail de acesso</div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              ⚠️ Ao trocar, você passará a entrar no sistema com o novo e-mail.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Novo e-mail</label>
            <input type="email" value={emailForm.novoEmail}
              onChange={e => setEmailForm(f => ({ ...f, novoEmail: e.target.value }))}
              placeholder="novo@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Sua senha atual</label>
            <input type="password" value={emailForm.senhaAtual}
              onChange={e => setEmailForm(f => ({ ...f, senhaAtual: e.target.value }))}
              placeholder="Confirme com sua senha" />
          </div>
          {emailErro && <p style={{ color: 'var(--red)', fontSize: 13 }}>{emailErro}</p>}
          {emailOk && <p style={{ color: 'var(--green)', fontSize: 13 }}>✓ {emailOk}</p>}
          <button className="btn-secondary" onClick={trocarEmail} disabled={trocandoEmail}
            style={{ alignSelf: 'flex-start' }}>
            {trocandoEmail ? 'Trocando...' : 'Trocar e-mail'}
          </button>
        </div>
      </div>

      {/* Agendamento online */}
      {temServicos && (
        <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Agendamento online</div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                Deixe seus clientes agendarem sozinhos por um link. Divulgue no Instagram, WhatsApp, onde quiser.
              </p>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={agConfig.ativo}
                style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                onChange={e => setAgConfig(c => ({ ...c, ativo: e.target.checked }))} />
              <span>Ativar agendamento online</span>
            </label>

            <div className="form-group">
              <label className="form-label">Seu link personalizado</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>app.aldevsoftware.com.br/agendar/</span>
                <input value={agConfig.slug}
                  onChange={e => setAgConfig(c => ({ ...c, slug: e.target.value }))}
                  placeholder="minha-loja" style={{ flex: 1, minWidth: 140 }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                Use letras, números e hífens. Ex: banho-da-ana
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Quando o cliente agenda</label>
              <select value={agConfig.confirmacao}
                onChange={e => setAgConfig(c => ({ ...c, confirmacao: e.target.value }))}>
                <option value="aprovacao">Preciso aprovar cada agendamento</option>
                <option value="automatico">Confirmar automaticamente</option>
              </select>
            </div>

            {agConfig.ativo && agConfig.slug && (
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, wordBreak: 'break-all' }}>
                  app.aldevsoftware.com.br/agendar/{agConfig.slug}
                </span>
                <button className="btn-ghost" style={{ flexShrink: 0, fontSize: 12 }}
                  onClick={() => navigator.clipboard.writeText(`https://app.aldevsoftware.com.br/agendar/${agConfig.slug}`)}>
                  Copiar
                </button>
              </div>
            )}

            {agErro && <p style={{ color: 'var(--red)', fontSize: 13 }}>{agErro}</p>}
            {agOk && <p style={{ color: 'var(--green)', fontSize: 13 }}>✓ {agOk}</p>}

            <button className="btn-primary" onClick={salvarAgendamento} disabled={salvandoAg}
              style={{ alignSelf: 'flex-start' }}>
              {salvandoAg ? 'Salvando...' : 'Salvar agendamento online'}
            </button>
          </div>
        </div>
        )}

      {/* Módulos */}
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Módulos</div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              Ative recursos extras para sua loja. O valor entra na sua próxima fatura.
            </p>
          </div>

          {modulosDisponiveis.filter(m => m.disponivelParaAtivar).map(m => {
            const ativo = modulosAtivos.includes(m.chave);
            return (
              <div key={m.chave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.valor > 0 ? `+R$${m.valor.toFixed(2).replace('.', ',')}/mês` : 'Incluso'}</div>
                </div>
                {ativo ? (
                  <button className="btn-secondary" style={{ fontSize: 12 }}
                    disabled={alternandoModulo === m.chave}
                    onClick={() => pedirDesativacao(m.chave, m.nome)}>
                    Ativo — desativar
                  </button>
                ) : (
                  <button className="btn-primary" style={{ fontSize: 12 }}
                    disabled={alternandoModulo === m.chave}
                    onClick={() => alternarModulo(m.chave, m.nome, true)}>
                    {alternandoModulo === m.chave ? 'Ativando...' : 'Ativar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmar desativação */}
      {confirmDesativar && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDesativar(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>Desativar módulo</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
                Tem certeza que deseja desativar <strong style={{ color: 'var(--text-1)' }}>{confirmDesativar.nome}</strong>?
                Você perde acesso às telas e funções desse módulo imediatamente. Os dados já cadastrados não são apagados, mas ficam inacessíveis até reativar.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDesativar(null)}>Cancelar</button>
              <button className="btn-danger"
                disabled={alternandoModulo === confirmDesativar.chave}
                onClick={() => alternarModulo(confirmDesativar.chave, confirmDesativar.nome, false)}>
                {alternandoModulo === confirmDesativar.chave ? 'Desativando...' : 'Desativar mesmo assim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}