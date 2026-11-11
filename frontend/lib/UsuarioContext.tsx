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
      console.log('[DEBUG UsuarioContext] Recarregando perfil (/me)...');
      const { data } = await api.get<Perfil>('/me');
      console.log('[DEBUG UsuarioContext] Perfil recarregado com sucesso:', data);
      setPerfil(data);
    } catch (err) {
      console.error('[DEBUG UsuarioContext] Falha ao recarregar perfil (/me):', err);
      aoFalhar();
    }
  }, [aoFalhar]);

  useEffect(() => {
    let ativo = true;
    console.log('[DEBUG UsuarioContext] Buscando perfil do usuário em api.get(/me)...');
    api.get<Perfil>('/me').then(
      (r) => {
        console.log('[DEBUG UsuarioContext] Perfil carregado com sucesso:', r.data);
        if (ativo) setPerfil(r.data);
      },
      (err) => {
        console.error('[DEBUG UsuarioContext] Erro ao buscar /me na API (acionando aoFalhar / redirecionar ao login):', err);
        if (ativo) aoFalhar();
      },
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