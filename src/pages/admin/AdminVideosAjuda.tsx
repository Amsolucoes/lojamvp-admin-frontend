import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Play } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface Video {
  id: string;
  titulo: string;
  categoria: string;
  youtubeId: string;
  ordem: number;
  ativo: boolean;
}

const CATEGORIAS = [
  'Produtos', 'Caixa', 'Estoque', 'Clientes', 'Financeiro',
  'Agenda', 'Planos', 'Turmas', 'Corretora', 'Importação de NF',
];

const EMPTY = { titulo: '', categoria: CATEGORIAS[0], youtubeId: '', ordem: 0, ativo: true };

export function AdminVideosAjuda() {
  const { sucesso, erro } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Video | null>(null);

  async function carregar() {
    setLoading(true);
    try { setVideos(await api.get<Video[]>('/api/videos-ajuda/todos')); }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...EMPTY, categoria: filtroCategoria !== 'todas' ? filtroCategoria : CATEGORIAS[0] });
    setModal('novo');
  }

  function abrirEditar(v: Video) {
    setEditandoId(v.id);
    setForm({ titulo: v.titulo, categoria: v.categoria, youtubeId: v.youtubeId, ordem: v.ordem, ativo: v.ativo });
    setModal('editar');
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.youtubeId.trim()) {
      erro('Preencha título e o link/ID do YouTube.');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'novo') await api.post('/api/videos-ajuda', form);
      else await api.put(`/api/videos-ajuda/${editandoId}`, form);
      await carregar();
      setModal(null);
      sucesso('Vídeo salvo!');
    } catch (e) {
      erro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function alternarAtivo(v: Video) {
    try {
      await api.patch(`/api/videos-ajuda/${v.id}/ativo`, {});
      await carregar();
    } catch (e) {
      erro((e as Error).message);
    }
  }

  async function excluir() {
    if (!confirmDel) return;
    try {
      await api.delete(`/api/videos-ajuda/${confirmDel.id}`);
      await carregar();
      setConfirmDel(null);
      sucesso('Vídeo excluído.');
    } catch (e) {
      erro((e as Error).message);
    }
  }

  const listaFiltrada = filtroCategoria === 'todas'
    ? videos
    : videos.filter(v => v.categoria === filtroCategoria);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vídeos da Central de Ajuda</h1>
          <p className="page-subtitle">{videos.length} vídeo(s) cadastrado(s)</p>
        </div>
        <button className="btn-primary" onClick={abrirNovo}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> Novo vídeo
        </button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className={filtroCategoria === 'todas' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }}
          onClick={() => setFiltroCategoria('todas')}>Todas</button>
        {CATEGORIAS.map(cat => (
          <button key={cat} className={filtroCategoria === cat ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }}
            onClick={() => setFiltroCategoria(cat)}>{cat}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : listaFiltrada.length === 0 ? (
          <div className="empty"><Play size={32} /><p>Nenhum vídeo cadastrado ainda.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Título</th><th>Categoria</th><th>YouTube ID</th><th>Ordem</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {listaFiltrada.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.titulo}</td>
                    <td><span className="badge badge-accent">{v.categoria}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.youtubeId}</td>
                    <td>{v.ordem}</td>
                    <td>
                      <span className={`badge ${v.ativo ? 'badge-green' : 'badge-red'}`}>{v.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" title="Editar" onClick={() => abrirEditar(v)}><Edit2 size={13} /></button>
                        <button className="btn-ghost" title={v.ativo ? 'Desativar' : 'Ativar'} onClick={() => alternarAtivo(v)}>
                          {v.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="btn-ghost" style={{ color: 'var(--red)' }} title="Excluir" onClick={() => setConfirmDel(v)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal novo/editar */}
      {(modal === 'novo' || modal === 'editar') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{modal === 'novo' ? 'Novo vídeo' : 'Editar vídeo'}</h2>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Criar Produto Com Grade" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Link ou ID do YouTube *</label>
                  <input value={form.youtubeId} onChange={e => setForm(f => ({ ...f, youtubeId: e.target.value }))}
                    placeholder="Cole o link completo ou só o ID" />
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    Aceita link completo (youtube.com/watch?v=... ou youtu.be/...) ou só o ID.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Ordem de exibição</label>
                  <input type="number" min={0} value={form.ordem}
                    onChange={e => setForm(f => ({ ...f, ordem: +e.target.value }))} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.ativo}
                    style={{ width: 16, height: 16, margin: 0 }}
                    onChange={e => setForm(f => ({ ...f, ativo: e.target.checked === true }))} />
                  <span>Vídeo ativo (visível pros clientes)</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : modal === 'novo' ? 'Criar vídeo' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDel && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>Excluir vídeo</h2>
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
                Excluir <strong style={{ color: 'var(--text-1)' }}>{confirmDel.titulo}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn-danger" onClick={excluir}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}