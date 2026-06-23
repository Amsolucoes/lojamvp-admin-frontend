const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem('admin:sessao') ?? 'null')?.token; }
  catch { return null; }
}

function handleUnauth() {
  localStorage.removeItem('admin:sessao');
  window.location.href = '/login';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) { handleUnauth(); throw new Error('Sessão expirada.'); }
  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) throw new Error(data?.erro ?? data?.title ?? `Erro ${res.status}`);
  return data as T;
}

async function download(path: string, nomeArquivo: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401) { handleUnauth(); throw new Error('Sessão expirada.'); }
  if (!res.ok) throw new Error(`Erro ${res.status} ao gerar backup.`);

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const api = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)               => request<T>('DELETE', path),
  download,
};

// ── Types ─────────────────────────────────────────────────────────
export interface Loja {
  id: string; nome: string; email: string;
  cnpj?: string; cpf?: string; telefone?: string;
  corPrimaria: string; logoUrl?: string;
  status: string;
  trialAte: string;
  mensalidadeDia: number; mensalidadeValor: number;
  proximoVencimento?: string; ultimaCobranca?: string;
  criadoEm: string; totalUsuarios: number;
  totalPago: number; emAtraso: boolean; diasAtraso: number;
  promocional?: boolean;
  fase?: string;
  diasRestantes?: number;
}

export interface Pagamento {
  id: string; lojaId: string; nomeLoja: string;
  valor: number; status: string;
  vencimento: string; pagoEm?: string;
  formaPagamento?: string; observacao?: string;
  mpQrCode?: string; mpQrCodeBase64?: string;
  mpBoletoUrl?: string; mpBoletoBarcode?: string;
  criadoEm: string;
}

export interface DashboardAdmin {
  totalLojas: number; lojasAtivas: number;
  lojasTrial: number; lojasBloqueadas: number;
  lojasEmAtraso: number;
  receitaMensal: number; receitaTotal: number;
  lojasAtrasadas: any[]; ultimosPagamentos: Pagamento[];
}

export interface DashboardCliente {
  nomeLoja: string; status: string;
  trialAte?: string; proximoVencimento?: string;
  mensalidadeValor: number;
  emAtraso: boolean; diasAtraso: number;
  faturaPendente?: Pagamento;
  historicoFaturas: Pagamento[];
}
