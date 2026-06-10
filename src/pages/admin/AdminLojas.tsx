import { useState, useEffect } from 'react';
import { Plus, Edit2, Lock, Unlock, X, Search, Building2 } from 'lucide-react';
import { api, Loja } from '../../services/api';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

const STATUS_BADGE: Record<string, string> = {
  Ativo: 'badge-green', Trial: 'badge-blue',
  Bloqueado: 'badge-red', Cancelado: 'badge-red',
};

type ModalTipo = 'nova' | 'editar' | 'pagamento' | null;

const EMPTY_LOJA = {
  nome: '', email: '', cnpj: '', cpf: '', telefone: '',
  corPrimaria: '#6366f1', mensalidadeDia: 10, mensalidadeValor: 120,
  adminNome: '', adminEmail: '', adminSenha: '',
};

export function AdminLojas() {
  const [lojas, setLojas]     = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca]     = useState('');
  const [modal, setModal]     = useState<ModalTipo>(null);
  const [selecionada, setSel] = useState<Loja | null>(null);
  const [form, setForm]       = useState<any>(EMPTY_LOJA);
  const [pagForm, setPagForm] = useState({ valor: '', vencimento: '', pagoEm: new Date().toISOString().slice(0,10), forma: 'pix', obs: '' });
  const [erro, setErro]       = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try { setLojas(await api.get<Loja[]>('/api/admin/lojas')); }
    finally { setLoading(false); }
  }

  async function salvarLoja() {
    if (!form.nome || !form.email) { setErro('Nome e e-mail são obrigatórios.'); return; }
    setSaving(true); setErro('');
    try {
      if (modal === 'nova') {
        if (!form.adminNome || !form.adminEmail || !form.adminSenha) {
          setErro('Dados do administrador são obrigatórios.'); setSaving(false); return;
        }
        await api.post('/api/admin/lojas', form);
      } else {
        await api.put(`/api/admin/lojas/${selecionada!.id}`, form);
      }
      await carregar();
      setModal(null);
    } catch (e) { setErro((e as Error).message); }
    finally { setSaving(false); }
  }

  async function alterarStatus(loja: Loja, status: string) {
    await api.patch(`/api/admin/lojas/${loja.id}/status`, { status });
    await carregar();
  }

  async function registrarPagamento() {
    if (!pagForm.valor || !pagForm.vencimento) { setErro('Preencha valor e vencimento.'); return; }
    setSaving(true); setErro('');
    try {
      await api.post('/api/admin/pagamentos', {
        lojaId: selecionada!.id,
        valor: parseFloat(pagForm.valor),
        vencimento: pagForm.vencimento,
        pagoEm: pagForm.pagoEm,
        formaPagamento: pagForm.forma,
        observacao: pagForm.obs,
      });
      await carregar();
      setModal(null);
    } catch (e) { setErro((e as Error).message); }
    finally { setSaving(false); }
  }

  const lista = lojas.filter(l =>
    l.nome.toLowerCase().includes(busca.toLowerCase()) ||
    l.email.includes(busca) ||
    (l.cnpj ?? '').includes(busca)
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lojas</h1>
          <p className="page-subtitle">{lojas.length} loja(s) cadastrada(s)</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_LOJA); setErro(''); setModal('nova'); }}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> Nova loja
        </button>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 320, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input style={{ paddingLeft: 32 }} placeholder="Buscar por nome, e-mail ou CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : lista.length === 0 ? (
          <div className="empty"><Building2 size={32} /><p>Nenhuma loja encontrada.</p></div>
        ) : (
          <table>
            <thead>
              <tr><th>Loja</th><th>Status</th><th>Próx. Vencimento</th><th>Mensalidade</th><th>Atraso</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {lista.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{l.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.email}</div>
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-accent'}`}>{l.status}</span></td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                    {l.proximoVencimento ? new Date(l.proximoVencimento).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ fontWeight: 500 }}>{fmt(l.mensalidadeValor)}</td>
                  <td>
                    {l.emAtraso
                      ? <span className="badge badge-yellow">{l.diasAtraso}d atraso</span>
                      : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" title="Editar" onClick={() => {
                        setSel(l);
                        setForm({ nome: l.nome, email: l.email, cnpj: l.cnpj ?? '', cpf: l.cpf ?? '', telefone: l.telefone ?? '', corPrimaria: l.corPrimaria, logoUrl: l.logoUrl ?? '', mensalidadeDia: l.mensalidadeDia, mensalidadeValor: l.mensalidadeValor });
                        setErro(''); setModal('editar');
                      }}><Edit2 size={13} /></button>
                      <button className="btn-ghost" title="Registrar pagamento" style={{ color: 'var(--green)' }} onClick={() => {
                        setSel(l);
                        setPagForm({ valor: String(l.mensalidadeValor), vencimento: new Date().toISOString().slice(0,10), pagoEm: new Date().toISOString().slice(0,10), forma: 'pix', obs: '' });
                        setErro(''); setModal('pagamento');
                      }}>R$</button>
                      {l.status === 'Bloqueado'
                        ? <button className="btn-ghost" style={{ color: 'var(--green)' }} title="Desbloquear" onClick={() => alterarStatus(l, 'Ativo')}><Unlock size={13} /></button>
                        : <button className="btn-ghost" style={{ color: 'var(--red)' }} title="Bloquear" onClick={() => alterarStatus(l, 'Bloqueado')}><Lock size={13} /></button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal nova/editar loja */}
      {(modal === 'nova' || modal === 'editar') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{modal === 'nova' ? 'Nova loja' : 'Editar loja'}</h2>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-grid-2" style={{ display: 'grid', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nome da loja *</label>
                  <input value={form.nome} onChange={e => setForm((f: any) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Semi Joias da Ana" />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm((f: any) => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
                </div>
                <div className="form-group">
                  <label className="form-label">CNPJ</label>
                  <input value={form.cnpj} onChange={e => setForm((f: any) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input value={form.cpf} onChange={e => setForm((f: any) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cor principal</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.corPrimaria} onChange={e => setForm((f: any) => ({ ...f, corPrimaria: e.target.value }))} style={{ width: 48, height: 38, padding: 2 }} />
                    <input value={form.corPrimaria} onChange={e => setForm((f: any) => ({ ...f, corPrimaria: e.target.value }))} style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dia do vencimento</label>
                  <input type="number" min={1} max={28} value={form.mensalidadeDia} onChange={e => setForm((f: any) => ({ ...f, mensalidadeDia: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor mensalidade (R$)</label>
                  <input type="number" min={0} step={0.01} value={form.mensalidadeValor} onChange={e => setForm((f: any) => ({ ...f, mensalidadeValor: +e.target.value }))} />
                </div>

                {modal === 'nova' && (
                  <>
                    <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Usuário administrador da loja:</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nome do admin *</label>
                      <input value={form.adminNome} onChange={e => setForm((f: any) => ({ ...f, adminNome: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail do admin *</label>
                      <input type="email" value={form.adminEmail} onChange={e => setForm((f: any) => ({ ...f, adminEmail: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Senha do admin *</label>
                      <input type="password" value={form.adminSenha} onChange={e => setForm((f: any) => ({ ...f, adminSenha: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                    </div>
                  </>
                )}
              </div>
              {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erro}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarLoja} disabled={saving}>
                {saving ? 'Salvando...' : modal === 'nova' ? 'Criar loja' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pagamento manual */}
      {modal === 'pagamento' && selecionada && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Registrar pagamento</h2>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{selecionada.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selecionada.email}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input type="number" step={0.01} value={pagForm.valor} onChange={e => setPagForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Vencimento</label>
                    <input type="date" value={pagForm.vencimento} onChange={e => setPagForm(f => ({ ...f, vencimento: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data do pagamento</label>
                    <input type="date" value={pagForm.pagoEm} onChange={e => setPagForm(f => ({ ...f, pagoEm: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Forma de pagamento</label>
                  <select value={pagForm.forma} onChange={e => setPagForm(f => ({ ...f, forma: e.target.value }))}>
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="transferencia">Transferência</option>
                    <option value="cartao">Cartão</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Observação</label>
                  <input value={pagForm.obs} onChange={e => setPagForm(f => ({ ...f, obs: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
              {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erro}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarPagamento} disabled={saving}>
                {saving ? 'Registrando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
