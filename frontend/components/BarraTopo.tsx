'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { api } from '@/lib/api';
import { tempoRelativo } from '@/lib/tempo';

type Notificacao = { id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; criada_em: string };

/** Barra superior com o sino: lista as notificações reais (GET /notificacoes) e atualiza a cada 30 s. */
export default function BarraTopo({ escuro = false }: { escuro?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

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
    await api.delete('/notificacoes').catch(() => {});
    setItens([]);
    setNaoLidas(0);
  };

  return (
    <div
      className={`relative flex justify-between items-center ${escuro ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-3.5 rounded-2xl border shadow-xs`}
    >
      <span className="text-xs font-semibold text-slate-400">Painel do responsável</span>

      <button
        onClick={alternar}
        title="Notificações"
        className={`p-2.5 rounded-2xl ${escuro ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'} border text-[#5F7DE3] hover:opacity-80 transition-all shadow-xs relative cursor-pointer`}
      >
        <Bell className="w-5 h-5" />
        {naoLidas > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white"></span>
        )}
      </button>

      {aberto && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#F3EFF5] rounded-3xl p-6 shadow-2xl border border-indigo-100 z-50">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold text-[#5F7DE3]">Notificações</h4>
            <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {itens.length > 0 ? (
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
              {itens.map((n) => (
                <div key={n.id} className="bg-white p-3.5 rounded-2xl shadow-xs flex items-center justify-between gap-3">
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
                      <span className="text-xs font-semibold text-slate-800">{n.titulo}</span>
                      <span className="text-[10px] text-slate-400 truncate">{n.mensagem}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-purple-500 font-medium shrink-0">{tempoRelativo(n.criada_em)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/60 border border-slate-200/60 p-6 rounded-2xl text-center flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 text-slate-300" />
              <span className="text-xs text-slate-500 font-medium">Nenhuma notificação por enquanto.</span>
            </div>
          )}

          <div className="flex justify-center gap-6 mt-6">
            {itens.length > 0 && (
              <button onClick={limpar} className="text-xs text-rose-400 hover:text-rose-600 cursor-pointer">
                Limpar
              </button>
            )}
            <button onClick={() => setAberto(false)} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
