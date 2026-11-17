// Sessão do admin. Login normal fica no localStorage (vale em todas as abas). O acesso de suporte (superadmin vendo o painel
// de um cliente) fica no sessionStorage: vale só na aba aberta e não derruba a sessão do superadmin nas outras abas.
const CHAVE = 'admin:sessao';

export function lerSessaoBruta(): string | null {
  try { return sessionStorage.getItem(CHAVE) ?? localStorage.getItem(CHAVE); }
  catch { return null; }
}

export function gravarSessao(json: string, soNestaAba = false) {
  try { (soNestaAba ? sessionStorage : localStorage).setItem(CHAVE, json); } catch { /* sem armazenamento */ }
}

// Remove só a sessão que esta aba está usando (suporte → sessionStorage; login normal → localStorage)
export function limparSessao() {
  try {
    if (sessionStorage.getItem(CHAVE) !== null) sessionStorage.removeItem(CHAVE);
    else localStorage.removeItem(CHAVE);
  } catch { /* sem armazenamento */ }
}
