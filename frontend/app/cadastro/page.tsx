'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { mensagemApi, semConexao } from '@/lib/erro';

function mensagemDoErro(err: unknown, padrao: string): string {
  if (semConexao(err)) return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
  return mensagemApi(err, padrao);
}

export default function Cadastro() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Etapa 1: dados  ·  Etapa 2: código de 6 dígitos recebido por e-mail.
  // A conta SÓ é criada no Firebase depois que o código é confirmado.
  const [etapa, setEtapa] = useState<'dados' | 'codigo'>('dados');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);

  // FEEDBACK
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
    acaoSucesso?: () => void;
  }>({ tipo: null, titulo: '', mensagem: '' });

  const validarSenha = (senhaVal: string) => {
    const temTamanhoMinimo = senhaVal.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senhaVal);
    const temNumeroOuEspecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(senhaVal);

    return temTamanhoMinimo && temMaiuscula && temNumeroOuEspecial;
  };

  // ETAPA 1: valida e pede o envio do código (ainda não cria a conta)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Campos Incompletos',
        mensagem: 'Por favor, preencha todos os campos do formulário para realizar o cadastro.'
      });
      return;
    }

    if (!validarSenha(senha)) {
      setFeedback({
        tipo: 'atencao',
        titulo: 'Senha Inválida',
        mensagem: 'Sua senha deve ter no mínimo 8 caracteres, uma letra maiúscula e um número ou caractere especial.'
      });
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/cadastro', { nome: nome.trim(), email: email.trim(), senha });
      setCodigo('');
      setEtapa('codigo');
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Código Enviado',
        mensagem: `Enviamos um código de 6 dígitos para ${email.trim()}. Digite-o para concluir o cadastro. Confira também o spam.`
      });
    } catch (err) {
      setFeedback({ tipo: 'erro', titulo: 'Falha no Cadastro', mensagem: mensagemDoErro(err, 'Não foi possível iniciar o cadastro.') });
    } finally {
      setEnviando(false);
    }
  };

  // ETAPA 2: confere o código; o servidor cria a conta e já entramos
  const handleConfirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    if (!/^\d{6}$/.test(codigo)) {
      setFeedback({ tipo: 'atencao', titulo: 'Código Inválido', mensagem: 'Digite os 6 números do código enviado ao seu e-mail.' });
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/confirmar', { email: email.trim(), codigo, senha });
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      await api.get('/me'); // cria o perfil no Firestore
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Cadastro Realizado!',
        mensagem: 'Sua conta foi criada com sucesso no sistema C.A.S.A.',
        acaoSucesso: () => router.push('/dashboard')
      });
    } catch (err) {
      setFeedback({ tipo: 'erro', titulo: 'Falha na Confirmação', mensagem: mensagemDoErro(err, 'Não foi possível confirmar o código.') });
    } finally {
      setEnviando(false);
    }
  };

  const handleReenviar = async () => {
    try {
      await api.post('/auth/reenviar-codigo', { email: email.trim() });
      setFeedback({ tipo: 'sucesso', titulo: 'Código Reenviado', mensagem: 'Se o cadastro ainda estiver pendente, enviamos um novo código.' });
    } catch (err) {
      setFeedback({ tipo: 'erro', titulo: 'Não foi Possível Reenviar', mensagem: mensagemDoErro(err, 'Tente novamente em instantes.') });
    }
  };

  const handleFecharFeedback = () => {
    const acao = feedback.acaoSucesso;
    setFeedback({ tipo: null, titulo: '', mensagem: '' });
    if (acao) {
      acao();
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans relative">

      {/* BOTÃO VOLTAR PARA A LANDING PAGE */}
      <Link 
        href="/"
        className="absolute top-6 left-6 z-50 flex items-center justify-center p-3 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md text-slate-700 font-semibold text-xs transition-all shadow-md hover:scale-105 border border-slate-200/60 cursor-pointer"
        title="Voltar ao início"
      >
        <ArrowLeft className="w-4 h-4 text-[#5F7DE3]" />
      </Link>

      {/* PAINEL DEGRADÊ LATERAL (DESKTOP) */}
      <div 
        className="hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-center items-center text-white p-12 relative overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)'
        }}
      >
        <div className="flex flex-col items-center text-center gap-6 max-w-sm z-10">
          <h2 className="text-4xl font-extrabold tracking-tight drop-shadow-sm">
            Já tem uma conta?
          </h2>
          
          <Link href="/login">
            <button 
              type="button" 
              className="flex items-center gap-3 px-8 py-3.5 rounded-full border-2 border-white/80 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-sm transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Acesse já</span>
            </button>
          </Link>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO */}
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
              {etapa === 'dados' ? 'Cadastrar' : 'Confirme seu e-mail'}
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
              {etapa === 'dados'
                ? 'Insira as informações abaixo para criar sua conta de responsável.'
                : `Digite o código de 6 dígitos enviado para ${email.trim()}. Sua conta só será criada após a confirmação.`}
            </p>
          </div>

          {etapa === 'dados' ? (
          <form 
            onSubmit={handleSubmit}
            className="w-full bg-[#FAF8FC] border border-purple-100/80 rounded-3xl p-6 sm:p-8 flex flex-col gap-4 shadow-xs"
          >

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Nome:</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#5F7DE3] shadow-xs transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">E-mail:</label>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Senha:</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-white border border-purple-100 rounded-2xl pl-11 pr-24 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#5F7DE3] shadow-xs transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-[#5F7DE3] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-slate-600">Regras de Senha:</span>
              <div className="w-full bg-[#EFE9A3]/70 border border-[#E5DC87] rounded-2xl p-4 text-[11px] text-slate-600 leading-relaxed font-medium">
                <ul className="list-disc list-inside flex flex-col gap-1">
                  <li>Mínimo de 8 caracteres</li>
                  <li>Pelo menos uma letra maiúscula</li>
                  <li>Pelo menos um número ou caractere especial</li>
                </ul>
              </div>
            </div>

            <button 
              type="submit"
              disabled={enviando}
              className="w-full py-3.5 disabled:opacity-60 rounded-2xl bg-gradient-to-r from-[#94A7EB] to-[#6A81D6] hover:from-[#8196E6] hover:to-[#5770C9] text-white font-semibold text-sm transition-all shadow-md shadow-[#5F7DE3]/20 cursor-pointer mt-2"
            >
              {enviando ? 'Enviando...' : 'Continuar'}
            </button>

          </form>
          ) : (
          <form
            onSubmit={handleConfirmarCodigo}
            className="w-full bg-[#FAF8FC] border border-purple-100/80 rounded-3xl p-6 sm:p-8 flex flex-col gap-4 shadow-xs"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Código de confirmação:</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-purple-100 rounded-2xl px-4 py-3 text-center text-lg tracking-[0.5em] font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#5F7DE3] shadow-xs transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#94A7EB] to-[#6A81D6] hover:from-[#8196E6] hover:to-[#5770C9] disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-md shadow-[#5F7DE3]/20 cursor-pointer mt-2"
            >
              {enviando ? 'Confirmando...' : 'Confirmar e criar conta'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setEtapa('dados')} className="font-semibold text-slate-400 hover:text-slate-600 cursor-pointer">
                ← Corrigir dados
              </button>
              <button type="button" onClick={handleReenviar} className="font-semibold text-[#5F7DE3] hover:underline cursor-pointer">
                Reenviar código
              </button>
            </div>
          </form>
          )}

          <div className="md:hidden text-center mt-2">
            <span className="text-xs text-slate-500">Já tem uma conta? </span>
            <Link href="/login" className="text-xs font-bold text-[#5F7DE3] hover:underline">
              Acesse já
            </Link>
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
              type="button"
              onClick={handleFecharFeedback} 
              className="w-full py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-xs cursor-pointer shadow-md transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}