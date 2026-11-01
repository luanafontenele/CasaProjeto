'use client';

import { useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import { ChevronDown, Filter, Download, PieChart, CheckCircle2, XCircle, AlertTriangle, Menu, X } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

type Periodo = 'dia' | 'semana' | 'mes' | 'todos';
type Ponto = { name: string; valor: number };
type Dados = { tem_dados: boolean; total: number; media_por_dia: number; serie: Ponto[] };

export default function Desempenho() {
  const { perfil } = useUsuario();
  
  // PEGANDO TUDO DO CONTEXTO GLOBAL 🌍
  const modoEscuro = perfil?.modo_escuro ?? false;
  const altoContraste = perfil?.alto_contraste ?? false;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;

  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [dados, setDados] = useState<Dados>({ tem_dados: false, total: 0, media_por_dia: 0, serie: [] });
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

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
      // Ignora erro
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

  useEffect(() => {
    let ativo = true;
    api
      .get<Dados>('/desempenho', { params: { periodo } })
      .then((r) => ativo && setDados(r.data))
      .catch((err) => ativo && setFeedback(erroParaFeedback(err, 'Falha ao Carregar o Desempenho')));
    return () => {
      ativo = false;
    };
  }, [periodo]);

  const handleGerarPDF = async () => {
    emitirSomBip(700, 0.08);
    setGerandoPdf(true);
    try {
      const { data } = await api.get('/desempenho/relatorio', { params: { periodo }, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-casa-${periodo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      emitirSomBip(800, 0.1);
      setFeedback({ tipo: 'sucesso', titulo: 'Relatório Gerado', mensagem: 'O relatório de desempenho em PDF foi gerado e o download começou.' });
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Gerar o PDF'));
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div 
      className={`h-screen w-screen overflow-hidden ${altoContraste ? 'bg-black text-amber-300' : modoEscuro ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} flex flex-col md:flex-row font-sans transition-colors duration-200`}
      style={{ fontSize: `${tamanhoFonte}px` }}
    >
      
      {/* BARRA TOPO MOBILE COM HAMBÚRGUER */}
      <div className={`md:hidden flex items-center justify-between p-4 ${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-40 shadow-sm w-full shrink-0`}>
        <span className="font-bold text-sm tracking-wide">C.A.S.A. Desempenho</span>
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

      {/* SIDEBAR LATERAL FIXA OCUPANDO 100% DA ALTURA */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 h-full flex flex-col
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <Sidebar ativo="desempenho" />
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {menuMobileAberto && (
        <div 
          onClick={() => setMenuMobileAberto(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* CONTEÚDO PRINCIPAL COM ROLAGEM PRÓPRIA */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-10 flex flex-col gap-6 w-full">
        
        <BarraTopo escuro={modoEscuro || altoContraste} />

        <section 
          className="w-full h-24 sm:h-32 rounded-3xl p-6 sm:p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center shrink-0"
          style={{
            background: altoContraste ? '#000000' : 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)',
            border: altoContraste ? '2px solid #FACC15' : 'none'
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow-sm">Desempenho</h1>
        </section>

        <p className="text-center text-slate-400 text-[0.9em] max-w-md mx-auto leading-relaxed font-medium">
          Desempenho Geral em relação aos botões mais e menos acionados pelo dispositivo.
        </p>

        {/* Filtro */}
        <div className="flex justify-start items-center mt-2 w-full">
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
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* ÁREA DO GRÁFICO (COM DADOS / VAZIO) */}
        {dados.tem_dados ? (
          <div className={`w-full ${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-3xl p-6 shadow-xs flex flex-col gap-6 mt-2 relative pb-16`}>
            <p className={`text-[0.9em] ${altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-400' : 'text-slate-500'} text-center`}>
              Total: <strong className={altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'}>{dados.total}</strong> acionamentos · Média por dia: <strong className={altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'}>{dados.media_por_dia}</strong>
            </p>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.serie} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={altoContraste ? '#331A00' : modoEscuro ? '#1E293B' : '#F1F5F9'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: altoContraste ? '#FACC15' : '#F97316', strokeWidth: 3 }} 
                    tickLine={false} 
                    tick={{ fill: altoContraste ? '#FACC15' : modoEscuro ? '#94A3B8' : '#64748B', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={{ stroke: altoContraste ? '#FACC15' : '#F97316', strokeWidth: 3 }} 
                    tickLine={false} 
                    tick={{ fill: altoContraste ? '#FACC15' : modoEscuro ? '#94A3B8' : '#64748B', fontSize: 12, fontWeight: 600 }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: altoContraste ? '#000' : modoEscuro ? '#0F172A' : '#FFF', 
                      borderColor: altoContraste ? '#FACC15' : modoEscuro ? '#1E293B' : 'none',
                      color: altoContraste ? '#FACC15' : modoEscuro ? '#F1F5F9' : '#000',
                      borderRadius: '12px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)' 
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke={altoContraste ? '#FACC15' : '#F97316'} 
                    strokeWidth={4} 
                    dot={{ fill: altoContraste ? '#FACC15' : '#F97316', r: 5, strokeWidth: 2, stroke: altoContraste ? '#000' : modoEscuro ? '#0F172A' : '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-end w-full">
              <button 
                onClick={handleGerarPDF}
                disabled={gerandoPdf}
                className={`flex items-center gap-2 px-6 py-3 ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'} text-[1em] font-semibold rounded-2xl transition-all shadow-md cursor-pointer`}
              >
                <Download className="w-4 h-4" />
                {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        ) : (
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 my-4`}>
            <PieChart className="w-12 h-12 text-slate-400" />
            <h3 className={`font-bold ${altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-200' : 'text-slate-700'} text-[1.1em]`}>Sem Dados de Desempenho</h3>
            <p className="text-[0.9em] text-slate-400 max-w-sm">
              Inicie a utilização do dispositivo físico para gerar os primeiros gráficos de progresso e relatórios.
            </p>
          </div>
        )}

      </main>

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
              onClick={() => {
                emitirSomBip(600, 0.05);
                setFeedback({ tipo: null, titulo: '', mensagem: '' });
              }} 
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