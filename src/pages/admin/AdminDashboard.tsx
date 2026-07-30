import { useState, useEffect } from 'react';
import { Building2, TrendingUp, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { api, DashboardAdmin } from '../../services/api';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtData(s?: string) { return s ? new Date(s).toLocaleDateString('pt-BR') : '—'; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { Ativo: 'badge-green', Trial: 'badge-blue', Bloqueado: 'badge-red', Cancelado: 'badge-red' };
  return <span className={`badge ${map[status] ?? 'badge-accent'}`}>{status}</span>;
}

export function AdminDashboard() {
  const [data, setData]     = useState<DashboardAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    api.get<DashboardAdmin>('/api/admin/dashboard')
      .then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;
  if (!data)   return <div className="page"><p style={{ color: 'var(--red)' }}>Erro ao carregar.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-label"><Building2 size={12} style={{ verticalAlign: -1 }} /> Total de lojas</div>
          <div className="stat-value">{data.totalLojas}</div>
          <div className="stat-sub">{data.lojasAtivas} ativas · {data.lojasTrial} em trial</div>
        </div>
        <div className="stat-card" style={data.lojasEmAtraso > 0 ? { borderColor: 'rgba(251,191,36,.3)' } : {}}>
          <div className="stat-label"><AlertTriangle size={12} style={{ verticalAlign: -1 }} /> Em atraso</div>
          <div className="stat-value" style={{ color: data.lojasEmAtraso > 0 ? 'var(--yellow)' : undefined }}>{data.lojasEmAtraso}</div>
          <div className="stat-sub">{data.lojasBloqueadas} bloqueadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><TrendingUp size={12} style={{ verticalAlign: -1 }} /> Receita mensal</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{fmt(data.receitaMensal)}</div>
          <div className="stat-sub">previsto este mês</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CheckCircle size={12} style={{ verticalAlign: -1 }} /> Receita total</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(data.receitaTotal)}</div>
          <div className="stat-sub">acumulado</div>
        </div>
      </div>

      {/* Projeção mensal detalhada */}
      <div className="card" style={{ marginBottom: 20 }}>
        <button onClick={() => setExpandido(v => !v)} style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <div className="dash-section-title" style={{ margin: 0 }}>
            <TrendingUp size={14} style={{ color: 'var(--green)' }} /> Projeção mensal — {data.projecaoMensal.length} loja(s) (ativas + trial)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>{fmt(data.receitaMensal)}</span>
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {expandido && (
          data.projecaoMensal.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}><p>Nenhuma loja ativa no momento.</p></div>
          ) : (
            <table style={{ marginTop: 14 }}>
              <thead><tr><th>Loja</th><th>Status</th><th>Vencimento (dia)</th><th>Próximo vencimento</th><th>Valor</th></tr></thead>
              <tbody>
                {data.projecaoMensal.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.nome}</td>
                    <td><span className={`badge ${l.status === 'Ativo' ? 'badge-green' : 'badge-blue'}`}>{l.status}</span></td>
                    <td style={{ color: 'var(--text-3)' }}>Dia {l.mensalidadeDia}</td>
                    <td style={{ color: 'var(--text-3)' }}>{fmtData(l.proximoVencimento ?? undefined)}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 500 }}>{fmt(l.mensalidadeValor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      <div className="dash-grid">
        {data.lojasAtrasadas.length > 0 && (
          <div className="card">
            <div className="dash-section-title"><AlertTriangle size={14} style={{ color: 'var(--yellow)' }} /> Lojas em atraso</div>
            <table>
              <thead><tr><th>Loja</th><th>Vencimento</th><th>Dias</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                {data.lojasAtrasadas.map((l: any) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.nome}</td>
                    <td style={{ color: 'var(--text-3)' }}>{fmtData(l.proximoVencimento)}</td>
                    <td><span className="badge badge-yellow">{l.diasAtraso}d</span></td>
                    <td>{fmt(l.mensalidadeValor)}</td>
                    <td><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <div className="dash-section-title"><Clock size={14} /> Últimos pagamentos</div>
          {data.ultimosPagamentos.length === 0 ? (
            <div className="empty" style={{ padding: '30px 0' }}><p>Nenhum pagamento ainda.</p></div>
          ) : (
            <table>
              <thead><tr><th>Loja</th><th>Forma</th><th>Valor</th><th>Data</th></tr></thead>
              <tbody>
                {data.ultimosPagamentos.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.nomeLoja}</td>
                    <td><span className="badge badge-accent">{p.formaPagamento ?? '—'}</span></td>
                    <td style={{ color: 'var(--green)', fontWeight: 500 }}>{fmt(p.valor)}</td>
                    <td style={{ color: 'var(--text-3)' }}>{fmtData(p.pagoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
