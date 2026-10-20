'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart2, ChevronDown, Grid, History, Home, LogOut, Settings } from 'lucide-react';
import { sair } from '@/lib/auth';
import { useUsuario } from '@/lib/UsuarioContext';

export type ItemMenu = 'dashboard' | 'categoria' | 'desempenho' | 'historico' | 'configuracoes';

const ITENS = [
  { chave: 'dashboard', href: '/dashboard', rotulo: 'Início', Icone: Home },
  { chave: 'categoria', href: '/categoria', rotulo: 'Categorias', Icone: Grid },
  { chave: 'desempenho', href: '/desempenho', rotulo: 'Desempenho', Icone: BarChart2 },
  { chave: 'historico', href: '/historico', rotulo: 'Histórico', Icone: History },
  { chave: 'configuracoes', href: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
] as const;

export default function Sidebar({ ativo, escuro = false }: { ativo: ItemMenu; escuro?: boolean }) {
  const router = useRouter();
  const { perfil } = useUsuario();
  const nome = perfil?.nome ?? 'Carregando...';

  const desconectar = async () => {
    await sair();
    router.replace('/login');
  };

  return (
    <aside
      className={`w-64 ${escuro ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border-r p-6 flex flex-col justify-between min-h-screen shadow-sm shrink-0`}
    >
      <div className="flex flex-col gap-8">
        <div className="flex justify-center w-full px-2">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="Logo C.A.S.A" width={96} height={96} className="object-contain" priority />
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {ITENS.map(({ chave, href, rotulo, Icone }) => (
            <Link
              key={chave}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all cursor-pointer ${
                chave === ativo
                  ? 'bg-[#5F7DE3] text-white shadow-md shadow-[#5F7DE3]/25'
                  : escuro
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-[#5F7DE3]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-[#5F7DE3]'
              }`}
            >
              <Icone className="w-5 h-5" />
              {rotulo}
            </Link>
          ))}
        </nav>
      </div>

      <div className={`flex flex-col gap-3 pt-6 border-t ${escuro ? 'border-slate-700' : 'border-slate-100'}`}>
        <div
          className={`flex items-center justify-between p-2 rounded-2xl border ${escuro ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#5F7DE3] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {nome.charAt(0).toUpperCase()}
            </div>
            <span className={`font-semibold text-sm truncate ${escuro ? 'text-slate-200' : 'text-slate-700'}`}>{nome}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        <button
          onClick={desconectar}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-500 hover:bg-slate-600 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Desconectar
        </button>
      </div>
    </aside>
  );
}
