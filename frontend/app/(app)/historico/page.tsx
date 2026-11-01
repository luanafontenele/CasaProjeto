'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import { Calendar, Search, Trash2, CheckCircle2, XCircle, AlertTriangle, Menu, X, Clock, Folder } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

type Periodo = 'dia' | 'semana' | 'mes' | 'todos';

type ItemHistorico = {
  id: string;
  nome: string;
  categoria: string;
  total: number;
  ultimo_acionamento: string;
  hora: string;
  data: string;
};

export default function Historico() {
  const { perfil } = useUsuario();
  
  // PEGANDO TUDO DO CONTEXTO GLOBAL 🌍
  const modoEscuro = perfil?.modo_escuro ?? false;
  const altoContraste = perfil?.alto_contraste ?? false;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;

  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [searchTerm, setSearchTerm] = useState('');
  const [historicoList, setHistoricoList] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<ItemHistorico | null>(null);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

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
      // Ignora erro se autoplay bloqueado
    }
  };

  // Aplica classe dark globalmente
  useEffect(() => {
    if (modoEscuro || altoContraste) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [modoEscuro, altoContraste]);

  const carregarHistorico = useCallback(() => {
    setCarregando(true);
    api
      .get<{ mais_acionados: ItemHistorico[]; menos_acionados: ItemHistorico[] }>('/historico', { params: { periodo } })
      .then((r) => {
        // Junta mais e menos acionados sem duplicatas para exibir na tabela geral
        const todos = [...r.data.mais_acionados, ...r.data.menos_acionados];
        const unicos = Array.from(new Map(todos.map((item) => [item.id, item])).values());
        setHistoricoList(unicos);
      })
      .catch((err) => setFeedback(erroParaFeedback(err, 'Falha ao Carregar o Histórico')))
      .finally(() => setCarregando(false));
  }, [periodo]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const handleExcluirItem = async () => {
    if (!itemParaExcluir) return;
    const item = itemParaExcluir;
    setItemParaExcluir(null);
    try {
      await api.delete(`/historico/${item.id}`);
      emitirSomBip(400, 0.1);
      carregarHistorico();
      setFeedback({ tipo: 'sucesso', titulo: 'Registro Removido', mensagem: `O registro "${item.nome}" foi excluído do histórico.` });
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Excluir Registro'));
    }
  };

  const listaFiltrada = historicoList.filter(
    (item) =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className={`h-screen w-screen overflow-hidden ${altoContraste ? 'bg-black text-amber-300' : modoEscuro ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} flex flex-col md:flex-row font-sans transition-colors duration-200`}
      style={{ fontSize: `${tamanhoFonte}px` }}
    >
      
      {/* BARRA TOPO MOBILE COM HAMBÚRGUER */}
      <div className={`md:hidden flex items-center justify-between p-4 ${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-40 shadow-sm w-full shrink-0`}>
        <span className="font-bold text-sm tracking-wide">C.A.S.A. Histórico</span>
        <button 
          onClick={() => {
            emitirSomBip(600, 0.05);
            setMenuMobileAberto(!menuMobileAberto);
          }}
          className={`p-2 rounded-xl ${altoContraste ? 'bg-amber-400 text-black' : modoEscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'} cursor-pointer transition-colors`}
          aria-label="Abrir Menu"
        >
          {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR LATERAL FIXA */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 h-full flex flex-col
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <Sidebar ativo="historico" />
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {menuMobileAberto && (
        <div 
          onClick={() => setMenuMobileAberto(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* CONTEÚDO PRINCIPAL COM ROLAGEM */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-10 flex flex-col gap-6 w-full">
        
        <BarraTopo escuro={modoEscuro || altoContraste} />

        <section 
          className="w-full h-24 sm:h-32 rounded-3xl p-6 sm:p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center shrink-0"
          style={{
            background: altoContraste ? '#000000' : 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)',
            border: altoContraste ? '2px solid #FACC15' : 'none'
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow-sm">Histórico de Acionamentos</h1>
        </section>

        {/* FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-auto">
              <select
                value={periodo}
                onChange={(e) => {
                  emitirSomBip(550, 0.05);
                  setPeriodo(e.target.value as Periodo);
                }}
                className={`appearance-none ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-500'} border rounded-2xl px-10 py-3 text-[0.9em] font-medium pr-10 cursor-pointer focus:outline-none shadow-xs w-full sm:w-auto`}
              >
                <option value="dia">Hoje</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="mes">Últimos 30 dias</option>
                <option value="todos">Todo o período</option>
              </select>
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="relative flex-1 w-full max-w-full">
              <input 
                type="text" 
                placeholder="Busque por ação ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400'} border rounded-2xl pl-10 pr-4 py-3 text-[0.9em] focus:outline-none shadow-xs`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* LISTAGEM DE HISTÓRICO */}
        {carregando ? (
          <div className="text-center text-[0.9em] text-slate-400 py-12">Carregando histórico...</div>
        ) : listaFiltrada.length > 0 ? (
          <div className={`w-full ${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-3xl p-6 shadow-xs flex flex-col gap-4 mt-2 pb-16`}>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b ${altoContraste ? 'border-zinc-800 text-amber-400' : modoEscuro ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'} text-[0.85em] uppercase font-bold`}>
                    <th className="py-3 px-4">Ação / Botão</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Total de Usos</th>
                    <th className="py-3 px-4">Data e Hora</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[0.9em]">
                  {listaFiltrada.map((item) => (
                    <tr key={item.id} className={`transition-colors ${altoContraste ? 'hover:bg-zinc-900 text-amber-300' : modoEscuro ? 'hover:bg-slate-800/50 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                      <td className="py-3.5 px-4 font-bold flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${altoContraste ? 'bg-zinc-800 text-amber-400 border border-amber-500' : 'bg-[#5F7DE3]/10 text-[#5F7DE3]'} flex items-center justify-center shrink-0`}>
                          <Clock className="w-4 h-4" />
                        </div>
                        {item.nome}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5 pt-5">
                        <Folder className="w-3.5 h-3.5" /> {item.categoria}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={`px-2.5 py-1 rounded-full text-[0.8em] ${altoContraste ? 'bg-amber-500 text-black font-bold' : modoEscuro ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-[#5F7DE3]'}`}>
                          {item.total}x
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[0.85em]">
                        {item.data} às {item.hora}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            emitirSomBip(400, 0.1);
                            setItemParaExcluir(item);
                          }}
                          className={`p-2 rounded-xl transition-colors cursor-pointer border ${altoContraste ? 'border-rose-500 text-rose-500 hover:bg-zinc-800' : 'border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40'}`}
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 my-4`}>
            <Clock className="w-12 h-12 text-slate-400" />
            <h3 className={`font-bold ${altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-200' : 'text-slate-700'} text-[1.1em]`}>Nenhum Registro Encontrado</h3>
            <p className="text-[0.9em] text-slate-400 max-w-sm">
              Não há acionamentos registrados para o filtro de período selecionado.
            </p>
          </div>
        )}

      </main>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaExcluir && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}>
            
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${altoContraste ? 'bg-rose-950 text-rose-500 border border-rose-500' : 'bg-rose-100 text-rose-600'} shadow-xs`}>
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">Deseja excluir?</h3>
              <p className="text-[0.9em] text-slate-400 leading-relaxed">
                Tem certeza que deseja apagar o registro <strong className={altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-200' : 'text-slate-700'}>&quot;{itemParaExcluir.nome}&quot;</strong>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button 
                onClick={() => { emitirSomBip(500, 0.05); setItemParaExcluir(null); }}
                className={`py-3 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold text-[0.9em] transition-all cursor-pointer`}
              >
                Cancelar
              </button>

              <button 
                onClick={handleExcluirItem}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[0.9em] transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL FEEDBACK */}
      {feedback.tipo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}>
            {feedback.tipo === 'sucesso' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
            {feedback.tipo === 'erro' && <XCircle className="w-12 h-12 text-rose-500" />}
            {feedback.tipo === 'atencao' && <AlertTriangle className="w-12 h-12 text-amber-500" />}
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">{feedback.titulo}</h3>
              <p className="text-[0.9em] text-slate-400">{feedback.mensagem}</p>
            </div>
            <button 
              onClick={() => { emitirSomBip(600, 0.05); setFeedback({ tipo: null, titulo: '', mensagem: '' }); }} 
              className={`w-full py-3 rounded-2xl ${altoContraste ? 'bg-amber-500 text-black font-bold' : 'bg-[#5F7DE3] text-white'} font-semibold text-[1em] cursor-pointer`}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}