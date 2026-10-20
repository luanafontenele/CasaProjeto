import axios from 'axios';
import { auth } from './firebase';
import { mensagemApi, semConexao } from './erro';

/** Cliente HTTP do backend. Defina NEXT_PUBLIC_API_URL em frontend/.env.local */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  timeout: 15000,
});

// Anexa o ID token do Firebase (o SDK o renova sozinho quando expira)
api.interceptors.request.use(async (cfg) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/** Converte erro da API em {titulo, mensagem} para os modais de feedback. */
export function erroParaFeedback(err: unknown, titulo = 'Falha na Operação') {
  const mensagem = semConexao(err)
    ? 'Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.'
    : mensagemApi(err, 'Não foi possível concluir. Tente novamente.');
  return { tipo: 'erro' as const, titulo, mensagem };
}
