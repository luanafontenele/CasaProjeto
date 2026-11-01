'use client';

import { useEffect, useRef, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import { User, Mail, ShieldCheck, Menu, X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

export default function PerfilPage() {
  const { perfil, atualizarLocal } = useUsuario();
  
  // PEGANDO TUDO DIRETO DO CONTEXTO GLOBAL
  const modoEscuro = perfil?.modo_escuro ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;
  const altoContraste = perfil?.alto_contraste ?? false;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;
  
  const [nome, setNome] = useState(perfil?.nome || '');
  const [email] = useState(perfil?.email || '');
  const [salvando, setSalvando] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  // Sincroniza os inputs caso o perfil mude no contexto
  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome || '');
      //setEmail(perfil.email || '');
    }
  }, [perfil]);

  useEffect(() => {
    if (modoEscuro || altoContraste) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [modoEscuro, altoContraste]);

  const emitirSomBip = (frequencia = 587.33, duracao = 0.1, forcarSom = false) => {
    if (!feedbackSonoro && !forcarSom) return;
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
      // Ignora bloqueios de autoplay
    }
  };

  const lidarComSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    emitirSomBip(700, 0.1, true);
    setSalvando(true);
    
    try {
      await api.patch('/me', { nome });
      atualizarLocal({ nome });
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Perfil Atualizado!',
        mensagem: 'Suas alterações foram salvas com sucesso! '
      });
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Não foi possível salvar o perfil'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={`h-screen w-screen overflow-hidden ${altoContraste ? 'bg-black text-amber-300' : modoEscuro ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} flex flex-col md:flex-row font-sans transition-colors duration-200`} style={{ fontSize: `${tamanhoFonte}px` }}>
      
      {/* BARRA TOPO MOBILE COM HAMBÚRGUER */}
      <div className={`md:hidden flex items-center justify-between p-4 ${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-40 shadow-sm w-full shrink-0`}>
        <span className="font-bold text-sm tracking-wide">C.A.S.A. Meu Perfil</span>
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

      {/* SIDEBAR FIXA OCUPANDO 100% DA ALTURA DA TELA */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 h-full flex flex-col
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <Sidebar ativo="perfil" />
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

        {/* BANNER DE TOPO */}
        <section 
          className="w-full h-24 sm:h-32 rounded-3xl p-6 sm:p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center shrink-0"
          style={{
            background: altoContraste ? '#000000' : 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)',
            border: altoContraste ? '2px solid #FACC15' : 'none'
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow-sm">Meu Perfil</h1>
        </section>

        {/* FORMULÁRIO DO PERFIL */}
        <div className="max-w-xl mx-auto w-full pb-16 shrink-0">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-[#FAF8FC] border-purple-100/80'} border rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-xs w-full`}>
            
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200/40 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
                {nome ? nome.charAt(0).toUpperCase() : 'L'}
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-lg font-bold truncate">{nome || 'Luana'}</h2>
                <span className="text-xs text-slate-400 truncate">{email || 'luanadiva@gmail.com'}</span>
              </div>
            </div>

            <form onSubmit={lidarComSalvar} className="flex flex-col gap-5">
              
              {/* Nome */}
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2`}>
                  <User className="w-4 h-4 text-purple-500" /> Seu Nome / Apelido
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs transition-all outline-none ${
                    altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : 
                    modoEscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-100 text-slate-800'
                  }`}
                  required
                />
              </div>

              {/* E-mail (Somente leitura) */}
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2`}>
                  <Mail className="w-4 h-4 text-blue-500" /> E-mail da Conta
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className={`w-full px-4 py-3 rounded-2xl border text-xs opacity-70 cursor-not-allowed ${
                    altoContraste ? 'bg-zinc-900/50 border-amber-500/50 text-amber-500/70' : 
                    modoEscuro ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                />
              </div>

              {/* Botão Salvar */}
              <button
                type="submit"
                disabled={salvando}
                className={`w-full py-3.5 rounded-2xl ${
                  altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                } font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2`}
              >
                <ShieldCheck className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>

            </form>

          </div>
        </div>

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
              <p className="text-xs text-slate-500 dark:text-slate-300">{feedback.mensagem}</p>
            </div>
            <button 
              onClick={() => {
                emitirSomBip(600, 0.05);
                setFeedback({ tipo: null, titulo: '', mensagem: '' });
              }} 
              className={`w-full py-3 rounded-2xl ${altoContraste ? 'bg-amber-500 text-black' : 'bg-[#5F7DE3] text-white'} font-semibold text-xs cursor-pointer`}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}