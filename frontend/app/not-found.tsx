'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona qualquer rota inexistente ou com erro de digitação para /dispositivo
    if (typeof window !== 'undefined') {
      window.location.href = '/dispositivo';
    } else {
      router.replace('/dispositivo');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-medium">Carregando página...</span>
    </div>
  );
}
