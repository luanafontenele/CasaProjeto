'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { codigoFirebase } from '@/lib/erro';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // MODAL DE FEEDBACK
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Campo Obrigatório',
        mensagem: 'Por favor, informe o seu e-mail cadastrado para continuar.'
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const codigoFb = codigoFirebase(err);
      // Só mostra erro para problemas que o usuário pode corrigir ou tentar de novo
      if (codigoFb === 'auth/invalid-email' || codigoFb === 'auth/too-many-requests') {
        setFeedback({
          tipo: 'erro',
          titulo: codigoFb === 'auth/invalid-email' ? 'E-mail Inválido' : 'Muitas Tentativas',
          mensagem: codigoFb === 'auth/invalid-email'
            ? 'O e-mail informado não parece válido. Confira e tente de novo.'
            : 'Aguarde alguns minutos antes de tentar novamente.'
        });
        return;
      }
    }

    // Mensagem igual exista a conta ou não (não revela quais e-mails estão cadastrados)
    setIsSubmitted(true);
    setFeedback({
      tipo: 'sucesso',
      titulo: 'Instruções Enviadas',
      mensagem: `Se existir uma conta para ${email}, enviamos o link de redefinição. Confira também a caixa de spam.`
    });
  };


  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans relative">
      
      {/* BOTÃO VOLTAR PARA LOGIN */}
      <Link 
        href="/login"
        className="absolute top-6 left-6 z-50 flex items-center justify-center p-3 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md text-slate-700 font-semibold text-xs transition-all shadow-md hover:scale-105 border border-slate-200/60 cursor-pointer"
        title="Voltar para o Login"
      >
        <ArrowLeft className="w-4 h-4 text-[#5F7DE3]" />
      </Link>

      {/* PAINEL LATERAL DEGRADÊ (DESKTOP) */}
      <div 
        className="hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-center items-center text-white p-12 relative overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)'
        }}
      >
        <div className="flex flex-col items-center text-center gap-6 max-w-sm z-10">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <KeyRound className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">
            Recuperação de Acesso
          </h2>
          
          <p className="text-xs text-white/80 leading-relaxed font-medium">
            Não se preocupe! Digite seu e-mail cadastrado e enviaremos um link seguro para redefinir sua senha de acesso ao C.A.S.A.
          </p>
        </div>
      </div>

      {/* PAINEL DIREITO DE FORMULÁRIO */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 bg-white">
        
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <Image 
              src="/logo.png" 
              alt="Logo C.A.S.A" 
              width={96} 
              height={96} 
              className="object-contain"
              priority 
            />
          </div>

          <div className="text-center flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold text-[#5F7DE3]">
              Esqueci a Senha
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
              {isSubmitted 
                ? 'Verifique a caixa de entrada do seu e-mail' 
                : 'Informe seu e-mail para receber as instruções de redefinição'
              }
            </p>
          </div>

          <div className="w-full bg-[#FAF8FC] border border-purple-100/80 rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-xs">
            
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">E-mail cadastrado:</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input 
                      type="email" 
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#5F7DE3] shadow-xs transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#94A7EB] to-[#6A81D6] hover:from-[#8196E6] hover:to-[#5770C9] text-white font-semibold text-sm transition-all shadow-md shadow-[#5F7DE3]/20 cursor-pointer mt-2"
                >
                  Enviar Instruções
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 py-4 animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">E-mail enviado com sucesso!</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                  Enviamos as instruções para <span className="font-semibold text-slate-700">{email}</span>. Verifique também a pasta de spam.
                </p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs text-[#5F7DE3] font-semibold hover:underline mt-2 cursor-pointer"
                >
                  Tentar outro e-mail
                </button>
              </div>
            )}

            <div className="text-center pt-2 border-t border-purple-100/60">
              <Link 
                href="/login"
                className="text-xs font-semibold text-slate-500 hover:text-[#5F7DE3] transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o Login</span>
              </Link>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL FEEDBACK */}
      {feedback.tipo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-center flex flex-col items-center gap-4">
            {feedback.tipo === 'sucesso' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
            {feedback.tipo === 'erro' && <XCircle className="w-12 h-12 text-rose-500" />}
            {feedback.tipo === 'atencao' && <AlertTriangle className="w-12 h-12 text-amber-500" />}
            
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">{feedback.titulo}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{feedback.mensagem}</p>
            </div>

            <button 
              onClick={() => setFeedback({ tipo: null, titulo: '', mensagem: '' })} 
              className="w-full py-3 rounded-2xl bg-[#5F7DE3] text-white font-semibold text-xs cursor-pointer shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}