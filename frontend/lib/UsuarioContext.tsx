'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export type Perfil = {
  uid: string;
  nome: string;
  email: string;
  notificacoes_ativas: boolean;
  modo_escuro: boolean;
  tamanho_fonte: number;
};

type Ctx = {
  perfil: Perfil | null;
  recarregar: () => Promise<void>;
  atualizarLocal: (p: Partial<Perfil>) => void;
};

const UsuarioContext = createContext<Ctx>({ perfil: null, recarregar: async () => {}, atualizarLocal: () => {} });

/** Carrega GET /me uma vez (cria o perfil no 1º acesso) e compartilha com todas as telas logadas. */
export function UsuarioProvider({ children, aoFalhar }: { children: React.ReactNode; aoFalhar: () => void }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const { data } = await api.get<Perfil>('/me');
      setPerfil(data);
    } catch {
      aoFalhar(); // 401/403 (sessão inválida ou e-mail não confirmado): volta ao login
    }
  }, [aoFalhar]);

  useEffect(() => {
    let ativo = true;
    api.get<Perfil>('/me').then(
      (r) => ativo && setPerfil(r.data),
      () => ativo && aoFalhar(),
    );
    return () => {
      ativo = false;
    };
  }, [aoFalhar]);

  const atualizarLocal = (p: Partial<Perfil>) => setPerfil((atual) => (atual ? { ...atual, ...p } : atual));

  return <UsuarioContext.Provider value={{ perfil, recarregar, atualizarLocal }}>{children}</UsuarioContext.Provider>;
}

export const useUsuario = () => useContext(UsuarioContext);
