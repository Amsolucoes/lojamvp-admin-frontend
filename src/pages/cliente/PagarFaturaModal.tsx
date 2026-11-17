import { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { api, Pagamento } from '../../services/api';
import { useToast } from '../../context/ToastContext';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// Pagamento de uma fatura da assinatura via Pix. Usado na tela Minha Assinatura e na tela Faturas.
// onPago: chamado quando o pagamento é aprovado/confirmado, para a tela recarregar os dados.
export function PagarFaturaModal({ fatura, onClose, onPago }: { fatura: Pagamento; onClose: () => void; onPago: () => void | Promise<void> }) {
  const forma = 'pix' as const;
  const [resultado, setResultado] = useState<any>(null);
  const [pagando, setPagando]     = useState(false);
  const [erro, setErro]           = useState('');
  const [cpf, setCpf]             = useState('');
  const [nome, setNome]           = useState('');
  const { erro: toastErro } = useToast();

  async function pagar() {
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
      if (res.status === 'approved') { await onPago(); }
    } catch (e) { setErro((e as Error).message); }
    finally { setPagando(false); }
  }

  async function verificarPagamento() {
    const res = await api.get<any>(`/api/pagamentos/${fatura.id}/status`);
    if (res.status === 'pago') { onClose(); await onPago(); }
    else toastErro('Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.');
  }

  return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Pagar fatura — {fmt(fatura.valor)}</h2>
            <button className="btn-ghost" onClick={() => onClose()}><X size={16} /></button>
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
              <button className="btn-secondary" onClick={() => onClose()}>Cancelar</button>
              <button className="btn-primary" onClick={pagar} disabled={pagando}>
                {pagando ? 'Gerando...' : `Gerar ${forma === 'pix' ? 'Pix' : forma === 'boleto' ? 'Boleto' : 'Pagamento'}`}
              </button>
            </div>
          )}
        </div>
      </div>
  );
}
