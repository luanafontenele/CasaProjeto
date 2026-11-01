'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart2, ChevronDown, Grid, History, Home, LogOut, Settings, User } from 'lucide-react';
import { sair } from '@/lib/auth';
import { useUsuario } from '@/lib/UsuarioContext';

// Adicionei 'perfil' na lista se você for criar a página depois!
export type ItemMenu = 'dashboard' | 'categoria' | 'desempenho' | 'historico' | 'perfil' | 'configuracoes';

const ITENS = [
  { chave: 'dashboard', href: '/dashboard', rotulo: 'Início', Icone: Home },
  { chave: 'categoria', href: '/categoria', rotulo: 'Categorias', Icone: Grid },
  { chave: 'desempenho', href: '/desempenho', rotulo: 'Desempenho', Icone: BarChart2 },
  { chave: 'historico', href: '/historico', rotulo: 'Histórico', Icone: History },
  // Adicione a linha abaixo quando for criar a página de perfil
  // { chave: 'perfil', href: '/perfil', rotulo: 'Meu Perfil', Icone: User }, 
  { chave: 'configuracoes', href: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
] as const;

export default function Sidebar({ ativo }: { ativo: ItemMenu }) {
  const router = useRouter();
  
  // PEGANDO TUDO DIRETO DO CONTEXTO GLOBAL
  const { perfil } = useUsuario();
  const nome = perfil?.nome ?? 'Carregando...';
  const modoEscuro = perfil?.modo_escuro ?? false;
  const altoContraste = perfil?.alto_contraste ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;

  // FUNÇÃO DO TUTU SONORO
  const emitirSomBip = (frequencia = 587.33, duracao = 0.05) => {
    if (!feedbackSonoro) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequencia;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duracao);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duracao);
    } catch {
      // Ignora erro
    }
  };

  const desconectar = async () => {
    emitirSomBip(400, 0.15); // Som grave pra saída
    await sair();
    router.replace('/login');
  };

  const handleLinkClick = () => {
    emitirSomBip(600, 0.05); // Som agudo de clique
  };

  // ESTILOS DINÂMICOS DA ACESSIBILIDADE
  const containerClasses = altoContraste 
    ? 'bg-black border-amber-500' 
    : modoEscuro 
      ? 'bg-slate-900 border-slate-800' 
      : 'bg-white border-slate-100';

  const getLinkClasses = (chave: string) => {
    const isAtivo = ativo === chave;
    
    if (altoContraste) {
      return isAtivo 
        ? 'bg-amber-400 text-black font-bold shadow-sm shadow-amber-400/20' 
        : 'text-amber-300 hover:bg-zinc-900 hover:text-amber-200';
    }
    
    if (modoEscuro) {
      return isAtivo 
        ? 'bg-[#5F7DE3] text-white shadow-md shadow-[#5F7DE3]/25' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-[#5F7DE3]';
    }
    
    return isAtivo 
      ? 'bg-[#5F7DE3] text-white shadow-md shadow-[#5F7DE3]/25' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-[#5F7DE3]';
  };

  return (
    <aside
      className={`w-64 border-r p-6 flex flex-col justify-between min-h-screen shadow-sm shrink-0 transition-colors duration-200 ${containerClasses}`}
      style={{ fontSize: `${tamanhoFonte}px` }} // Aumenta a letra da sidebar também!
    >
      <div className="flex flex-col gap-8">
        <div className="flex justify-center w-full px-2">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            {/* Se estiver no alto contraste, deixei a imagem, mas você pode querer usar um logo branco/amarelo no futuro */}
            <Image src="/logo.png" alt="Logo C.A.S.A" width={96} height={96} className="object-contain" priority />
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {ITENS.map(({ chave, href, rotulo, Icone }) => (
            <Link
              key={chave}
              href={href}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-[1.1em] transition-all cursor-pointer ${getLinkClasses(chave)}`}
            >
              <Icone className="w-5 h-5" />
              {rotulo}
            </Link>
          ))}
        </nav>
      </div>

      <div className={`flex flex-col gap-3 pt-6 border-t ${altoContraste ? 'border-amber-500/50' : modoEscuro ? 'border-slate-800' : 'border-slate-100'}`}>
        
        {/* CARD DO PERFIL (CLICÁVEL PARA IR AO PERFIL) */}
        <Link
          href="/perfil"
          onClick={handleLinkClick}
          className={`flex items-center justify-between p-2 rounded-2xl border transition-all hover:opacity-90 cursor-pointer ${
            altoContraste 
              ? 'bg-zinc-900 border-amber-500/50 hover:bg-zinc-800' 
              : modoEscuro 
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' 
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              altoContraste ? 'bg-amber-400 text-black' : 'bg-[#5F7DE3] text-white'
            }`}>
              {nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className={`font-semibold text-[1em] truncate ${
                altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'
              }`}>
                {nome}
              </span>
              <span className="text-[0.8em] text-slate-400">Ver perfil</span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 shrink-0 -rotate-90 ${altoContraste ? 'text-amber-500' : 'text-slate-400'}`} />
        </Link>

        {/* BOTÃO DESCONECTAR */}
        <button
          onClick={desconectar}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-[1.1em] font-semibold transition-all shadow-sm cursor-pointer ${
            altoContraste 
              ? 'bg-rose-600 hover:bg-rose-700 text-white' 
              : modoEscuro 
                ? 'bg-slate-700 hover:bg-slate-600 text-rose-300' 
                : 'bg-slate-500 hover:bg-slate-600 text-white'
          }`}
        >
          <LogOut className="w-4 h-4" />
          Desconectar
        </button>
      </div>
    </aside>
  );
}