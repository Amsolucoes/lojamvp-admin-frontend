import { useState, useEffect } from 'react';
import { Plus, Edit2, Lock, Unlock, X, Search, Building2, Download, Trash2, LogIn, Mail, DollarSign, MoreVertical } from 'lucide-react';
import { api, Loja } from '../../services/api';
import { useToast } from '../../context/ToastContext';

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
  tipoPlano: 'loja', modulosAtivos: '',
  ehTeste: false,
};

const MODULOS_LABEL: Record<string, string> = {
  servicos: '🗓️ Serviços',
  etiquetas: '🏷️ Etiquetas',
  nf: '📄 NF',
};

function badgesModulos(modulosAtivos?: string) {
  if (!modulosAtivos) return [];
  return modulosAtivos.split(',').map(m => m.trim()).filter(Boolean);
}

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
  const [modalDel, setModalDel] = useState<Loja | null>(null);
  const [confirmaNome, setConfirmaNome] = useState('');
  const [modalEmail, setModalEmail] = useState<Loja | null>(null);
  const [emailForm, setEmailForm] = useState({ novoEmail: '', trocarLogin: true, trocarLoja: true });
  const [modalValor, setModalValor] = useState<Loja | null>(null);
  const [valorForm, setValorForm] = useState({ novoValor: '', sincronizar: false });
  const [verificando, setVerificando] = useState(false);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [modalTrial, setModalTrial] = useState(false);
  const [novaDataTrial, setNovaDataTrial] = useState('');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const { erro: toastErro, sucesso: toastSucesso } = useToast();

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    api.get<any[]>('/api/perfis').then(setPerfis).catch(() => {});
  }, []);

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

  async function fazerBackup(loja: Loja) {
    try {
      await api.download(`/api/admin/lojas/${loja.id}/backup`, `backup-${loja.nome.replace(/ /g, '-').toLowerCase()}.json`);
    } catch (e) {
      toastErro('Erro ao gerar backup: ' + (e as Error).message);
    }
  }

