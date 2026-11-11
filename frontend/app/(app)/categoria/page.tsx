'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoriaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dispositivo');
  }, [router]);

  return <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Redirecionando para /dispositivo...</div>;
}
