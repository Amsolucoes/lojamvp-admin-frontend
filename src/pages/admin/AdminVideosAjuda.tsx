import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Play, Tag } from 'lucide-react';
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

interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
}

const EMPTY = { titulo: '', categoria: '', youtubeId: '', ordem: 0, ativo: true };

export function AdminVideosAjuda() {
  const { sucesso, erro } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  const [modalCategorias, setModalCategorias] = useState(false);
  const [formCat, setFormCat] = useState({ nome: '', ordem: 0, ativa: true });
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null);
  const [confirmDelCat, setConfirmDelCat] = useState<Categoria | null>(null);
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

  function carregarCategorias() {
    api.get<Categoria[]>('/api/categorias-video-ajuda/todas').then(setCategorias).catch(() => {});
  }

  useEffect(() => { carregar(); carregarCategorias(); }, []);

  function abrirNovo() {
    setEditandoId(null);
    const categoriasAtivas = categorias.filter(c => c.ativa);
    setForm({ ...EMPTY, categoria: filtroCategoria !== 'todas' ? filtroCategoria : (categoriasAtivas[0]?.nome ?? '') });
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

  function abrirNovaCategoria() {
    setEditandoCat(null);
    setFormCat({ nome: '', ordem: 0, ativa: true });
  }

  function abrirEditarCategoria(c: Categoria) {
    setEditandoCat(c);
    setFormCat({ nome: c.nome, ordem: c.ordem, ativa: c.ativa });
  }

  async function salvarCategoria() {
    if (!formCat.nome.trim()) { erro('Digite o nome da categoria.'); return; }
    try {
      if (editandoCat) await api.put(`/api/categorias-video-ajuda/${editandoCat.id}`, formCat);
      else await api.post('/api/categorias-video-ajuda', formCat);
      carregarCategorias();
      await carregar(); // recarrega vídeos, caso o nome da categoria tenha mudado
      abrirNovaCategoria();
      sucesso('Categoria salva!');
    } catch (e) {
      erro((e as Error).message);
    }
  }

  async function excluirCategoria() {
    if (!confirmDelCat) return;
    try {
      const res = await api.delete<any>(`/api/categorias-video-ajuda/${confirmDelCat.id}`);
      carregarCategorias();
      setConfirmDelCat(null);
      sucesso(res?.mensagem ?? 'Categoria removida.');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => { abrirNovaCategoria(); setModalCategorias(true); }}>
            <Tag size={15} style={{ verticalAlign: -2 }} /> Categorias
          </button>
          <button className="btn-primary" onClick={abrirNovo}>
            <Plus size={15} style={{ verticalAlign: -2 }} /> Novo vídeo
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className={filtroCategoria === 'todas' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }}
          onClick={() => setFiltroCategoria('todas')}>Todas</button>
        {categorias.map(cat => (
          <button key={cat.id} className={filtroCategoria === cat.nome ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }}
            onClick={() => setFiltroCategoria(cat.nome)}>{cat.nome}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : listaFiltrada.length === 0 ? (
          <div className="empty"><Play size={32} /><p>Nenhum vídeo cadastrado ainda.</p></div>
        ) : (
          <>
          <div className="table-wrap admin-table-desktop">
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

          <div className="admin-cards-mobile">
            {listaFiltrada.map(v => (
              <div key={v.id} className="admin-card-mobile">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{v.titulo}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <span className="badge badge-accent">{v.categoria}</span>
                      <span className={`badge ${v.ativo ? 'badge-green' : 'badge-red'}`}>{v.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                      ID: {v.youtubeId} · Ordem: {v.ordem}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="btn-secondary" style={{ fontSize: 12, flex: 1 }} onClick={() => abrirEditar(v)}>
                    <Edit2 size={13} /> Editar
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12, flex: 1 }} onClick={() => alternarAtivo(v)}>
                    {v.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button className="btn-ghost" style={{ color: 'var(--red)' }} title="Excluir" onClick={() => setConfirmDel(v)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
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
                    <option value="">Selecione...</option>
                    {categorias.filter(c => c.ativa).map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
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

      {/* Modal gestão de categorias */}
      {modalCategorias && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCategorias(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Categorias de vídeo</h2>
              <button className="btn-ghost" onClick={() => setModalCategorias(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {categorias.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>Nenhuma categoria cadastrada.</p>
                ) : categorias.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, opacity: c.ativa ? 1 : 0.5 }}>
                    <span style={{ fontSize: 13 }}>{c.nome} {!c.ativa && <span style={{ color: 'var(--text-3)', fontSize: 11 }}>(inativa)</span>}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" onClick={() => abrirEditarCategoria(c)}>Editar</button>
                      <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => setConfirmDelCat(c)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{editandoCat ? 'Editar categoria' : 'Nova categoria'}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={formCat.nome} onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Corretora" />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" min={0} value={formCat.ordem} style={{ width: 90 }}
                      onChange={e => setFormCat(f => ({ ...f, ordem: +e.target.value }))} placeholder="Ordem" />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={formCat.ativa} style={{ width: 16, height: 16, margin: 0 }}
                        onChange={e => setFormCat(f => ({ ...f, ativa: e.target.checked }))} />
                      Ativa
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={salvarCategoria}>
                      {editandoCat ? 'Salvar alterações' : 'Adicionar categoria'}
                    </button>
                    {editandoCat && <button className="btn-secondary" onClick={abrirNovaCategoria}>Cancelar</button>}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalCategorias(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão categoria */}
      {confirmDelCat && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelCat(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>Excluir categoria</h2>
              <button className="btn-ghost" onClick={() => setConfirmDelCat(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
                Excluir <strong style={{ color: 'var(--text-1)' }}>{confirmDelCat.nome}</strong>?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                Se houver vídeos usando essa categoria, ela será apenas desativada em vez de excluída.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDelCat(null)}>Cancelar</button>
              <button className="btn-danger" onClick={excluirCategoria}>Excluir</button>
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