import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { api, DashboardCliente, Pagamento } from '../../services/api';
import { PagarFaturaModal } from './PagarFaturaModal';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtData(s?: string) { return s ? new Date(s).toLocaleDateString('pt-BR') : '—'; }

type Filtro = 'todas' | 'aberto' | 'atrasado' | 'pago';
const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'todas',    rotulo: 'Todas'     },
  { chave: 'aberto',   rotulo: 'Em aberto' },
  { chave: 'atrasado', rotulo: 'Em atraso' },
  { chave: 'pago',     rotulo: 'Pagas'     },
];

function Badge({ status }: { status: string }) {
  if (status === 'pago')     return <span className="badge badge-green">Pago</span>;
  if (status === 'atrasado') return <span className="badge badge-red">Em atraso</span>;
  if (status === 'pendente') return <span className="badge badge-yellow">Em aberto</span>;
  return <span className="badge">{status}</span>;
}

export function ClienteFaturas() {
  const [faturas, setFaturas]   = useState<Pagamento[]>([]);
  const [nomeLoja, setNomeLoja] = useState('');
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState(false);
  const [filtro, setFiltro]     = useState<Filtro>('todas');
  const [pagar, setPagar]       = useState<Pagamento | null>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const d = await api.get<DashboardCliente>('/api/cliente/dashboard');
      setFaturas(d.historicoFaturas);
      setNomeLoja(d.nomeLoja);
      setErro(false);
    } catch { setErro(true); }
    finally { setLoading(false); }
  }

  const abertas   = useMemo(() => faturas.filter(f => f.status === 'pendente'), [faturas]);
  const atrasadas = useMemo(() => faturas.filter(f => f.status === 'atrasado'), [faturas]);
  const pagas     = useMemo(() => faturas.filter(f => f.status === 'pago'), [faturas]);
  const soma = (l: Pagamento[]) => l.reduce((t, f) => t + f.valor, 0);

  const visiveis = useMemo(() => {
    const base = filtro === 'aberto' ? abertas : filtro === 'atrasado' ? atrasadas : filtro === 'pago' ? pagas : faturas;
    return [...base].sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  }, [filtro, faturas, abertas, atrasadas, pagas]);

  if (loading) return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;
  if (erro)    return <div className="page"><p style={{ color: 'var(--red)' }}>Erro ao carregar as faturas.</p></div>;

  const resumo = [
    { rotulo: 'Em atraso', lista: atrasadas, cor: 'var(--red)',    Icone: AlertTriangle },
    { rotulo: 'Em aberto', lista: abertas,   cor: 'var(--yellow)', Icone: Clock },
    { rotulo: 'Pagas',     lista: pagas,     cor: 'var(--green)',  Icone: CheckCircle },
  ];

  const botaoPagar = (f: Pagamento, cheio = false) =>
    (f.status === 'pendente' || f.status === 'atrasado') && (
      <button className={cheio ? 'btn-primary' : 'btn-secondary'}
        style={cheio ? { width: '100%', marginTop: 10, fontSize: 13 } : { padding: '5px 12px', fontSize: 12 }}
        onClick={() => setPagar(f)}>
        {cheio ? `Pagar ${fmt(f.valor)}` : 'Pagar'}
      </button>
    );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faturas</h1>
          <p className="page-subtitle">{nomeLoja} · últimas {faturas.length} faturas</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {resumo.map(({ rotulo, lista, cor, Icone }) => (
          <div key={rotulo} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icone size={24} style={{ color: cor, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{rotulo} · {lista.length}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: lista.length ? cor : 'var(--text-3)' }}>{fmt(soma(lista))}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTROS.map(f => (
          <button key={f.chave} className={filtro === f.chave ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setFiltro(f.chave)}>
            {f.rotulo}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {visiveis.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Nenhuma fatura neste filtro.</p>
        ) : (
          <>
            <div className="admin-table-desktop">
              <table>
                <thead><tr><th>Vencimento</th><th>Valor</th><th>Status</th><th>Forma</th><th>Pago em</th><th></th></tr></thead>
                <tbody>
                  {visiveis.map(f => (
                    <tr key={f.id}>
                      <td>{fmtData(f.vencimento)}</td>
                      <td style={{ fontWeight: 500 }}>{fmt(f.valor)}</td>
                      <td><Badge status={f.status} /></td>
                      <td style={{ color: 'var(--text-3)' }}>{f.formaPagamento ?? '—'}</td>
                      <td style={{ color: 'var(--text-3)' }}>{fmtData(f.pagoEm)}</td>
                      <td>{botaoPagar(f)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-cards-mobile">
              {visiveis.map(f => (
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
                      <Badge status={f.status} />
                    </div>
                  </div>
                  {botaoPagar(f, true)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {pagar && <PagarFaturaModal fatura={pagar} onClose={() => setPagar(null)} onPago={carregar} />}
    </div>
  );
}
