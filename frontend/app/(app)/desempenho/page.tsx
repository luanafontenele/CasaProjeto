'use client';

import { useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { ChevronDown, Filter, Download, PieChart, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [dados, setDados] = useState<Dados>({ tem_dados: false, total: 0, media_por_dia: 0, serie: [] });
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

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
    setGerandoPdf(true);
    try {
      // o endpoint exige o token: baixa como blob e dispara o download no navegador
      const { data } = await api.get('/desempenho/relatorio', { params: { periodo }, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-casa-${periodo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedback({ tipo: 'sucesso', titulo: 'Relatório Gerado', mensagem: 'O relatório de desempenho em PDF foi gerado e o download começou.' });
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Gerar o PDF'));
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans relative">
      
      {/* SIDEBAR LATERAL */}
      <Sidebar ativo="desempenho" />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 flex flex-col gap-6 max-w-5xl mx-auto relative">
        
        <BarraTopo />

        <section 
          className="w-full h-28 rounded-3xl p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center"
          style={{
            background: 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)'
          }}
        >
          <h1 className="text-3xl font-extrabold drop-shadow-sm">Desempenho</h1>
        </section>

        <p className="text-center text-slate-400 text-xs max-w-md mx-auto leading-relaxed font-medium">
          Desempenho Geral em relação aos botões mais e menos acionados pelo dispositivo.
        </p>

        {/* Filtro */}
        <div className="flex justify-start items-center mt-2">
          <div className="relative">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="appearance-none bg-white border border-slate-200 rounded-2xl px-10 py-3 text-xs font-medium text-slate-500 pr-10 cursor-pointer focus:outline-none shadow-xs"
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
          <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-6 mt-2 relative">
            <p className="text-xs text-slate-500 text-center">
              Total: <strong className="text-slate-700">{dados.total}</strong> acionamentos · Média por dia: <strong className="text-slate-700">{dados.media_por_dia}</strong>
            </p>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.serie} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#F97316', strokeWidth: 3 }} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={{ stroke: '#F97316', strokeWidth: 3 }} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#F97316" 
                    strokeWidth={4} 
                    dot={{ fill: '#F97316', r: 5, strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-end w-full">
              <button 
                onClick={handleGerarPDF}
                disabled={gerandoPdf}
                className="flex items-center gap-2 px-6 py-3 bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white text-xs font-semibold rounded-2xl transition-all shadow-md shadow-[#5F7DE3]/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 my-4">
            <PieChart className="w-12 h-12 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-base">Sem Dados de Desempenho</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Inicie a utilização do dispositivo físico para gerar os primeiros gráficos de progresso e relatórios.
            </p>
          </div>
        )}


      </main>

      {/* MODAL FEEDBACK */}
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