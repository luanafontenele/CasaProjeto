'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UsuarioProvider } from '@/lib/UsuarioContext';
import AplicarPreferencias from '@/components/AplicarPreferencias';

// Só para testes com contas criadas à mão no console (sem e-mail confirmado):
// NEXT_PUBLIC_REQUIRE_EMAIL_VERIFIED=false no .env.local (e REQUIRE_EMAIL_VERIFIED=false no backend)
const EXIGIR_EMAIL = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFIED !== 'false';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  const voltarAoLogin = useCallback(async () => {
    setPronto(false);
    await signOut(auth).catch(() => {});
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    // Dispara na carga da página e a cada login/logout
    return onAuthStateChanged(auth, (user) => {
      if (user && (user.emailVerified || !EXIGIR_EMAIL)) {
        setPronto(true);
      } else {
        voltarAoLogin();
      }
    });
  }, [voltarAoLogin]);

  if (!pronto) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Carregando...</div>;
  }
  return (
    <UsuarioProvider aoFalhar={voltarAoLogin}>
      <AplicarPreferencias />
      {children}
    </UsuarioProvider>
  );
}
