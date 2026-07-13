import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { api, DashboardCliente, Pagamento } from '../../services/api';
import { useToast } from '../../context/ToastContext';

declare global {
  interface Window { MercadoPago?: any; }
}

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtData(s?: string) { return s ? new Date(s).toLocaleDateString('pt-BR') : '—'; }

export function ClienteDashboard() {
  const [data, setData]           = useState<DashboardCliente | null>(null);
  const [loading, setLoading]     = useState(true);
  const [modalPag, setModalPag]   = useState(false);
  const [fatura, setFatura]       = useState<Pagamento | null>(null);
  const forma = 'pix' as const;
  const [resultado, setResultado] = useState<any>(null);
  const [pagando, setPagando]     = useState(false);
  const [erro, setErro]           = useState('');
  const [cpf, setCpf]             = useState('');
  const [nome, setNome]           = useState('');
  const [modalCartao, setModalCartao] = useState(false);
  const [assinando, setAssinando]     = useState(false);
  const [cartao, setCartao] = useState({ numero: '', nome: '', validade: '', cvv: '', cpf: '' });
  const [erroCartao, setErroCartao] = useState('');
  const { erro: toastErro } = useToast();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try { setData(await api.get<DashboardCliente>('/api/cliente/dashboard')); }
    finally { setLoading(false); }
  }

  function abrirPagamento(f: Pagamento) {
    setFatura(f); setResultado(null); setErro(''); setModalPag(true);
  }

  async function pagar() {
    if (!fatura) return;
    if (!cpf || !nome) { setErro('Preencha CPF e nome completo.'); return; }
    setPagando(true); setErro('');
    try {
      const res = await api.post<any>('/api/pagamentos/criar', {
        pagamentoId:    fatura.id,
        formaPagamento: forma,
        cpfPagador:     cpf,
        nomePagador:    nome,
        emailPagador:   null,
      });
      setResultado(res);
      if (res.status === 'approved') { await carregar(); }
    } catch (e) { setErro((e as Error).message); }
    finally { setPagando(false); }
  }

  async function cancelarAssinatura() {
    if (!confirm('Cancelar o pagamento automático? A cobrança mensal será interrompida.')) return;
    setAssinando(true);
    try {
      await api.post('/api/pagamentos/assinatura/cancelar', {});
      await carregar();
    } catch (e) {
      toastErro('Erro ao cancelar: ' + (e as Error).message);
    } finally {
      setAssinando(false);
    }
  }

  async function ativarAssinatura() {
    setErroCartao('');
    const { numero, nome, validade, cvv, cpf } = cartao;
    if (!numero || !nome || !validade || !cvv || !cpf) {
      setErroCartao('Preencha todos os campos do cartão.');
      return;
    }
    const [mes, ano] = validade.split('/').map(s => s.trim());
    if (!mes || !ano) { setErroCartao('Validade no formato MM/AA.'); return; }

    const pubKey = import.meta.env.VITE_MP_PUBLIC_KEY;
      if (!window.MercadoPago || !pubKey) {
        setErroCartao('SDK do Mercado Pago não carregado. Recarregue a página.');
        return;
      }

      setAssinando(true);
      try {
        const mp = new window.MercadoPago(pubKey);
        const anoCompleto = ano.length === 2 ? '20' + ano : ano;

        // Cria o token do cartão (dados vão direto pro MP, não pro nosso servidor)
        const token = await mp.createCardToken({
          cardNumber: numero.replace(/\s/g, ''),
          cardholderName: nome,
          cardExpirationMonth: mes,
          cardExpirationYear: anoCompleto,
          securityCode: cvv,
          identificationType: 'CPF',
          identificationNumber: cpf.replace(/\D/g, ''),
        });

        if (!token?.id) {
          setErroCartao('Não foi possível validar o cartão. Confira os dados.');
          setAssinando(false);
          return;
        }

        // Envia só o token pro backend criar a assinatura
        await api.post('/api/pagamentos/assinatura', {
          cardToken: token.id,
          cpfPagador: cpf.replace(/\D/g, ''),
          nomePagador: nome,
          emailPagador: null,
          cartaoFinal: numero.replace(/\s/g, '').slice(-4),
        });

        setModalCartao(false);
        setCartao({ numero: '', nome: '', validade: '', cvv: '', cpf: '' });
        await carregar();
      } catch (e: any) {
        const msg = e?.message || (Array.isArray(e) ? e[0]?.description : '') || 'Erro ao processar o cartão.';
        setErroCartao(msg);
      } finally {
        setAssinando(false);
    }
  }

  async function verificarPagamento() {
    if (!fatura) return;
    const res = await api.get<any>(`/api/pagamentos/${fatura.id}/status`);
    if (res.status === 'pago') { setModalPag(false); await carregar(); }
    else toastErro('Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.');
  }

  if (loading) return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;
  if (!data)   return <div className="page"><p style={{ color: 'var(--red)' }}>Erro ao carregar.</p></div>;

  const statusColor = data.status === 'Ativo' ? 'var(--green)' : data.status === 'Trial' ? 'var(--blue)' : 'var(--red)';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{data.nomeLoja}</h1>
          <p className="page-subtitle">Sua assinatura</p>
        </div>
      </div>

      {/* Status card */}
      <div className="card" style={{ marginBottom: 20, borderColor: data.emAtraso ? 'rgba(251,191,36,.3)' : data.status === 'Bloqueado' ? 'rgba(248,113,113,.3)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {data.status === 'Ativo'     && <CheckCircle size={28} style={{ color: 'var(--green)' }} />}
            {data.status === 'Trial'     && <Clock       size={28} style={{ color: 'var(--blue)'  }} />}
            {data.status === 'Bloqueado' && <AlertTriangle size={28} style={{ color: 'var(--red)' }} />}
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>
                {data.status === 'Ativo'     && 'Assinatura ativa'}
                {data.status === 'Trial'     && `Período de teste — vence em ${fmtData(data.trialAte)}`}
                {data.status === 'Bloqueado' && 'Acesso bloqueado por inadimplência'}
              </div>
              {data.emAtraso && (
                <div style={{ fontSize: 13, color: 'var(--yellow)', marginTop: 2 }}>
                  {data.diasAtraso} dia(s) em atraso — regularize para reativar o sistema
                </div>
              )}
              {!data.emAtraso && data.proximoVencimento && (
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                  Próximo vencimento: {fmtData(data.proximoVencimento)} · {fmt(data.mensalidadeValor)}/mês
                </div>
              )}
            </div>
          </div>
          {data.faturaPendente && (
            <button className="btn-primary" onClick={() => abrirPagamento(data.faturaPendente!)}>
              <CreditCard size={15} style={{ verticalAlign: -2 }} /> Pagar {fmt(data.faturaPendente.valor)}
            </button>
          )}
        </div>
      </div>

      {/* Pagamento automático (assinatura recorrente) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CreditCard size={26} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Pagamento automático</div>
              {data.assinaturaStatus === 'authorized' ? (
                <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 2 }}>
                  ✓ Ativo — cartão final {data.assinaturaCartaoFinal ?? '****'} · cobrança todo mês
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                  Cadastre um cartão e a mensalidade é cobrada automaticamente todo mês.
                </div>
              )}
            </div>
          </div>
          {data.assinaturaStatus === 'authorized' ? (
            <button className="btn-secondary" style={{ color: 'var(--red)' }} onClick={cancelarAssinatura} disabled={assinando}>
              {assinando ? 'Processando...' : 'Cancelar'}
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setModalCartao(true)}>
              <CreditCard size={15} style={{ verticalAlign: -2 }} /> Ativar cartão automático
            </button>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
          Histórico de faturas
        </div>

        {/* Tabela — desktop */}
        <div className="admin-table-desktop">
          <table>
            <thead><tr><th>Vencimento</th><th>Valor</th><th>Status</th><th>Forma</th><th>Pago em</th><th></th></tr></thead>
            <tbody>
              {data.historicoFaturas.map(f => (
                <tr key={f.id}>
                  <td>{fmtData(f.vencimento)}</td>
                  <td style={{ fontWeight: 500 }}>{fmt(f.valor)}</td>
                  <td>
                    {f.status === 'pago'     && <span className="badge badge-green">Pago</span>}
                    {f.status === 'pendente' && <span className="badge badge-yellow">Pendente</span>}
                    {f.status === 'atrasado' && <span className="badge badge-red">Atrasado</span>}
                  </td>
                  <td style={{ color: 'var(--text-3)' }}>{f.formaPagamento ?? '—'}</td>
                  <td style={{ color: 'var(--text-3)' }}>{fmtData(f.pagoEm)}</td>
                  <td>
                    {(f.status === 'pendente' || f.status === 'atrasado') && (
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => abrirPagamento(f)}>
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards — mobile */}
        <div className="admin-cards-mobile">
          {data.historicoFaturas.map(f => (
            <div key={f.id} className="admin-card-mobile">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtData(f.vencimento)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {f.formaPagamento ?? '—'} {f.pagoEm ? `· pago em ${fmtData(f.pagoEm)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>{fmt(f.valor)}</span>
                  {f.status === 'pago'     && <span className="badge badge-green">Pago</span>}
                  {f.status === 'pendente' && <span className="badge badge-yellow">Pendente</span>}
                  {f.status === 'atrasado' && <span className="badge badge-red">Atrasado</span>}
                </div>
              </div>
              {(f.status === 'pendente' || f.status === 'atrasado') && (
                <button className="btn-primary" style={{ width: '100%', marginTop: 10, fontSize: 13 }}
                  onClick={() => abrirPagamento(f)}>
                  Pagar {fmt(f.valor)}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal pagamento */}
      {modalPag && fatura && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalPag(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Pagar fatura — {fmt(fatura.valor)}</h2>
              <button className="btn-ghost" onClick={() => setModalPag(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {!resultado ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8 }}>
                    <span style={{ fontSize: 20 }}>⚡</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Pagamento via Pix</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Nome completo</label>
                      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Como no CPF" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CPF</label>
                      <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erro}</p>}
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  {resultado.status === 'approved' ? (
                    <div>
                      <CheckCircle size={40} style={{ color: 'var(--green)', margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: 600, color: 'var(--green)' }}>Pagamento aprovado!</p>
                      <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>Seu acesso foi reativado.</p>
                    </div>
                  ) : resultado.qrCode ? (
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: 12 }}>Escaneie o QR Code Pix:</p>
                      {resultado.qrCodeBase64 && (
                        <img src={`data:image/png;base64,${resultado.qrCodeBase64}`} alt="QR Code Pix"
                          style={{ width: 200, height: 200, margin: '0 auto 12px', display: 'block', borderRadius: 8 }} />
                      )}
                      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 11, fontFamily: 'var(--mono)', wordBreak: 'break-all', marginBottom: 12 }}>
                        {resultado.qrCode}
                      </div>
                      <button className="btn-secondary" style={{ width: '100%', marginBottom: 8 }}
                        onClick={() => navigator.clipboard.writeText(resultado.qrCode)}>
                        Copiar código Pix
                      </button>
                      <button className="btn-primary" style={{ width: '100%' }} onClick={verificarPagamento}>
                        Já paguei — verificar
                      </button>
                    </div>
                  ) : resultado.boletoUrl ? (
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: 12 }}>Boleto gerado!</p>
                      {resultado.boletoBarcode && (
                        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 11, fontFamily: 'var(--mono)', wordBreak: 'break-all', marginBottom: 12 }}>
                          {resultado.boletoBarcode}
                        </div>
                      )}
                      <a href={resultado.boletoUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '9px 18px' }}>
                        Abrir boleto
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {!resultado && (
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setModalPag(false)}>Cancelar</button>
                <button className="btn-primary" onClick={pagar} disabled={pagando}>
                  {pagando ? 'Gerando...' : `Gerar ${forma === 'pix' ? 'Pix' : forma === 'boleto' ? 'Boleto' : 'Pagamento'}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal cartão automático */}
      {modalCartao && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCartao(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Ativar pagamento automático</h2>
              <button className="btn-ghost" onClick={() => setModalCartao(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
                Cadastre seu cartão de crédito. A mensalidade de {fmt(data.mensalidadeValor)} será cobrada automaticamente todo mês. Você pode cancelar quando quiser.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Número do cartão</label>
                  <input value={cartao.numero} inputMode="numeric"
                    onChange={e => setCartao(c => ({ ...c, numero: e.target.value }))}
                    placeholder="0000 0000 0000 0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome no cartão</label>
                  <input value={cartao.nome}
                    onChange={e => setCartao(c => ({ ...c, nome: e.target.value }))}
                    placeholder="Como impresso no cartão" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Validade</label>
                    <input value={cartao.validade} inputMode="numeric"
                      onChange={e => setCartao(c => ({ ...c, validade: e.target.value }))}
                      placeholder="MM/AA" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input value={cartao.cvv} inputMode="numeric"
                      onChange={e => setCartao(c => ({ ...c, cvv: e.target.value }))}
                      placeholder="000" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">CPF do titular</label>
                  <input value={cartao.cpf} inputMode="numeric"
                    onChange={e => setCartao(c => ({ ...c, cpf: e.target.value }))}
                    placeholder="000.000.000-00" />
                </div>
              </div>
              {erroCartao && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erroCartao}</p>}
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔒 Seus dados são processados com segurança pelo Mercado Pago.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalCartao(false)}>Cancelar</button>
              <button className="btn-primary" onClick={ativarAssinatura} disabled={assinando}>
                {assinando ? 'Processando...' : 'Ativar assinatura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
