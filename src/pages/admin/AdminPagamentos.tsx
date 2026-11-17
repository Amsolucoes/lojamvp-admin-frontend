import { useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, Plus, Search, X, Clock, AlertTriangle, CheckCircle, Receipt } from 'lucide-react';
import { api, Loja, Pagamento } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './AdminDashboard.css';

interface PaginaPagamentos {
  itens: Pagamento[];
  total: number;
  pagina: number;
  tamanho: number;
  totais: { aReceber: number; emAtraso: number; recebido: number };
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const FORMAS: Record<string, string> = { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão', dinheiro: 'Dinheiro', transferencia: 'Transferência' };
const TAMANHO = 20;

// Status mostrado: pendente já vencida conta como em atraso (o servidor filtra do mesmo jeito)
function situacao(p: Pagamento): { texto: string; classe: string } {
  if (p.status === 'pago') return { texto: 'Pago', classe: 'badge-green' };
  if (p.status === 'atrasado' || new Date(p.vencimento) < new Date()) return { texto: 'Em atraso', classe: 'badge-red' };
  return { texto: 'A vencer', classe: 'badge-yellow' };
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

export function AdminPagamentos() {
  const { erro: toastErro, sucesso: toastSucesso } = useToast();
  const agora = new Date();
  const [ano, setAno] = useState<number | ''>(agora.getFullYear());
  const [mes, setMes] = useState<number | ''>(agora.getMonth() + 1);
  const [status, setStatus] = useState('');
  const [forma, setForma] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [incluirTeste, setIncluirTeste] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<PaginaPagamentos | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const seq = useRef(0);

  // Registrar pagamento manual
  const [modal, setModal] = useState(false);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [saving, setSaving] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [form, setForm] = useState({ lojaId: '', valor: '', vencimento: hojeISO(), pagoEm: hojeISO(), forma: 'pix', obs: '' });

  // Busca por nome: espera o usuário parar de digitar
  useEffect(() => {
    const t = setTimeout(() => { setBuscaAplicada(busca.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setErroLista('');
    const q = new URLSearchParams({ pagina: String(pagina), tamanho: String(TAMANHO) });
    if (ano) q.set('ano', String(ano));
    if (ano && mes) q.set('mes', String(mes));
    if (status) q.set('status', status);
    if (forma) q.set('forma', forma);
    if (buscaAplicada) q.set('busca', buscaAplicada);
    if (incluirTeste) q.set('incluirTeste', 'true');
    try {
      const r = await api.get<PaginaPagamentos>(`/api/admin/pagamentos?${q}`);
      if (id === seq.current) setDados(r);
    } catch (e) {
      if (id === seq.current) setErroLista((e as Error).message);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [ano, mes, status, forma, buscaAplicada, incluirTeste, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  const mudar = (fn: () => void) => { fn(); setPagina(1); };
  const anos = Array.from({ length: 6 }, (_, i) => agora.getFullYear() + 1 - i);
  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.tamanho)) : 1;

  async function abrirModal() {
    setErroModal('');
    setForm({ lojaId: '', valor: '', vencimento: hojeISO(), pagoEm: hojeISO(), forma: 'pix', obs: '' });
    setModal(true);
    if (lojas.length === 0) {
      try { setLojas(await api.get<Loja[]>('/api/admin/lojas')); } catch { /* o select fica vazio e o erro aparece ao confirmar */ }
    }
  }

  function escolherLoja(id: string) {
    const l = lojas.find(x => x.id === id);
    setForm(f => ({ ...f, lojaId: id, valor: f.valor || (l?.mensalidadeValor ? String(l.mensalidadeValor) : '') }));
  }

  async function registrar() {
    if (!form.lojaId) { setErroModal('Escolha a loja.'); return; }
    if (!form.valor || !form.vencimento) { setErroModal('Preencha valor e vencimento.'); return; }
    setSaving(true); setErroModal('');
    try {
      await api.post('/api/admin/pagamentos', {
        lojaId: form.lojaId,
        valor: parseFloat(form.valor),
        vencimento: form.vencimento,
        pagoEm: form.pagoEm,
        formaPagamento: form.forma,
        observacao: form.obs,
      });
      setModal(false);
      toastSucesso('Pagamento registrado.');
      await carregar();
    } catch (e) { setErroModal((e as Error).message); }
    finally { setSaving(false); }
  }

  const t = dados?.totais;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagamentos</h1>
          <p className="page-subtitle">Faturas de todas as lojas</p>
        </div>
        <button className="btn-primary" onClick={abrirModal} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Registrar pagamento
        </button>
      </div>

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-label"><Clock size={12} style={{ verticalAlign: -1 }} /> A receber</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(t?.aReceber ?? 0)}</div>
          <div className="stat-sub">ainda a vencer</div>
        </div>
        <div className="stat-card" style={(t?.emAtraso ?? 0) > 0 ? { borderColor: 'rgba(248,113,113,.35)' } : {}}>
          <div className="stat-label"><AlertTriangle size={12} style={{ verticalAlign: -1 }} /> Em atraso</div>
          <div className="stat-value" style={{ fontSize: 20, color: (t?.emAtraso ?? 0) > 0 ? 'var(--red)' : undefined }}>{fmt(t?.emAtraso ?? 0)}</div>
          <div className="stat-sub">vencidas e não pagas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CheckCircle size={12} style={{ verticalAlign: -1 }} /> Recebido</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{fmt(t?.recebido ?? 0)}</div>
          <div className="stat-sub">no período</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Receipt size={12} style={{ verticalAlign: -1 }} /> Faturas</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{dados?.total ?? 0}</div>
          <div className="stat-sub">{status ? 'no filtro' : 'no período'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input placeholder="Buscar loja..." value={busca} onChange={e => setBusca(e.target.value)} style={{ paddingLeft: 32, width: '100%', minWidth: 0 }} />
        </div>
        <select value={status} onChange={e => mudar(() => setStatus(e.target.value))} style={{ width: 'auto', minWidth: 130, flex: '0 0 auto', fontSize: 13 }}>
          <option value="">Todos os status</option>
          <option value="pendente">A vencer</option>
          <option value="atrasado">Em atraso</option>
          <option value="pago">Pagos</option>
        </select>
        <select value={mes} disabled={!ano} onChange={e => mudar(() => setMes(e.target.value ? +e.target.value : ''))} style={{ width: 'auto', minWidth: 120, flex: '0 0 auto', fontSize: 13 }}>
          <option value="">Todos os meses</option>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => mudar(() => { const v = e.target.value ? +e.target.value : ''; setAno(v); if (!v) setMes(''); })} style={{ width: 'auto', minWidth: 100, flex: '0 0 auto', fontSize: 13 }}>
          <option value="">Todos os anos</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={forma} onChange={e => mudar(() => setForma(e.target.value))} style={{ width: 'auto', minWidth: 120, flex: '0 0 auto', fontSize: 13 }}>
          <option value="">Qualquer forma</option>
          {Object.entries(FORMAS).map(([v, tx]) => <option key={v} value={v}>{tx}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirTeste} onChange={e => mudar(() => setIncluirTeste(e.target.checked))} style={{ width: 'auto' }} />
          Incluir lojas de teste
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {erroLista ? (
          <div className="empty"><p style={{ color: 'var(--red)' }}>{erroLista}</p></div>
        ) : loading && !dados ? (
          <div className="empty"><div className="spinner" /></div>
        ) : !dados || dados.itens.length === 0 ? (
          <div className="empty"><CreditCard size={32} /><p>Nenhum pagamento encontrado.</p></div>
        ) : (
          <>
            <div className="table-wrap admin-table-desktop" style={{ opacity: loading ? 0.6 : 1 }}>
              <table>
                <thead>
                  <tr><th>Loja</th><th>Valor</th><th>Vencimento</th><th>Pago em</th><th>Forma</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {dados.itens.map(p => {
                    const s = situacao(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.nomeLoja}</div>
                          {p.observacao && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.observacao}</div>}
                        </td>
                        <td style={{ fontWeight: 600 }}>{fmt(p.valor)}</td>
                        <td>{fmtData(p.vencimento)}</td>
                        <td>{fmtData(p.pagoEm)}</td>
                        <td>{p.formaPagamento ? (FORMAS[p.formaPagamento] ?? p.formaPagamento) : '—'}</td>
                        <td><span className={`badge ${s.classe}`}>{s.texto}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-cards-mobile" style={{ opacity: loading ? 0.6 : 1 }}>
              {dados.itens.map(p => {
                const s = situacao(p);
                return (
                  <div key={p.id} style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontWeight: 500, minWidth: 0, overflowWrap: 'anywhere' }}>{p.nomeLoja}</div>
                      <span className={`badge ${s.classe}`} style={{ flexShrink: 0 }}>{s.texto}</span>
                    </div>
                    <div style={{ fontWeight: 600, margin: '4px 0' }}>{fmt(p.valor)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Vence {fmtData(p.vencimento)}
                      {p.pagoEm ? ` · pago em ${fmtData(p.pagoEm)}` : ''}
                      {p.formaPagamento ? ` · ${FORMAS[p.formaPagamento] ?? p.formaPagamento}` : ''}
                    </div>
                    {p.observacao && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{p.observacao}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {dados && dados.total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Mostrando {(dados.pagina - 1) * dados.tamanho + 1}–{Math.min(dados.pagina * dados.tamanho, dados.total)} de {dados.total}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-secondary" disabled={pagina <= 1 || loading} onClick={() => setPagina(p => Math.max(1, p - 1))} style={{ padding: '4px 10px' }}>Anterior</button>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{dados.pagina} / {totalPaginas}</span>
            <button className="btn-secondary" disabled={pagina >= totalPaginas || loading} onClick={() => setPagina(p => p + 1)} style={{ padding: '4px 10px' }}>Próxima</button>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Registrar pagamento</h2>
              <button className="btn-ghost" onClick={() => setModal(false)} disabled={saving}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Loja</label>
                  <select value={form.lojaId} onChange={e => escolherLoja(e.target.value)}>
                    <option value="">Escolha a loja...</option>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}{l.ehTeste ? ' (teste)' : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input type="number" step={0.01} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group" style={{ minWidth: 0 }}>
                    <label className="form-label">Vencimento</label>
                    <input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ minWidth: 0 }}>
                    <label className="form-label">Data do pagamento</label>
                    <input type="date" value={form.pagoEm} onChange={e => setForm(f => ({ ...f, pagoEm: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Forma de pagamento</label>
                  <select value={form.forma} onChange={e => setForm(f => ({ ...f, forma: e.target.value }))}>
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="transferencia">Transferência</option>
                    <option value="cartao">Cartão</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Observação</label>
                  <input value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
              {erroModal && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erroModal}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={registrar} disabled={saving}>{saving ? 'Registrando...' : 'Confirmar pagamento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
