'use client';

import { useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { ChevronDown, X, Search, Filter, Trash2, Info, CheckCircle2, XCircle, AlertTriangle, History as HistoryIcon } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

type Item = {
  id: string; nome: string; categoria: string; total: number;
  ultimo_acionamento: string; detalhe: string; hora: string; data: string;
};
type Periodo = 'todos' | 'dia' | 'semana' | 'mes';

export default function Historico() {
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState(''); // searchTerm com atraso (evita uma chamada por tecla)
  const [maisAcionados, setMaisAcionados] = useState<Item[]>([]);
  const [menosAcionados, setMenosAcionados] = useState<Item[]>([]);
  const [recarregar, setRecarregar] = useState(0);

  // ESTADOS DOS MODAIS
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<Item | null>(null);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let ativo = true;
    api
      .get('/historico', { params: { periodo, busca: buscaAplicada || undefined, limite: 50 } })
      .then((r) => {
        if (!ativo) return;
        setMaisAcionados(r.data.mais_acionados);
        setMenosAcionados(r.data.menos_acionados);
      })
      .catch((err) => ativo && setFeedback(erroParaFeedback(err, 'Falha ao Carregar o Histórico')));
    return () => {
      ativo = false;
    };
  }, [periodo, buscaAplicada, recarregar]);

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    const alvo = itemParaExcluir;
    setItemParaExcluir(null);
    setItemSelecionado(null);
    try {
      await api.delete(`/historico/${alvo.id}`);
      setRecarregar((n) => n + 1);
      setFeedback({ tipo: 'sucesso', titulo: 'Registro Excluído', mensagem: `O histórico do botão "${alvo.nome}" foi removido com sucesso.` });
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  const maisFiltrados = maisAcionados;
  const menosFiltrados = menosAcionados;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans relative">

      {/* SIDEBAR LATERAL */}
      <Sidebar ativo="historico" />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 flex flex-col gap-6 max-w-6xl mx-auto relative">

        <BarraTopo />

        <section 
          className="w-full h-28 rounded-3xl p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center"
          style={{
            background: 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)'
          }}
        >
          <h1 className="text-3xl font-extrabold drop-shadow-sm">Histórico</h1>
        </section>

        <p className="text-center text-slate-400 text-xs max-w-md mx-auto leading-relaxed font-medium">
          Histórico de botões mais e menos acionados no dispositivo C.A.S.A.
        </p>

        {/* BUSCA E FILTROS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as Periodo)}
                className="appearance-none bg-white border border-slate-200 rounded-2xl px-10 py-3 text-xs font-medium text-slate-500 pr-10 cursor-pointer focus:outline-none shadow-xs"
              >
                <option value="todos">Todo o período</option>
                <option value="dia">Hoje</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="mes">Últimos 30 dias</option>
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder="Busque por um botão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* LISTA DO HISTÓRICO (COM DADOS / VAZIO) */}
        {maisFiltrados.length > 0 || menosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2 items-start">
            
            {/* COLUNA: + ACIONADOS */}
            <div className="flex flex-col gap-4">
              <div className="w-full bg-[#DCE4FA] text-[#5F7DE3] font-bold text-center py-3 rounded-2xl text-sm shadow-xs">
                + Acionados
              </div>

              <div className="flex flex-col gap-3">
                {maisFiltrados.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setItemSelecionado(item)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-[#5F7DE3]/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-300 to-pink-300 flex items-center justify-center text-lg shadow-xs group-hover:scale-105 transition-transform">
                        💥
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm group-hover:text-[#5F7DE3] transition-colors">
                          {item.nome}
                        </span>
                        <span className="text-[10px] text-slate-400">Categoria: {item.categoria}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {item.detalhe}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemParaExcluir(item);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUNA: - ACIONADOS */}
            <div className="flex flex-col gap-4">
              <div className="w-full bg-[#FDE8CE] text-[#E89234] font-bold text-center py-3 rounded-2xl text-sm shadow-xs">
                - Acionados
              </div>

              <div className="flex flex-col gap-3">
                {menosFiltrados.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setItemSelecionado(item)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-amber-400/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-300 to-pink-300 flex items-center justify-center text-lg shadow-xs group-hover:scale-105 transition-transform">
                        💥
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm group-hover:text-amber-500 transition-colors">
                          {item.nome}
                        </span>
                        <span className="text-[10px] text-slate-400">Categoria: {item.categoria}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {item.detalhe}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemParaExcluir(item);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 my-4">
            <HistoryIcon className="w-12 h-12 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-base">Histórico Vazio</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Não há registro de acionamentos de botões gravados até o momento.
            </p>
          </div>
        )}


      </main>

      {/* MODAL 1: DETALHES DO ITEM CLICADO */}
      {itemSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 relative flex flex-col gap-4 text-center items-center">
            
            <button 
              onClick={() => setItemSelecionado(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-[#5F7DE3]/10 text-[#5F7DE3] flex items-center justify-center shrink-0">
              <Info className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">Detalhes do Acionamento</h3>
              <p className="text-xs text-slate-400">Informações registradas pelo microcontrolador ESP32</p>
            </div>

            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Botão:</span>
                <span className="font-bold text-slate-700">{itemSelecionado.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoria:</span>
                <span className="font-semibold text-slate-700">{itemSelecionado.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Horário:</span>
                <span className="font-semibold text-slate-700">{itemSelecionado.data} às {itemSelecionado.hora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Frequência:</span>
                <span className="font-semibold text-indigo-600">{itemSelecionado.detalhe}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button 
                onClick={() => {
                  setItemParaExcluir(itemSelecionado);
                }}
                className="py-3 rounded-2xl bg-rose-50 text-rose-600 font-semibold text-xs transition-all cursor-pointer hover:bg-rose-100"
              >
                Excluir Registro
              </button>

              <button 
                onClick={() => setItemSelecionado(null)}
                className="py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-center flex flex-col items-center gap-4">
            
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">Deseja excluir?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tem certeza que deseja apagar o registro do botão <strong>&quot;{itemParaExcluir.nome}&quot;</strong> do histórico?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button 
                onClick={() => setItemParaExcluir(null)}
                className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button 
                onClick={handleConfirmarExclusao}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: FEEDBACK */}
      {feedback.tipo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-center flex flex-col items-center gap-4">
            {feedback.tipo === 'sucesso' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
            {feedback.tipo === 'erro' && <XCircle className="w-12 h-12 text-rose-500" />}
            {feedback.tipo === 'atencao' && <AlertTriangle className="w-12 h-12 text-amber-500" />}
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">{feedback.titulo}</h3>
              <p className="text-xs text-slate-500">{feedback.mensagem}</p>
            </div>
            <button 
              onClick={() => setFeedback({ tipo: null, titulo: '', mensagem: '' })} 
              className="w-full py-3 rounded-2xl bg-[#5F7DE3] text-white font-semibold text-xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}