async function deletarLoja() {
    if (!modalDel || confirmaNome !== modalDel.nome) return;
    setSaving(true);
    try {
      await api.delete(`/api/admin/lojas/${modalDel.id}`);
      await carregar();
      setModalDel(null);
      setConfirmaNome('');
    } catch (e) {
      toastErro('Erro ao deletar: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

async function trocarEmail() {
    if (!modalEmail) return;
    if (!emailForm.novoEmail.trim()) { setErro('Informe o novo e-mail.'); return; }
    if (!emailForm.trocarLogin && !emailForm.trocarLoja) { setErro('Escolha ao menos um e-mail para trocar.'); return; }
    setSaving(true); setErro('');
    try {
      await api.patch(`/api/admin/lojas/${modalEmail.id}/email`, emailForm);
      await carregar();
      setModalEmail(null);
    } catch (e) { setErro((e as Error).message); }
    finally { setSaving(false); }
  }

 async function acessarLoja(loja: Loja) {
    try {
      const res = await api.post<{ token: string; nome: string; email: string; role: string }>(
        `/api/admin/lojas/${loja.id}/acessar`, {}
      );
      const dados = encodeURIComponent(JSON.stringify({
        token: res.token, nome: res.nome, email: res.email, role: res.role,
      }));
      const url = `https://app.aldevsoftware.com.br/suporte#${dados}`;
      window.open(url, '_blank');
    } catch (e) {
      toastErro('Erro ao acessar loja: ' + (e as Error).message);
    }
  }

  async function atualizarValor() {
    if (!modalValor) return;
    const valor = parseFloat(valorForm.novoValor);
    if (!valor || valor <= 0) { setErro('Informe um valor válido.'); return; }
    setSaving(true); setErro('');
    try {
      const res = await api.patch<any>(`/api/admin/lojas/${modalValor.id}/valor`, {
        novoValor: valor,
        sincronizarAssinatura: valorForm.sincronizar,
      });
      await carregar();
      setModalValor(null);
      if (res.aviso) toastErro(res.aviso);
    } catch (e) { setErro((e as Error).message); }
    finally { setSaving(false); }
  }

  async function verificarBloqueios() {
    setVerificando(true);
    try {
      await api.post('/api/admin/verificar-bloqueios', {});
      await carregar();
    } catch (e) {
      toastErro('Erro ao verificar: ' + (e as Error).message);
    } finally {
      setVerificando(false);
    }
  }

  async function salvarTrial() {
    if (!novaDataTrial || !selecionada) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/lojas/${selecionada.id}/trial`, { trialAte: novaDataTrial });
      await carregar();
      setModalTrial(false);
      toastSucesso?.('Trial atualizado!'); // ou seu padrão de toast, se ToastContext estiver disponível aqui
    } catch (e) {
      toastErro('Erro ao atualizar trial: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={verificarBloqueios} disabled={verificando} title="Reavalia o status de todas as lojas (bloqueia inadimplentes)">
            {verificando ? 'Verificando...' : '🔄 Verificar bloqueios'}
          </button>
          <button className="btn-primary" onClick={() => { setForm(EMPTY_LOJA); setErro(''); setModal('nova'); }}>
            <Plus size={15} style={{ verticalAlign: -2 }} /> Nova loja
          </button>
        </div>
      </div>

      {(() => {
        const usadas = lojas.filter(l => l.promocional && !l.ehTeste).length;
        const restantes = Math.max(0, 10 - usadas);
        return (
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <div>
              <strong>{usadas} de 10</strong> vagas promocionais usadas
              <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                ({restantes} {restantes === 1 ? 'vaga restante' : 'vagas restantes'} com R$89,90)
              </span>
            </div>
          </div>
        );
      })()}

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
          <>
            {/* Tabela — desktop */}
            <div className="table-wrap admin-table-desktop">
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
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {l.ehTeste && <span className="badge badge-yellow" style={{ fontSize: 10 }}>🧪 Teste</span>}
                          {l.tipoPlano === 'servicos' && <span className="badge badge-blue" style={{ fontSize: 10 }}>Plano Serviços</span>}
                          {badgesModulos(l.modulosAtivos).map(m => (
                            <span key={m} className="badge badge-accent" style={{ fontSize: 10 }}>{MODULOS_LABEL[m] ?? m}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-accent'}`}>{l.status}</span>
                        {l.fase === 'trial' && (
                          <div style={{ fontSize: 11, color: 'var(--blue, #6366f1)', marginTop: 4 }}>
                            {l.diasRestantes! > 0 ? `${l.diasRestantes}d de teste` : 'teste termina hoje'}
                          </div>
                        )}
                        {l.fase === 'carencia' && (
                          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                            {l.diasRestantes}d p/ bloquear
                          </div>
                        )}
                      </td>
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
                            setForm({ nome: l.nome, email: l.email, cnpj: l.cnpj ?? '', cpf: l.cpf ?? '', telefone: l.telefone ?? '', corPrimaria: l.corPrimaria, logoUrl: l.logoUrl ?? ''
                              , mensalidadeDia: l.mensalidadeDia, mensalidadeValor: l.mensalidadeValor, tipoPlano: l.tipoPlano ?? 'loja', modulosAtivos: l.modulosAtivos ?? '', ehTeste:  l.ehTeste ?? false});
                            setErro(''); setModal('editar');
                          }}><Edit2 size={13} /></button>
                          <button className="btn-ghost" title="Editar trial" style={{ color: 'var(--blue)' }} onClick={() => {
                            setSel(l);
                            setNovaDataTrial(l.trialAte ? l.trialAte.slice(0, 10) : '');
                            setModalTrial(true);
                          }}>📅</button>
                          <button className="btn-ghost" title="Registrar pagamento" style={{ color: 'var(--green)' }} onClick={() => {
                            setSel(l);
                            setPagForm({ valor: String(l.mensalidadeValor), vencimento: new Date().toISOString().slice(0,10), pagoEm: new Date().toISOString().slice(0,10), forma: 'pix', obs: '' });
                            setErro(''); setModal('pagamento');
                          }}>R$</button>
                          {l.status === 'Bloqueado'
                            ? <button className="btn-ghost" style={{ color: 'var(--green)' }} title="Desbloquear" onClick={() => alterarStatus(l, 'Ativo')}><Unlock size={13} /></button>
                            : <button className="btn-ghost" style={{ color: 'var(--red)' }} title="Bloquear" onClick={() => alterarStatus(l, 'Bloqueado')}><Lock size={13} /></button>
                          }
                          <button className="btn-ghost" title="Backup" onClick={() => fazerBackup(l)}><Download size={13} /></button>
                          <button className="btn-ghost" title="Deletar" style={{ color: 'var(--red)' }} onClick={() => { setModalDel(l); setConfirmaNome(''); }}><Trash2 size={13} /></button>
                          <button className="btn-ghost" title="Trocar e-mail" onClick={() => { setModalEmail(l); setEmailForm({ novoEmail: '', trocarLogin: true, trocarLoja: true }); setErro(''); }}><Mail size={13} /></button>
                          <button className="btn-ghost" title="Alterar valor" onClick={() => { setModalValor(l); setValorForm({ novoValor: String(l.mensalidadeValor), sincronizar: false }); setErro(''); }}><DollarSign size={13} /></button>
                          <button className="btn-ghost" title="Acessar como suporte" style={{ color: 'var(--blue)' }} onClick={() => acessarLoja(l)}><LogIn size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            {menuAberto && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuAberto(null)} />
            )}
            <div className="admin-cards-mobile">
              {lista.map(l => (
                <div key={l.id} className="admin-card-mobile">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{l.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{l.email}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {l.ehTeste && <span className="badge badge-yellow" style={{ fontSize: 10 }}>🧪 Teste</span>}
                        {l.tipoPlano === 'servicos' && <span className="badge badge-blue" style={{ fontSize: 10 }}>Plano Serviços</span>}
                        {badgesModulos(l.modulosAtivos).map(m => (
                          <span key={m} className="badge badge-accent" style={{ fontSize: 10 }}>{MODULOS_LABEL[m] ?? m}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${STATUS_BADGE[l.status] ?? 'badge-accent'}`}>{l.status}</span>
                        {l.fase === 'trial' && (
                          <div style={{ fontSize: 10, color: 'var(--blue, #6366f1)', marginTop: 3 }}>
                            {l.diasRestantes! > 0 ? `${l.diasRestantes}d de teste` : 'termina hoje'}
                          </div>
                        )}
                        {l.fase === 'carencia' && (
                          <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 3 }}>
                            {l.diasRestantes}d p/ bloquear
                          </div>
                        )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-3)' }}>
                      Venc.: <strong style={{ color: 'var(--text-2)' }}>
                        {l.proximoVencimento ? new Date(l.proximoVencimento).toLocaleDateString('pt-BR') : '—'}
                      </strong>
                    </span>
                    <span style={{ fontWeight: 600 }}>{fmt(l.mensalidadeValor)}/mês</span>
                  </div>
                  {l.emAtraso && (
                    <div style={{ marginTop: 6 }}>
                      <span className="badge badge-yellow">{l.diasAtraso}d atraso</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, position: 'relative' }}>
                    <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '7px 0' }}
                      onClick={() => {
                        setSel(l);
                        setForm({ nome: l.nome, email: l.email, cnpj: l.cnpj ?? '', cpf: l.cpf ?? '', telefone: l.telefone ?? '', corPrimaria: l.corPrimaria, logoUrl: l.logoUrl ?? ''
                          , mensalidadeDia: l.mensalidadeDia, mensalidadeValor: l.mensalidadeValor, tipoPlano: l.tipoPlano ?? 'loja', modulosAtivos: l.modulosAtivos ?? '', ehTeste: l.ehTeste ?? false });
                        setErro(''); setModal('editar');
                      }}>
                      <Edit2 size={12} /> Editar
                    </button>
                    <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '7px 0', color: 'var(--green)' }}
                      onClick={() => {
                        setSel(l);
                        setPagForm({ valor: String(l.mensalidadeValor), vencimento: new Date().toISOString().slice(0,10), pagoEm: new Date().toISOString().slice(0,10), forma: 'pix', obs: '' });
                        setErro(''); setModal('pagamento');
                      }}>
                      R$ Pgto
                    </button>
                    {l.status === 'Bloqueado'
                      ? <button className="btn-ghost" title="Ativar" style={{ color: 'var(--green)' }} onClick={() => alterarStatus(l, 'Ativo')}><Unlock size={15} /></button>
                      : <button className="btn-ghost" title="Bloquear" style={{ color: 'var(--red)' }} onClick={() => alterarStatus(l, 'Bloqueado')}><Lock size={15} /></button>
                    }
                    <button className="btn-ghost" title="Acessar como suporte" style={{ color: 'var(--blue)' }} onClick={() => acessarLoja(l)}><LogIn size={15} /></button>
                    <button className="btn-ghost" title="Mais ações" onClick={() => setMenuAberto(menuAberto === l.id ? null : l.id)}><MoreVertical size={15} /></button>

                    {menuAberto === l.id && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
                        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8,
                        boxShadow: 'var(--shadow-lg)', minWidth: 190, overflow: 'hidden',
                      }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-1)' }}
                          onClick={() => {
                            setMenuAberto(null); setSel(l);
                            setNovaDataTrial(l.trialAte ? l.trialAte.slice(0, 10) : '');
                            setModalTrial(true);
                          }}>📅 Editar trial</button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-1)' }}
                          onClick={() => { setMenuAberto(null); fazerBackup(l); }}><Download size={14} /> Backup</button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-1)' }}
                          onClick={() => { setMenuAberto(null); setModalEmail(l); setEmailForm({ novoEmail: '', trocarLogin: true, trocarLoja: true }); setErro(''); }}><Mail size={14} /> Trocar e-mail</button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-1)' }}
                          onClick={() => { setMenuAberto(null); setModalValor(l); setValorForm({ novoValor: String(l.mensalidadeValor), sincronizar: false }); setErro(''); }}><DollarSign size={14} /> Alterar valor</button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', color: 'var(--red)', textAlign: 'left' }}
                          onClick={() => { setMenuAberto(null); setModalDel(l); setConfirmaNome(''); }}><Trash2 size={14} /> Deletar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalTrial && selecionada && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalTrial(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Editar trial — {selecionada.nome}</h2>
              <button className="btn-ghost" onClick={() => setModalTrial(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Trial válido até</label>
                <input type="date" value={novaDataTrial} onChange={e => setNovaDataTrial(e.target.value)} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                Se a loja estiver bloqueada, ela volta para o status "Trial" automaticamente.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalTrial(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarTrial} disabled={saving || !novaDataTrial}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Perfil de serviços <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(traz serviços prontos)</span></label>
                    <select value={form.perfilId ?? ''} onChange={e => {
                      const p = perfis.find((x: any) => x.id === e.target.value);
                      setForm((f: any) => ({
                        ...f,
                        perfilId: e.target.value,
                        // se o perfil define um tipo de plano, aplica junto
                        tipoPlano: p?.tipoPlanoAplica ?? f.tipoPlano,
                        modulosAtivos: p?.tipoPlanoAplica === 'servicos' || p?.tipoPlanoAplica === 'loja_modulos' ? 'servicos' : f.modulosAtivos,
                      }));
                    }}>
                      <option value="">Nenhum (começar do zero)</option>
                      {perfis.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.icone} {p.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Tipo de plano</label>
                  <select value={form.tipoPlano ?? 'loja'} onChange={e => setForm((f: any) => ({ ...f, tipoPlano: e.target.value }))}>
                    <option value="loja">Loja (sistema completo)</option>
                    <option value="loja_modulos">Loja + Módulos</option>
                    <option value="servicos">Serviços (banho e tosa puro)</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Módulos ativos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {[
                      { chave: 'servicos', nome: 'Serviços e Agenda', ativo: true },
                      { chave: 'etiquetas', nome: 'Impressão de etiquetas', ativo: false },
                      { chave: 'nf', nome: 'Importação de NF', ativo: false },
                    ].map(mod => {
                      const lista = (form.modulosAtivos ?? '').split(',').map((m: string) => m.trim()).filter(Boolean);
                      const marcado = lista.includes(mod.chave);
                      return (
                        <label key={mod.chave} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: mod.ativo ? 'pointer' : 'not-allowed', opacity: mod.ativo ? 1 : 0.5, lineHeight: 1.2 }}>
                          <input type="checkbox" checked={marcado} disabled={!mod.ativo}
                            style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                            onChange={e => {
                              let nova = lista.filter((m: string) => m !== mod.chave);
                              if (e.target.checked) nova.push(mod.chave);
                              setForm((f: any) => ({ ...f, modulosAtivos: nova.join(',') }));
                            }} />
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {mod.nome}
                            {!mod.ativo && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(em breve)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                 <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={form.ehTeste ?? false}
                      style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                      onChange={e => setForm((f: any) => ({ ...f, ehTeste: e.target.checked }))} />
                    <span>🧪 Loja de teste <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(não conta no dashboard, receita nem vagas)</span></span>
                  </label>
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

      {/* Modal deletar loja */}
      {modalDel && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalDel(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>Deletar loja</h2>
              <button className="btn-ghost" onClick={() => setModalDel(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 14 }}>
                Isso vai apagar <strong style={{ color: 'var(--text-1)' }}>{modalDel.nome}</strong> e
                todos os dados (produtos, clientes, vendas, trocas). <strong style={{ color: 'var(--red)' }}>Não pode ser desfeito.</strong>
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
                Faça o backup antes, se precisar. Para confirmar, digite o nome da loja:
              </p>
              <input value={confirmaNome} onChange={e => setConfirmaNome(e.target.value)} placeholder={modalDel.nome} autoFocus />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => fazerBackup(modalDel)}>
                <Download size={13} /> Backup
              </button>
              <button className="btn-danger" onClick={deletarLoja} disabled={saving || confirmaNome !== modalDel.nome}>
                {saving ? 'Deletando...' : 'Deletar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal trocar e-mail */}
      {modalEmail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalEmail(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Trocar e-mail</h2>
              <button className="btn-ghost" onClick={() => setModalEmail(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{modalEmail.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>E-mail atual: {modalEmail.email}</div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Novo e-mail</label>
                <input type="email" value={emailForm.novoEmail}
                  onChange={e => setEmailForm(f => ({ ...f, novoEmail: e.target.value }))}
                  placeholder="novo@email.com" autoFocus />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={emailForm.trocarLogin}
                    style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                    onChange={e => setEmailForm(f => ({ ...f, trocarLogin: e.target.checked }))} />
                  <span>Trocar e-mail de <strong>login</strong> (com que o cliente entra no sistema)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={emailForm.trocarLoja}
                    style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                    onChange={e => setEmailForm(f => ({ ...f, trocarLoja: e.target.checked }))} />
                  <span>Trocar e-mail de <strong>contato/cobrança</strong> da loja</span>
                </label>
              </div>
              {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erro}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalEmail(null)}>Cancelar</button>
              <button className="btn-primary" onClick={trocarEmail} disabled={saving}>
                {saving ? 'Salvando...' : 'Trocar e-mail'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal alterar valor */}
      {modalValor && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalValor(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Alterar valor da mensalidade</h2>
              <button className="btn-ghost" onClick={() => setModalValor(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{modalValor.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Valor atual: {fmt(modalValor.mensalidadeValor)}
                  {modalValor.assinaturaStatus === 'authorized' && (
                    <span style={{ marginLeft: 8, color: 'var(--green)' }}>· assinatura ativa</span>
                  )}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Novo valor (R$)</label>
                <input type="number" min={0} step={0.01} value={valorForm.novoValor}
                  onChange={e => setValorForm(f => ({ ...f, novoValor: e.target.value }))}
                  placeholder="0,00" autoFocus />
              </div>
              {modalValor.assinaturaStatus === 'authorized' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={valorForm.sincronizar}
                    style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                    onChange={e => setValorForm(f => ({ ...f, sincronizar: e.target.checked }))} />
                  <span>Atualizar também a assinatura recorrente no Mercado Pago</span>
                </label>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>
                {modalValor.assinaturaStatus === 'authorized'
                  ? 'Sem marcar a opção acima, o novo valor vale só para as próximas faturas manuais (Pix). A assinatura continua no valor atual.'
                  : 'O novo valor será usado nas próximas faturas.'}
              </p>
              {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{erro}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalValor(null)}>Cancelar</button>
              <button className="btn-primary" onClick={atualizarValor} disabled={saving}>
                {saving ? 'Salvando...' : 'Alterar valor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
