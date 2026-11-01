'use client';

import { useEffect } from 'react';
import { useUsuario } from '@/lib/UsuarioContext';

export default function AplicarPreferencias() {
  const { perfil } = useUsuario();
  const tamanho = perfil?.tamanho_fonte;

  useEffect(() => {
    if (tamanho == null) return;
    const el = document.documentElement;
    el.style.fontSize = `${16 * (1 + (tamanho - 10) * 0.04)}px`;
    return () => {
      el.style.fontSize = '';
    };
  }, [tamanho]);

  return null;
}