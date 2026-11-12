'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UsuarioProvider } from '@/lib/UsuarioContext';
import AplicarPreferencias from '@/components/AplicarPreferencias';

const EXIGIR_EMAIL = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFIED !== 'false';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  const voltarAoLogin = useCallback((motivo?: string) => {
    console.warn(`[DEBUG AppLayout] Redirecionando para /login. Motivo: ${motivo ?? 'Não autenticado'}`);
    setPronto(false);
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { Cypress?: boolean }).Cypress && sessionStorage.getItem('cypress_mock_auth') === 'true') {
      console.log('[DEBUG AppLayout] Cypress Mock Auth detectado. Acesso liberado para testes.');
      setPronto(true);
      return;
    }
    console.log('[DEBUG AppLayout] Iniciando verificação de autenticação...');
    return onAuthStateChanged(auth, (user) => {
      console.log('[DEBUG AppLayout] Estado de autenticação alterado:', {
        autenticado: !!user,
        email: user?.email,
        emailVerificado: user?.emailVerified,
        exigirEmailVerificado: EXIGIR_EMAIL,
      });
      if (user && (user.emailVerified || !EXIGIR_EMAIL)) {
        console.log('[DEBUG AppLayout] Acesso liberado para rotas internas.');
        setPronto(true);
      } else {
        const motivo = !user
          ? 'Nenhum usuário logado no Firebase'
          : `E-mail não verificado (${user.email}) e EXIGIR_EMAIL=${EXIGIR_EMAIL}`;
        voltarAoLogin(motivo);
      }
    });
  }, [voltarAoLogin]);

  if (!pronto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium">Verificando acesso...</span>
      </div>
    );
  }

  return (
    <UsuarioProvider aoFalhar={voltarAoLogin}>
      <AplicarPreferencias />
      {children}
    </UsuarioProvider>
  );
}
