import { useEffect, useState } from 'react';
import { gravarSessao } from '../../services/sessaoStorage';

// Recebe a sessão do cliente pelo hash da URL (#<json>), guarda só nesta aba (sessionStorage) e abre o painel do cliente.
export function Suporte() {
  const [erro, setErro] = useState(false);

  useEffect(() => {
    try {
      const dados = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
      if (!dados?.token) throw new Error('sem token');
      gravarSessao(JSON.stringify({
        nome: dados.nome ?? 'Suporte', email: dados.email ?? '', role: dados.role ?? 'admin', token: dados.token,
        suporte: true, lojaNome: dados.lojaNome,
      }), true);
      window.location.replace('/cliente');   // recarrega já com a sessão e sem o token na URL
    } catch { setErro(true); }
  }, []);

  if (erro) return <div className="page"><p style={{ color: 'var(--red)' }}>Link de acesso inválido. Volte ao admin e tente de novo.</p></div>;
  return <div className="page"><div className="layout-loading"><div className="spinner" /></div></div>;
}
