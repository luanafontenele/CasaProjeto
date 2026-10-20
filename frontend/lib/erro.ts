import { isAxiosError } from 'axios';

type CorpoErro = { codigo?: string; mensagem?: string };

/** Código de erro devolvido pela nossa API (ex.: 'limite_categorias'). */
export const codigoApi = (e: unknown): string | undefined => (isAxiosError<CorpoErro>(e) ? e.response?.data?.codigo : undefined);

/** Mensagem em português da API, ou o texto padrão se não houver. */
export const mensagemApi = (e: unknown, padrao: string): string =>
  isAxiosError<CorpoErro>(e) ? (e.response?.data?.mensagem ?? padrao) : padrao;

/** True quando a requisição nem chegou ao servidor (backend desligado, sem rede, CORS). */
export const semConexao = (e: unknown): boolean => isAxiosError(e) && !e.response;

/** Código de erro do Firebase Auth (ex.: 'auth/invalid-credential'). */
export const codigoFirebase = (e: unknown): string | undefined =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : undefined;
