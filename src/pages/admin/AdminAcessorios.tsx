import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Package, Settings } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  precoPromocional: number | null;
  estoque: number;
  categoria: string;
  imagensUrls: string | null;
  pesoKg: number | null;
  ativo: boolean;
  ordem: number;
}

interface CategoriaAcessorio {
  id: string;
  nome: string;
  chave: string;
  ordem: number;
}

const EMPTY = {
  nome: '', descricao: '', preco: 0, precoPromocional: '', estoque: 0,
  categoria: '', imagensUrls: '', pesoKg: '', ativo: true, ordem: 0,
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AdminAcessorios() {
  const { sucesso, erro } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAcessorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Produto | null>(null);

  const [modalCategorias, setModalCategorias] = useState(false);
  const [formCat, setFormCat] = useState('');
  const [editandoCat, setEditandoCat] = useState<CategoriaAcessorio | null>(null);
  const [confirmDelCat, setConfirmDelCat] = useState<CategoriaAcessorio | null>(null);

  function labelCategoria(chave: string) {
    return categorias.find(c => c.chave === chave)?.nome ?? chave;
  }

  async function carregar() {
    setLoading(true);
    try { setProdutos(await api.get<Produto[]>('/api/loja-acessorios/produtos/todos')); }
    finally { setLoading(false); }
  }

  function carregarCategorias() {
    api.get<CategoriaAcessorio[]>('/api/loja-acessorios/produtos/categorias').then(setCategorias).catch(() => {});
  }

  useEffect(() => { carregar(); carregarCategorias(); }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...EMPTY, categoria: categorias[0]?.chave ?? '' });
    setModal('novo');
  }

  function abrirNovaCategoria() {
    setEditandoCat(null);
    setFormCat('');
  }

  function abrirEditarCategoria(c: CategoriaAcessorio) {
    setEditandoCat(c);
    setFormCat(c.nome);
  }

  async function salvarCategoria() {
    if (!formCat.trim()) { erro('Digite o nome da categoria.'); return; }
    try {
      if (editandoCat) await api.put(`/api/loja-acessorios/produtos/categorias/${editandoCat.id}`, { nome: formCat.trim() });
      else await api.post('/api/loja-acessorios/produtos/categorias', { nome: formCat.trim() });
      carregarCategorias();
      abrirNovaCategoria();
      sucesso('Categoria salva!');
    } catch (e) {
      erro((e as Error).message);
    }
  }

  async function excluirCategoria() {
    if (!confirmDelCat) return;
    try {
      const res = await api.delete<any>(`/api/loja-acessorios/produtos/categorias/${confirmDelCat.id}`);
      carregarCategorias();
      setConfirmDelCat(null);
      sucesso(res?.mensagem ?? 'Categoria removida.');
    } catch (e) {
      erro((e as Error).message);
    }
  }

  function abrirEditar(p: Produto) {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: p.preco,
      precoPromocional: p.precoPromocional != null ? String(p.precoPromocional) : '',
      estoque: p.estoque,
      categoria: p.categoria,
      imagensUrls: p.imagensUrls ?? '',
      pesoKg: p.pesoKg != null ? String(p.pesoKg) : '',
      ativo: p.ativo,
      ordem: p.ordem,
    });
    setModal('editar');
  }

  async function salvar() {
    if (!form.nome.trim() || form.preco <= 0) {
      erro('Preencha nome e um preço válido.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        preco: form.preco,
        precoPromocional: form.precoPromocional ? parseFloat(form.precoPromocional) : null,
        estoque: form.estoque,
        categoria: form.categoria,
        imagensUrls: form.imagensUrls.trim() || null,
        pesoKg: form.pesoKg ? parseFloat(form.pesoKg) : null,
        ativo: form.ativo,
        ordem: form.ordem,
      };
      if (modal === 'novo') await api.post('/api/loja-acessorios/produtos', payload);
      else await api.put(`/api/loja-acessorios/produtos/${editandoId}`, payload);
      await carregar();
      setModal(null);
      sucesso('Produto salvo!');
    } catch (e) {
      erro((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    if (!confirmDel) return;
    try {
      await api.delete(`/api/loja-acessorios/produtos/${confirmDel.id}`);
      await carregar();
      setConfirmDel(null);
      sucesso('Produto excluído.');
    } catch (e) {
      erro((e as Error).message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loja de Acessórios</h1>
          <p className="page-subtitle">{produtos.length} produto(s) cadastrado(s)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => { abrirNovaCategoria(); setModalCategorias(true); }}>
            <Settings size={15} style={{ verticalAlign: -2 }} /> Categorias
          </button>
          <button className="btn-primary" onClick={abrirNovo}>
            <Plus size={15} style={{ verticalAlign: -2 }} /> Novo produto
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : produtos.length === 0 ? (
          <div className="empty"><Package size={32} /><p>Nenhum produto cadastrado ainda.</p></div>
        ) : (
          <>
            <div className="table-wrap admin-table-desktop">
              <table>
                <thead>
                  <tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {produtos.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.nome}</td>
                      <td><span className="badge badge-accent">{labelCategoria(p.categoria)}</span></td>
                      <td>
                        {p.precoPromocional ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-3)', fontSize: 12, marginRight: 6 }}>{fmt(p.preco)}</span>
                            {fmt(p.precoPromocional)}
                          </>
                        ) : fmt(p.preco)}
                      </td>
                      <td style={{ color: p.estoque === 0 ? 'var(--red)' : 'var(--text-2)' }}>{p.estoque}</td>
                      <td><span className={`badge ${p.ativo ? 'badge-green' : 'badge-red'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-ghost" title="Editar" onClick={() => abrirEditar(p)}><Edit2 size={13} /></button>
                          <button className="btn-ghost" style={{ color: 'var(--red)' }} title="Excluir" onClick={() => setConfirmDel(p)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-cards-mobile">
              {produtos.map(p => (
                <div key={p.id} className="admin-card-mobile">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.nome}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        <span className="badge badge-accent">{labelCategoria(p.categoria)}</span>
                        <span className={`badge ${p.ativo ? 'badge-green' : 'badge-red'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {fmt(p.precoPromocional ?? p.preco)} · Estoque: {p.estoque}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button className="btn-secondary" style={{ fontSize: 12, flex: 1 }} onClick={() => abrirEditar(p)}>
                      <Edit2 size={13} /> Editar
                    </button>
                    <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => setConfirmDel(p)}><Trash2 size={14} /></button>
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
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{modal === 'novo' ? 'Novo produto' : 'Editar produto'}</h2>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Leitor de código de barras USB" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Detalhes do produto, compatibilidade, etc." />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {categorias.map(c => <option key={c.id} value={c.chave}>{c.nome}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Preço (R$) *</label>
                    <input type="number" min={0} step={0.01} value={form.preco || ''}
                      onChange={e => setForm(f => ({ ...f, preco: +e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preço promocional <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
                    <input type="number" min={0} step={0.01} value={form.precoPromocional}
                      onChange={e => setForm(f => ({ ...f, precoPromocional: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Estoque *</label>
                    <input type="number" min={0} value={form.estoque || ''}
                      onChange={e => setForm(f => ({ ...f, estoque: +e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Peso (kg) <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(p/ frete futuro)</span></label>
                    <input type="number" min={0} step={0.001} value={form.pesoKg}
                      onChange={e => setForm(f => ({ ...f, pesoKg: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">URLs das imagens <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(separadas por vírgula, a primeira é a capa)</span></label>
                  <textarea rows={2} value={form.imagensUrls} onChange={e => setForm(f => ({ ...f, imagensUrls: e.target.value }))}
                    placeholder="https://.../foto1.jpg, https://.../foto2.jpg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ordem de exibição</label>
                  <input type="number" min={0} value={form.ordem}
                    onChange={e => setForm(f => ({ ...f, ordem: +e.target.value }))} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.ativo}
                    style={{ width: 16, height: 16, margin: 0 }}
                    onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                  <span>Produto ativo (visível na loja)</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : modal === 'novo' ? 'Criar produto' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categorias */}
      {modalCategorias && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCategorias(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Categorias de acessórios</h2>
              <button className="btn-ghost" onClick={() => setModalCategorias(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {categorias.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>Nenhuma categoria cadastrada.</p>
                ) : categorias.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13 }}>{c.nome}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" onClick={() => abrirEditarCategoria(c)}>Editar</button>
                      <button className="btn-ghost" style={{ color: 'var(--red)' }} onClick={() => setConfirmDelCat(c)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{editandoCat ? 'Editar categoria' : 'Nova categoria'}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1 }} value={formCat} onChange={e => setFormCat(e.target.value)} placeholder="Ex: Balanças" />
                  <button className="btn-primary" onClick={salvarCategoria}>{editandoCat ? 'Salvar' : 'Adicionar'}</button>
                  {editandoCat && <button className="btn-secondary" onClick={abrirNovaCategoria}>Cancelar</button>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalCategorias(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão de categoria */}
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
                Se já tiver produtos usando essa categoria, ela será apenas desativada em vez de excluída.
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
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>Excluir produto</h2>
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
                Excluir <strong style={{ color: 'var(--text-1)' }}>{confirmDel.nome}</strong>?
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