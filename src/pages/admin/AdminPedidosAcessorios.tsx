import { useState, useEffect } from 'react';
import { Package, X, Truck, Copy } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface ItemPedido {
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface Pedido {
  id: string;
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  clienteCpfCnpj: string | null;
  cep: string;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  subtotal: number;
  valorFrete: number;
  total: number;
  status: string;
  codigoRastreio: string | null;
  criadoEm: string;
  pagoEm: string | null;
  enviadoEm: string | null;
  itens: ItemPedido[];
}

const STATUS_INFO: Record<string, { label: string; cor: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cor: 'badge-accent' },
  pago:      { label: 'Pago', cor: 'badge-green' },
  enviado:   { label: 'Enviado', cor: 'badge-blue' },
  entregue:  { label: 'Entregue', cor: 'badge-green' },
  cancelado: { label: 'Cancelado', cor: 'badge-red' },
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminPedidosAcessorios() {
  const { sucesso, erro } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalDetalhe, setModalDetalhe] = useState<Pedido | null>(null);
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState<Pedido | null>(null);

  function carregar() {
    setLoading(true);
    const query = filtroStatus !== 'todos' ? `?status=${filtroStatus}` : '';
    api.get<Pedido[]>(`/api/loja-acessorios/pedidos${query}`)
      .then(setPedidos)
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, [filtroStatus]);

  function abrirDetalhe(p: Pedido) {
    setModalDetalhe(p);
    setCodigoRastreio(p.codigoRastreio ?? '');
  }

  async function mudarStatus(p: Pedido, novoStatus: string) {
    setSalvando(true);
    try {
      await api.patch(`/api/loja-acessorios/pedidos/${p.id}/status`, {
        status: novoStatus,
        codigoRastreio: novoStatus === 'enviado' ? (codigoRastreio.trim() || null) : null,
      });
      sucesso('Pedido atualizado!');
      setModalDetalhe(null);
      setConfirmCancelar(null);
      carregar();
    } catch (e) {
      erro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const contagens = pedidos.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos — Loja de Acessórios</h1>
          <p className="page-subtitle">{pedidos.length} pedido(s)</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={filtroStatus === 'todos' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }}
          onClick={() => setFiltroStatus('todos')}>Todos</button>
        {Object.entries(STATUS_INFO).map(([chave, info]) => (
          <button key={chave} className={filtroStatus === chave ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }}
            onClick={() => setFiltroStatus(chave)}>{info.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : pedidos.length === 0 ? (
          <div className="empty"><Package size={32} /><p>Nenhum pedido encontrado.</p></div>
        ) : (
          <>
            <div className="table-wrap admin-table-desktop">
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Cidade/UF</th><th>Itens</th><th>Total</th><th>Status</th><th>Data</th><th></th></tr>
                </thead>
                <tbody>
                  {pedidos.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirDetalhe(p)}>
                      <td style={{ fontWeight: 500 }}>{p.clienteNome}</td>
                      <td style={{ color: 'var(--text-3)' }}>{p.cidade}/{p.uf}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{p.itens.length} item(ns)</td>
                      <td style={{ fontWeight: 600 }}>{fmt(p.total)}</td>
                      <td><span className={`badge ${STATUS_INFO[p.status]?.cor ?? 'badge-accent'}`}>{STATUS_INFO[p.status]?.label ?? p.status}</span></td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{fmtData(p.criadoEm)}</td>
                      <td>
                        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={e => { e.stopPropagation(); abrirDetalhe(p); }}>Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-cards-mobile">
              {pedidos.map(p => (
                <div key={p.id} className="admin-card-mobile" onClick={() => abrirDetalhe(p)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.clienteNome}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{p.cidade}/{p.uf} · {p.itens.length} item(ns)</div>
                      <div style={{ marginTop: 6 }}>
                        <span className={`badge ${STATUS_INFO[p.status]?.cor ?? 'badge-accent'}`}>{STATUS_INFO[p.status]?.label ?? p.status}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, flexShrink: 0 }}>{fmt(p.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de detalhe / gestão do pedido */}
      {modalDetalhe && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalDetalhe(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Pedido — {modalDetalhe.clienteNome}</h2>
              <button className="btn-ghost" onClick={() => setModalDetalhe(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className={`badge ${STATUS_INFO[modalDetalhe.status]?.cor ?? 'badge-accent'}`} style={{ fontSize: 12 }}>
                  {STATUS_INFO[modalDetalhe.status]?.label ?? modalDetalhe.status}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Criado em {fmtData(modalDetalhe.criadoEm)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
                  <div style={{ fontSize: 13 }}>{modalDetalhe.clienteNome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{modalDetalhe.clienteEmail}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{modalDetalhe.clienteTelefone}</div>
                  {modalDetalhe.clienteCpfCnpj && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>CPF: {modalDetalhe.clienteCpfCnpj}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>Endereço</div>
                  <div style={{ fontSize: 13 }}>{modalDetalhe.endereco}, {modalDetalhe.numero}</div>
                  {modalDetalhe.complemento && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{modalDetalhe.complemento}</div>}
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{modalDetalhe.bairro} — {modalDetalhe.cidade}/{modalDetalhe.uf}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>CEP: {modalDetalhe.cep}</div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                {modalDetalhe.itens.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                    <span>{item.nomeProduto} × {item.quantidade}</span>
                    <span>{fmt(item.subtotal)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
                    <span>Subtotal</span><span>{fmt(modalDetalhe.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
                    <span>Frete</span><span>{fmt(modalDetalhe.valorFrete)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                    <span>Total</span><span>{fmt(modalDetalhe.total)}</span>
                  </div>
                </div>
              </div>

              {modalDetalhe.status === 'enviado' && modalDetalhe.codigoRastreio && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
                  <Truck size={14} />
                  <span>Rastreio: {modalDetalhe.codigoRastreio}</span>
                  <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(modalDetalhe.codigoRastreio!)}><Copy size={12} /></button>
                </div>
              )}

              {(modalDetalhe.status === 'pago' || modalDetalhe.status === 'enviado') && (
                <div className="form-group">
                  <label className="form-label">Código de rastreio {modalDetalhe.status === 'pago' && '(necessário para marcar como enviado)'}</label>
                  <input value={codigoRastreio} onChange={e => setCodigoRastreio(e.target.value)} placeholder="Ex: BR123456789" />
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
              {modalDetalhe.status === 'aguardando_pagamento' && (
                <button className="btn-danger" onClick={() => setConfirmCancelar(modalDetalhe)}>Cancelar pedido</button>
              )}
              {modalDetalhe.status === 'pago' && (
                <button className="btn-primary" disabled={salvando} onClick={() => mudarStatus(modalDetalhe, 'enviado')}>
                  Marcar como enviado
                </button>
              )}
              {modalDetalhe.status === 'enviado' && (
                <button className="btn-primary" disabled={salvando} onClick={() => mudarStatus(modalDetalhe, 'entregue')}>
                  Marcar como entregue
                </button>
              )}
              <button className="btn-secondary" onClick={() => setModalDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar cancelamento */}
      {confirmCancelar && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmCancelar(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>Cancelar pedido</h2>
              <button className="btn-ghost" onClick={() => setConfirmCancelar(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
                Cancelar o pedido de <strong style={{ color: 'var(--text-1)' }}>{confirmCancelar.clienteNome}</strong>?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                O estoque dos produtos é devolvido imediatamente.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmCancelar(null)}>Voltar</button>
              <button className="btn-danger" disabled={salvando} onClick={() => mudarStatus(confirmCancelar, 'cancelado')}>
                {salvando ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}