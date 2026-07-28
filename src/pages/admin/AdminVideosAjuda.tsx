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
  modulosRelacionados: string | null;
}

const MODULOS_DISPONIVEIS = [
  { chave: 'produtos', label: 'Produtos' },
  { chave: 'servicos', label: 'Serviços' },
  { chave: 'turmas', label: 'Turmas' },
  { chave: 'corretora', label: 'Corretora' },
  { chave: 'financeiro', label: 'Financeiro' },
  { chave: 'nf', label: 'Importação de NF' },
  { chave: 'funcionarios', label: 'Funcionários' },
  { chave: 'chacara_reservas', label: 'Chácara Reservas' },
];

const EMPTY = { titulo: '', categoria: '', youtubeId: '', ordem: 0, ativo: true };

export function AdminVideosAjuda() {
  const { sucesso, erro } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduloSelecionado, setModuloSelecionado] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [paginaLista, setPaginaLista] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);

  const [modalCategorias, setModalCategorias] = useState(false);
  const [formCat, setFormCat] = useState({ nome: '', ordem: 0, ativa: true, modulosRelacionados: [] as string[] });
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

  function mudarModulo(modulo: string) {
    setModuloSelecionado(modulo);
    setFiltroCategoria('todas');
  }

  useEffect(() => { carregar(); carregarCategorias(); }, []);
  useEffect(() => { setPaginaLista(1); }, [filtroCategoria, itensPorPagina]);

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
    setFormCat({ nome: '', ordem: 0, ativa: true, modulosRelacionados: [] });
  }

  function abrirEditarCategoria(c: Categoria) {
    setEditandoCat(c);
    setFormCat({
      nome: c.nome, ordem: c.ordem, ativa: c.ativa,
      modulosRelacionados: c.modulosRelacionados ? c.modulosRelacionados.split(',').filter(Boolean) : [],
    });
  }

  async function salvarCategoria() {
    if (!formCat.nome.trim()) { erro('Digite o nome da categoria.'); return; }
    try {
      const payload = { ...formCat, modulosRelacionados: formCat.modulosRelacionados.join(',') || null };
      if (editandoCat) await api.put(`/api/categorias-video-ajuda/${editandoCat.id}`, payload);
      else await api.post('/api/categorias-video-ajuda', payload);
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

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / itensPorPagina));
  const paginaAtual = Math.min(paginaLista, totalPaginas);
  const listaPaginada = listaFiltrada.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  // Só lista módulos que realmente têm alguma categoria vinculada, mais "Geral" se aplicável
  const modulosComCategoria = MODULOS_DISPONIVEIS.filter(m =>
    categorias.some(c => c.modulosRelacionados?.split(',').includes(m.chave))
  );
  const temGeral = categorias.some(c => !c.modulosRelacionados);

  // Categorias visíveis no segundo select, de acordo com o módulo escolhido no primeiro
  const categoriasDoModulo = moduloSelecionado === 'todos'
    ? categorias
    : moduloSelecionado === 'geral'
    ? categorias.filter(c => !c.modulosRelacionados)
    : categorias.filter(c => c.modulosRelacionados?.split(',').includes(moduloSelecionado));

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

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: 200 }}>
          <label className="form-label">Módulo</label>
          <select value={moduloSelecionado} onChange={e => mudarModulo(e.target.value)}>
            <option value="todos">Todos os módulos</option>
            {modulosComCategoria.map(m => <option key={m.chave} value={m.chave}>{m.label}</option>)}
            {temGeral && <option value="geral">Geral (todas as lojas)</option>}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 200 }}>
          <label className="form-label">Tela</label>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="todas">Todas</option>
            {categoriasDoModulo.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </div>
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
                {listaPaginada.map(v => (
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
            {listaPaginada.map(v => (
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

      {!loading && listaFiltrada.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          <select value={itensPorPagina} onChange={e => setItensPorPagina(parseInt(e.target.value))} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
            <option value={15}>15 por página</option>
            <option value={30}>30 por página</option>
            <option value={50}>50 por página</option>
          </select>
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn-secondary" disabled={paginaAtual <= 1} onClick={() => setPaginaLista(p => Math.max(1, p - 1))} style={{ padding: '4px 10px' }}>Anterior</button>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{paginaAtual} / {totalPaginas}</span>
              <button className="btn-secondary" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaLista(p => Math.min(totalPaginas, p + 1))} style={{ padding: '4px 10px' }}>Próxima</button>
            </div>
          )}
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

                  <div className="form-group">
                    <label className="form-label">Aparece para lojas com <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(vazio = todas)</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {MODULOS_DISPONIVEIS.map(m => {
                        const marcado = formCat.modulosRelacionados.includes(m.chave);
                        return (
                          <button key={m.chave} type="button"
                            className={marcado ? 'btn-primary' : 'btn-secondary'}
                            style={{ fontSize: 11, padding: '5px 10px' }}
                            onClick={() => setFormCat(f => ({
                              ...f,
                              modulosRelacionados: marcado
                                ? f.modulosRelacionados.filter(x => x !== m.chave)
                                : [...f.modulosRelacionados, m.chave],
                            }))}>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
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