'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { api, erroParaFeedback } from '@/lib/api';
import { sair } from '@/lib/auth';
import { useUsuario } from '@/lib/UsuarioContext';
import { Bell, X, FileText, Info, HelpCircle, Moon, Trash2, Plus, Minus, AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

export default function Configuracoes() {
  const router = useRouter();
  const { perfil, atualizarLocal } = useUsuario();
  const notificacoesAtivas = perfil?.notificacoes_ativas ?? true;
  const modoEscuro = perfil?.modo_escuro ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Salva uma preferência: atualiza a tela na hora e confirma no servidor (desfaz se falhar)
  const salvarPreferencia = async (mudanca: { notificacoes_ativas?: boolean; modo_escuro?: boolean; tamanho_fonte?: number }) => {
    const anterior = { notificacoes_ativas: notificacoesAtivas, modo_escuro: modoEscuro, tamanho_fonte: tamanhoFonte };
    atualizarLocal(mudanca);
    try {
      await api.patch('/me', mudanca);
    } catch (err) {
      atualizarLocal(anterior);
      setFeedback(erroParaFeedback(err, 'Não foi Possível Salvar'));
    }
  };

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  // MODAIS DE INFORMAÇÕES
  const [modalConteudo, setModalConteudo] = useState<{
    titulo: string;
    subtitulo: string;
    texto: string;
    icone: ComponentType<{ className?: string }>;
  } | null>(null);

  // MODAL EXCLUIR CONTA
  const [showExcluirContaModal, setShowExcluirContaModal] = useState(false);

  // FEEDBACK
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  const mudarFonte = (novo: number) => {
    const valor = Math.max(8, Math.min(20, novo));
    if (valor === tamanhoFonte) return;
    atualizarLocal({ tamanho_fonte: valor }); // reflete na hora; o salvamento espera o usuário parar de clicar
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      api.patch('/me', { tamanho_fonte: valor }).catch((err) => setFeedback(erroParaFeedback(err, 'Não foi Possível Salvar')));
    }, 500);
  };
  const aumentarFonte = () => mudarFonte(tamanhoFonte + 1);
  const diminuirFonte = () => mudarFonte(tamanhoFonte - 1);

  const handleExcluirConta = async () => {
    setShowExcluirContaModal(false);
    try {
      await api.delete('/me'); // apaga dados, arquivos e o usuário no Firebase Auth
      await sair().catch(() => {}); // o usuário já não existe mais no Firebase
      router.replace('/');
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Não foi Possível Excluir a Conta'));
    }
  };

  return (
    <div className={`min-h-screen ${modoEscuro ? 'bg-slate-900 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} flex font-sans relative transition-colors duration-200`}>
      
      {/* SIDEBAR LATERAL */}
      <Sidebar ativo="configuracoes" escuro={modoEscuro} />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 flex flex-col gap-6 max-w-5xl mx-auto relative">
        
        <BarraTopo escuro={modoEscuro} />

        <section 
          className="w-full h-28 rounded-3xl p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center"
          style={{
            background: 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)'
          }}
        >
          <h1 className="text-3xl font-extrabold drop-shadow-sm">Configurações</h1>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2 items-start">
          
          {/* SEÇÃO SISTEMA */}
          <div className="flex flex-col gap-3">
            <h2 className={`text-center font-bold ${modoEscuro ? 'text-slate-300' : 'text-slate-600'} text-sm`}>Sistema</h2>

            <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-[#FAF8FC] border-purple-100/80'} border rounded-3xl p-6 flex flex-col gap-5 shadow-xs`}>
              
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-medium text-slate-400">Ativar/Desativar</span>
                <div className={`${modoEscuro ? 'bg-slate-700 border-slate-600' : 'bg-white/90 border-purple-100'} border rounded-2xl p-3.5 flex items-center justify-between shadow-xs`}>
                  <div className="flex items-center gap-3">
                    <Bell className={`w-4 h-4 ${modoEscuro ? 'text-slate-300' : 'text-slate-600'}`} />
                    <span className={`text-xs font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>Notificações</span>
                  </div>
                  
                  <button 
                    onClick={() => salvarPreferencia({ notificacoes_ativas: !notificacoesAtivas })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      notificacoesAtivas ? 'bg-[#5F7DE3]' : 'bg-slate-300'
                    }`}
                  >
                    <div 
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        notificacoesAtivas ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-medium text-slate-400">Termos e Regras</span>
                
                <div className="flex flex-col gap-2.5">
                  <button 
                    onClick={() => setModalConteudo({
                      titulo: 'Termos de Privacidade',
                      subtitulo: 'Segurança e Proteção de Dados',
                      texto: 'O projeto C.A.S.A respeita totalmente a sua privacidade. Todos os dados de uso dos botões e histórico de acionamentos são mantidos de forma segura e criptografada para o acompanhamento dos responsáveis e educadores.',
                      icone: ShieldCheck
                    })}
                    className={`${modoEscuro ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white/90 border-purple-100 hover:bg-slate-50'} border rounded-2xl p-3.5 flex items-center gap-3 shadow-xs transition-all cursor-pointer text-left`}
                  >
                    <FileText className={`w-4 h-4 ${modoEscuro ? 'text-slate-300' : 'text-slate-600'}`} />
                    <span className={`text-xs font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>Termos de privacidade</span>
                  </button>

                  <button 
                    onClick={() => setModalConteudo({
                      titulo: 'Informações do Sistema',
                      subtitulo: 'Plataforma C.A.S.A v1.0',
                      texto: 'O C.A.S.A (Comunicação Alternativa e Suporte Assistivo) é uma plataforma desenvolvida para conectar dispositivos físicos baseados em microcontroladores ESP32 a pranchas de comunicação dinâmica para pessoas com necessidades especiais.',
                      icone: Info
                    })}
                    className={`${modoEscuro ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white/90 border-purple-100 hover:bg-slate-50'} border rounded-2xl p-3.5 flex items-center gap-3 shadow-xs transition-all cursor-pointer text-left`}
                  >
                    <Info className={`w-4 h-4 ${modoEscuro ? 'text-slate-300' : 'text-slate-600'}`} />
                    <span className={`text-xs font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>Informações</span>
                  </button>

                  <button 
                    onClick={() => setModalConteudo({
                      titulo: 'Suporte Técnico',
                      subtitulo: 'Como podemos ajudar?',
                      texto: 'Precisa de ajuda com a sincronização do hardware ESP32 ou personalização das vozes? Entre em contato com nossa equipe de suporte através do e-mail suporte@projetocasa.org ou consulte nossos tutoriais.',
                      icone: HelpCircle
                    })}
                    className={`${modoEscuro ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white/90 border-purple-100 hover:bg-slate-50'} border rounded-2xl p-3.5 flex items-center gap-3 shadow-xs transition-all cursor-pointer text-left`}
                  >
                    <HelpCircle className={`w-4 h-4 ${modoEscuro ? 'text-slate-300' : 'text-slate-600'}`} />
                    <span className={`text-xs font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>Suporte</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO ACESSIBILIDADE E CONTA */}
          <div className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-3">
              <h2 className={`text-center font-bold ${modoEscuro ? 'text-slate-300' : 'text-slate-600'} text-sm`}>Acessibilidade</h2>

              <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-[#FAF8FC] border-purple-100/80'} border rounded-3xl p-6 flex flex-col gap-5 shadow-xs`}>
                
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-slate-400">Modo Claro/Escuro</span>
                  <div className={`${modoEscuro ? 'bg-slate-700 border-slate-600' : 'bg-white/90 border-purple-100'} border rounded-2xl p-3.5 flex items-center justify-between shadow-xs`}>
                    <div className="flex items-center gap-3">
                      <Moon className={`w-4 h-4 ${modoEscuro ? 'text-slate-300' : 'text-slate-600'}`} />
                      <span className={`text-xs font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>Modo Escuro</span>
                    </div>

                    <button 
                      onClick={() => salvarPreferencia({ modo_escuro: !modoEscuro })}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        modoEscuro ? 'bg-[#5F7DE3]' : 'bg-slate-300'
                      }`}
                    >
                      <div 
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          modoEscuro ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-slate-400">Tamanho da Fonte</span>
                  <div className={`${modoEscuro ? 'bg-slate-700 border-slate-600' : 'bg-white/90 border-purple-100'} border rounded-2xl p-3.5 flex items-center justify-between shadow-xs`}>
                    <span className={`font-extrabold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'} text-sm`}>Tt</span>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={aumentarFonte}
                        className="w-7 h-7 rounded-lg bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-medium text-slate-400 px-3 py-1 bg-slate-50 border border-slate-100 rounded-md min-w-12 text-center">
                        {tamanhoFonte}px
                      </span>

                      <button 
                        onClick={diminuirFonte}
                        className="w-7 h-7 rounded-lg bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className={`text-center font-bold ${modoEscuro ? 'text-slate-300' : 'text-slate-600'} text-sm`}>Conta</h2>

              <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-[#FAF8FC] border-purple-100/80'} border rounded-3xl p-6 shadow-xs`}>
                <button 
                  onClick={() => setShowExcluirContaModal(true)}
                  className="w-full bg-white/90 border border-rose-100/80 rounded-2xl p-3.5 flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-600">Excluir conta</span>
                </button>
              </div>
            </div>

          </div>

        </div>


      </main>

      {/* MODAL INFORMATIVO (TERMOS / INFORMAÇÕES / SUPORTE) */}
      {modalConteudo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 relative flex flex-col gap-4 text-center items-center">
            
            <button 
              onClick={() => setModalConteudo(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-[#5F7DE3]/10 text-[#5F7DE3] flex items-center justify-center shrink-0">
              <modalConteudo.icone className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">{modalConteudo.titulo}</h3>
              <span className="text-xs text-[#5F7DE3] font-semibold">{modalConteudo.subtitulo}</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              {modalConteudo.texto}
            </p>

            <button 
              onClick={() => setModalConteudo(null)}
              className="w-full py-3.5 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-xs transition-all shadow-md shadow-[#5F7DE3]/20 cursor-pointer mt-2"
            >
              Entendido
            </button>

          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO EXCLUIR CONTA */}
      {showExcluirContaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-center flex flex-col items-center gap-4">
            
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">Deseja excluir a conta?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação apagará permanentemente todas as suas categorias, botões personalizados e histórico de acionamentos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button 
                onClick={() => setShowExcluirContaModal(false)}
                className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button 
                onClick={handleExcluirConta}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>

          </div>
        </div>
      )}

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