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
  alto_contraste: boolean;
  feedback_sonoro: boolean;
};

type Ctx = {
  perfil: Perfil | null;
  recarregar: () => Promise<void>;
  atualizarLocal: (p: Partial<Perfil>) => void;
  atualizarPerfil: (p: Partial<Perfil>) => Promise<void>;
};

const UsuarioContext = createContext<Ctx>({ 
  perfil: null, 
  recarregar: async () => {}, 
  atualizarLocal: () => {},
  atualizarPerfil: async () => {}
});

export function UsuarioProvider({ children, aoFalhar }: { children: React.ReactNode; aoFalhar: () => void }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const { data } = await api.get<Perfil>('/me');
      setPerfil(data);
    } catch {
      aoFalhar();
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

  const atualizarPerfil = async (p: Partial<Perfil>) => {
    try {
      await api.patch('/me', p);
      atualizarLocal(p);
    } catch (err) {
      console.error('Erro ao atualizar perfil', err);
      throw err;
    }
  };

  return <UsuarioContext.Provider value={{ perfil, recarregar, atualizarLocal, atualizarPerfil }}>{children}</UsuarioContext.Provider>;
}

export const useUsuario = () => useContext(UsuarioContext);