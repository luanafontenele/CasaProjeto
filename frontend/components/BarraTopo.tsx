'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { api } from '@/lib/api';
import { tempoRelativo } from '@/lib/tempo';
import { useUsuario } from '@/lib/UsuarioContext';

type Notificacao = { id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; criada_em: string };

/** Barra superior com o sino: lista as notificações reais (GET /notificacoes) e atualiza a cada 30 s. */
export default function BarraTopo({ escuro = false }: { escuro?: boolean }) {
  const { perfil } = useUsuario();
  
  // PEGANDO TUDO DO CONTEXTO GLOBAL 🌍
  const altoContraste = perfil?.alto_contraste ?? false;
  const modoEscuro = perfil?.modo_escuro ?? escuro;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;

  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  // FUNÇÃO DO TUTU SONORO 🎶
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

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<{ nao_lidas: number; itens: Notificacao[] }>('/notificacoes');
      setItens(data.itens);
      setNaoLidas(data.nao_lidas);
    } catch {
      /* sem rede: mantém o que já está na tela */
    }
  }, []);

  useEffect(() => {
    const primeira = setTimeout(carregar, 0);
    const ciclo = setInterval(carregar, 30000);
    return () => {
      clearTimeout(primeira);
      clearInterval(ciclo);
    };
  }, [carregar]);

  const alternar = async () => {
    emitirSomBip(650, 0.05);
    const abrindo = !aberto;
    setAberto(abrindo);
    if (abrindo) {
      await carregar();
      if (naoLidas > 0) {
        api.post('/notificacoes/lidas').then(() => setNaoLidas(0), () => {});
      }
    }
  };

  const limpar = async () => {
    emitirSomBip(400, 0.08);
    await api.delete('/notificacoes').catch(() => {});
    setItens([]);
    setNaoLidas(0);
  };

  return (
    <div
      className={`relative flex justify-between items-center ${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-100 text-slate-800'} p-3.5 rounded-2xl border shadow-xs`}
    >
      <span className={`text-[0.9em] font-semibold ${altoContraste ? 'text-amber-400' : 'text-slate-400'}`}>Painel do responsável</span>

      <button
        onClick={alternar}
        title="Notificações"
        className={`p-2.5 rounded-2xl ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-400' : modoEscuro ? 'bg-slate-700 border-slate-600 text-amber-400' : 'bg-slate-50 border-slate-100 text-[#5F7DE3]'} border hover:opacity-80 transition-all shadow-xs relative cursor-pointer`}
      >
        <Bell className="w-5 h-5" />
        {naoLidas > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white"></span>
        )}
      </button>

      {aberto && (
        <div className={`absolute top-full right-0 mt-2 w-80 ${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F3EFF5] border-indigo-100'} rounded-3xl p-6 shadow-2xl border z-50`}>
          <div className="flex justify-between items-center mb-6">
            <h4 className={`text-lg font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>Notificações</h4>
            <button onClick={() => { emitirSomBip(500, 0.05); setAberto(false); }} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {itens.length > 0 ? (
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
              {itens.map((n) => (
                <div key={n.id} className={`${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white text-slate-800'} p-3.5 rounded-2xl shadow-xs flex items-center justify-between gap-3 border`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {n.tipo === 'bateria_baixa' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 shrink-0 flex items-center justify-center font-bold text-xs">
                        !
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        ESP
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 text-left">
                      <span className={`text-[0.9em] font-semibold ${altoContraste ? 'text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>{n.titulo}</span>
                      <span className="text-[0.8em] text-slate-400 truncate">{n.mensagem}</span>
                    </div>
                  </div>
                  <span className="text-[0.8em] text-purple-500 font-medium shrink-0">{tempoRelativo(n.criada_em)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white/60 border-slate-200/60'} border p-6 rounded-2xl text-center flex flex-col items-center gap-2`}>
              <Bell className="w-8 h-8 text-slate-300" />
              <span className="text-[0.9em] text-slate-400 font-medium">Nenhuma notificação por enquanto.</span>
            </div>
          )}

          <div className="flex justify-center gap-6 mt-6">
            {itens.length > 0 && (
              <button onClick={limpar} className="text-[0.9em] text-rose-400 hover:text-rose-600 cursor-pointer font-semibold">
                Limpar
              </button>
            )}
            <button onClick={() => { emitirSomBip(500, 0.05); setAberto(false); }} className="text-[0.9em] text-slate-400 hover:text-slate-600 cursor-pointer font-semibold">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}