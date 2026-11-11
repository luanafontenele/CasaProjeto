'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  User, 
  Mail, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  FileText, 
  Cpu, 
  HeartHandshake, 
  Sparkles,
  ArrowRight,
  Download
} from 'lucide-react';

export default function Home() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Monitora scroll para transição gradual contínua do header e seção ativa
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      // Fade-in progressivo de 0 a 1 entre 0px e 140px de rolagem
      const progress = Math.min(1, Math.max(0, currentScroll / 140));
      setScrollProgress(progress);

      const sections = ['sobre', 'projeto', 'equipe', 'contato'];
      const scrollPosition = currentScroll + 200;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !mensagem) return;
    setEnviado(true);
  };

  // INTEGRANTES EM ORDEM ALFABÉTICA (A -> Z)
  const primeiraLinha = [
    {
      nome: 'Brenno',
      cargo: 'Desenvolvedor Back-end',
      foto: '/brenno.jpeg',
      inicial: 'B',
    },
    {
      nome: 'Eduarda',
      cargo: 'Desenvolvedora Front-end e UI/UX Designer',
      foto: '/eduarda.jpeg',
      inicial: 'E',
    },
    {
      nome: 'Ellen',
      cargo: 'Artista e Desenvolvedora Front-end',
      foto: '/ellen.jpeg',
      inicial: 'E',
    },
  ];

  const segundaLinha = [
    {
      nome: 'Luana',
      cargo: 'Desenvolvedora Front-end',
      foto: '/luana.jpeg',
      inicial: 'L',
    },
    {
      nome: 'Zeus',
      cargo: 'Desenvolvedor Back-end e IoT',
      foto: '/zeus.jpeg',
      inicial: 'Z',
    },
  ];

  const navLinks = [
    { href: '#sobre', label: 'Sobre', id: 'sobre' },
    { href: '#projeto', label: 'Projeto', id: 'projeto' },
    { href: '#equipe', label: 'Equipe', id: 'equipe' },
    { href: '#contato', label: 'Contato', id: 'contato' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* HEADER / NAV BAR (Transição gradual proporcional ao scroll) */}
      <header 
        className="sticky top-4 z-50 w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between rounded-2xl"
        style={{
          backgroundColor: `rgba(255, 255, 255, ${scrollProgress * 0.88})`,
          backdropFilter: scrollProgress > 0.05 ? `blur(${scrollProgress * 12}px)` : 'none',
          WebkitBackdropFilter: scrollProgress > 0.05 ? `blur(${scrollProgress * 12}px)` : 'none',
          borderColor: `rgba(226, 232, 240, ${scrollProgress * 0.85})`,
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow: scrollProgress > 0.05 
            ? `0 1px 3px 0 rgba(0, 0, 0, ${scrollProgress * 0.06}), 0 1px 2px -1px rgba(0, 0, 0, ${scrollProgress * 0.06})` 
            : 'none',
        }}
      >
        
        {/* Logo C.A.S.A */}
        <div className="flex items-center">
          <a 
            href="#hero" 
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Ir para o início"
            className="relative w-16 h-16 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            <Image 
              src="/logosemtitulo.svg" 
              alt="Logo C.A.S.A - Início" 
              width={64} 
              height={64} 
              className="object-contain"
              priority 
            />
          </a>
        </div>

        {/* Menu de Navegação com Sublinhado Ativo */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a 
                key={link.id} 
                href={link.href} 
                className={`relative py-1.5 transition-all duration-200 hover:text-[#5F7DE3] cursor-pointer ${
                  isActive ? 'text-[#5F7DE3] font-bold' : ''
                }`}
              >
                {link.label}
                <span 
                  className={`absolute bottom-0 left-0 h-[2.5px] bg-[#5F7DE3] rounded-full transition-all duration-300 ${
                    isActive ? 'w-full opacity-100' : 'w-0 opacity-0'
                  }`} 
                />
              </a>
            );
          })}
        </nav>

        {/* Grupo de Botões */}
        <div className="flex items-center gap-3">
          <Link 
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-[#5F7DE3] hover:bg-slate-100 hover:border-slate-300 active:scale-[0.98] border border-slate-200 rounded-xl transition-all duration-200 cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            Entrar 
          </Link>

          <Link 
            href="/cadastro"
            className="px-4 py-2 text-sm font-semibold text-white bg-[#5F7DE3] hover:bg-[#4d6bd3] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] rounded-xl transition-all duration-200 shadow-sm cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            Cadastrar 
          </Link>
        </div>

      </header>

      <main className="flex-1 max-w-6xl 2xl:max-w-7xl w-full mx-auto px-6 py-4 flex flex-col gap-16">

        {/* BANNER HERO (Escalado puramente em viewport height para 2K, 1080p e mobile) */}
        <section 
          id="hero"
          className="w-full h-[78vh] min-h-[460px] rounded-3xl flex flex-col items-center justify-center text-center p-6 sm:p-12 2xl:p-20 shadow-xl shadow-blue-500/5 relative overflow-hidden backdrop-blur-md border border-white/30 scroll-mt-28"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 172, 70, 0.78) 0%, rgba(101, 134, 243, 0.82) 48%, rgba(77, 102, 184, 0.85) 82%, rgba(59, 78, 141, 0.88) 100%)'
          }}
        >
          <div className="text-center text-white z-10 max-w-3xl 2xl:max-w-5xl flex flex-col items-center gap-5 2xl:gap-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl 2xl:text-7xl font-extrabold tracking-tight text-white drop-shadow-sm leading-tight animate-in fade-in duration-700">
              Projeto C.A.S.A.
            </h1>
            <p className="text-white/95 font-medium text-base sm:text-lg md:text-xl 2xl:text-2xl leading-relaxed max-w-2xl 2xl:max-w-4xl drop-shadow-xs px-2 animate-in fade-in duration-700 delay-150">
              Comunicação Alternativa para Suporte a Autistas: Tecnologia assistiva e IoT promovendo a autonomia e a inclusão comunicacional.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2 animate-in fade-in duration-700 delay-300">
              <a
                href="#sobre"
                className="px-6 py-3.5 bg-white text-slate-900 hover:bg-slate-100 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98] font-bold text-sm sm:text-base rounded-xl transition-all duration-200 shadow-md cursor-pointer min-h-[44px] flex items-center"
              >
                Conhecer o Projeto
              </a>
              <Link
                href="/login"
                className="group px-6 py-3.5 bg-black/20 hover:bg-black/35 hover:border-white/50 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98] backdrop-blur-xs text-white border border-white/30 font-semibold text-sm sm:text-base rounded-xl transition-all duration-200 shadow-md cursor-pointer min-h-[44px] flex items-center gap-2"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform duration-200" />
              </Link>
            </div>
          </div>
        </section>

        {/* SEÇÃO SOBRE O PROJETO COM CARDS E TEXTO JUSTIFICADO */}
        <section id="sobre" className="flex flex-col items-center text-center gap-10 py-4 scroll-mt-28">
          <div className="flex flex-col gap-2 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sobre o Projeto</h2>
            <p className="text-sm text-slate-600 font-normal leading-relaxed">
              Unimos hardware interativo e software em nuvem para criar pontes de comunicação no dia a dia.
            </p>
          </div>
          
          {/* Cards de Recursos e Diferenciais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center gap-4 hover:-translate-y-2 hover:shadow-xl hover:border-[#5F7DE3]/50 transition-all duration-300 ease-out group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-[#5F7DE3]/10 text-[#5F7DE3] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-slate-800 text-base group-hover:text-[#5F7DE3] transition-colors duration-200">
                  Inclusão & Empatia
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Baseado no método PECS (troca de figuras), permitindo que crianças com TEA de níveis 1 e 2 de suporte se expressem com facilidade.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center gap-4 hover:-translate-y-2 hover:shadow-xl hover:border-[#5F7DE3]/50 transition-all duration-300 ease-out group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Cpu className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-slate-800 text-base group-hover:text-[#5F7DE3] transition-colors duration-200">
                  Hardware IoT Interativo
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Dispositivo físico microcontrolado (ESP32) equipado com telas IPS, retorno tátil (vibracall) e síntese/gravação de áudios em tempo real.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center gap-4 hover:-translate-y-2 hover:shadow-xl hover:border-[#5F7DE3]/50 transition-all duration-300 ease-out group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-slate-800 text-base group-hover:text-[#5F7DE3] transition-colors duration-200">
                  Personalização Total
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Painel de gerenciamento completo onde pais e terapeutas ajustam categorias, cadastram vozes personalizadas e acompanham o desempenho.
                </p>
              </div>
            </div>

          </div>

          {/* Texto descritivo sem fundo roxo */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 text-left shadow-xs flex flex-col gap-4">
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#5F7DE3]"></span>
              O que é o Projeto C.A.S.A.?
            </h3>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal text-justify">
              O <strong>C.A.S.A. (Comunicação Alternativa para Suporte a Autistas)</strong> é um ecossistema de tecnologia assistiva desenvolvido para mitigar barreiras na comunicação e interação social de crianças no espectro autista. Integrando um dispositivo físico inteligente com conectividade sem fio a uma plataforma web e móvel, o sistema possibilita que responsáveis e educadores personalizem a prancha de comunicação com pictogramas, categorias de rotina e mensagens de áudio gravadas com a própria voz da família. Ao pressionar um botão, a criança recebe feedback multissensorial simultâneo (imagem, som e vibração), auxiliando na autoexpressão, prevenindo frustrações e promovendo a autonomia cotidiana.
            </p>
          </div>
        </section>

        <hr className="border-slate-200" />

        {/* SEÇÃO DO PROJETO COM IMAGENS */}
        <section id="projeto" className="flex flex-col items-center text-center gap-8 scroll-mt-28">
          <div className="flex flex-col gap-2 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Visão Geral do Sistema</h2>
            <p className="text-sm text-slate-600 font-normal leading-relaxed">
              Conheça o dispositivo físico interativo e a plataforma de gerenciamento web do C.A.S.A.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:-translate-y-2 hover:border-[#5F7DE3]/60 hover:shadow-2xl transition-all duration-300 ease-out group overflow-hidden cursor-default flex flex-col items-center gap-4">
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-100">
                <Image 
                  src="/casa.jpeg" 
                  alt="Dispositivo Físico C.A.S.A." 
                  fill 
                  className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h3 className="font-bold text-slate-800 text-base group-hover:text-[#5F7DE3] transition-colors duration-200">
                  Dispositivo IoT Físico
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Prancha de comunicação com botões físicos, telas IPS coloridas e retorno auditivo e tátil.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:-translate-y-2 hover:border-[#5F7DE3]/60 hover:shadow-2xl transition-all duration-300 ease-out group overflow-hidden cursor-default flex flex-col items-center gap-4">
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-100">
                <Image 
                  src="/sistema.png" 
                  alt="Plataforma de Gerenciamento C.A.S.A." 
                  fill 
                  className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h3 className="font-bold text-slate-800 text-base group-hover:text-[#5F7DE3] transition-colors duration-200">
                  Plataforma de Gerenciamento
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Dashboard web para personalização de botões, acompanhamento de histórico e estatísticas.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-2">
            <button className="group px-8 py-3.5 bg-slate-900 hover:bg-slate-800 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98] text-white text-sm font-semibold rounded-2xl transition-all duration-200 shadow-md flex items-center gap-2.5 cursor-pointer min-h-[44px] focus:ring-4 focus:ring-slate-400/30 focus:outline-none">
              <Download className="w-4 h-4 text-[#5F7DE3] group-hover:translate-y-0.5 transition-transform duration-200" />
              <span>Baixar App / Documentação do Projeto</span>
            </button>
          </div>
        </section>

        <hr className="border-slate-200" />

        {/* SEÇÃO DA EQUIPE (A -> Z) */}
        <section id="equipe" className="flex flex-col items-center text-center gap-8 scroll-mt-28">
          <div className="flex flex-col gap-2 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Equipe</h2>
            <p className="text-sm text-slate-600 font-normal leading-relaxed">
              Integrantes responsáveis pelo desenvolvimento do ecossistema C.A.S.A.
            </p>
          </div>
          
          <div className="flex flex-col gap-6 w-full max-w-4xl">
            {/* Primeira Linha (Brenno, Eduarda, Ellen) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {primeiraLinha.map((membro) => (
                <div 
                  key={membro.nome}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-3 hover:-translate-y-2 hover:border-[#5F7DE3]/60 hover:shadow-xl transition-all duration-300 ease-out group cursor-default"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-[#5F7DE3] overflow-hidden shrink-0 relative shadow-xs bg-[#5F7DE3]/10 group-hover:scale-110 group-hover:ring-4 group-hover:ring-[#5F7DE3]/15 transition-all duration-300">
                    <Image 
                      src={membro.foto}
                      alt={`Foto de ${membro.nome}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#5F7DE3] transition-colors duration-200">
                      {membro.nome}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-snug">
                      {membro.cargo}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Segunda Linha (Luana, Zeus) */}
            <div className="flex flex-col md:flex-row justify-center gap-6 w-full">
              {segundaLinha.map((membro) => (
                <div 
                  key={membro.nome}
                  className="w-full md:w-[calc(33.333%-1rem)] bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-3 hover:-translate-y-2 hover:border-[#5F7DE3]/60 hover:shadow-xl transition-all duration-300 ease-out group cursor-default"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-[#5F7DE3] overflow-hidden shrink-0 relative shadow-xs bg-[#5F7DE3]/10 group-hover:scale-110 group-hover:ring-4 group-hover:ring-[#5F7DE3]/15 transition-all duration-300">
                    <Image 
                      src={membro.foto}
                      alt={`Foto de ${membro.nome}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#5F7DE3] transition-colors duration-200">
                      {membro.nome}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-snug">
                      {membro.cargo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-slate-200" />

        {/* SEÇÃO DE CONTATO */}
        <section id="contato" className="flex flex-col items-center text-center gap-8 pb-8 scroll-mt-28">
          <div className="flex flex-col gap-2 max-w-md mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Fale Conosco</h2>
            <p className="text-sm text-slate-600 font-normal leading-relaxed">
              Tem alguma dúvida ou quer saber mais sobre o projeto C.A.S.A.? Mande uma mensagem para a nossa equipe!
            </p>
          </div>

          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 text-left">
            {!enviado ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 group">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 group-focus-within:text-[#5F7DE3] transition-colors duration-200">Seu Nome:</label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 group-focus-within:text-[#5F7DE3] absolute left-4 pointer-events-none transition-colors duration-200" />
                      <input 
                        type="text" 
                        placeholder="Ana Silva"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#5F7DE3] focus:ring-4 focus:ring-[#5F7DE3]/15 transition-all duration-200 min-h-[44px]"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 group">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 group-focus-within:text-[#5F7DE3] transition-colors duration-200">Seu E-mail:</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-[#5F7DE3] absolute left-4 pointer-events-none transition-colors duration-200" />
                      <input 
                        type="email" 
                        placeholder="ana@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#5F7DE3] focus:ring-4 focus:ring-[#5F7DE3]/15 transition-all duration-200 min-h-[44px]"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 group">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 group-focus-within:text-[#5F7DE3] transition-colors duration-200">Assunto:</label>
                  <div className="relative flex items-center">
                    <FileText className="w-4 h-4 text-slate-400 group-focus-within:text-[#5F7DE3] absolute left-4 pointer-events-none transition-colors duration-200" />
                    <input 
                      type="text" 
                      placeholder="Dúvida, sugestão, parceria..."
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#5F7DE3] focus:ring-4 focus:ring-[#5F7DE3]/15 transition-all duration-200 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 group">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 group-focus-within:text-[#5F7DE3] transition-colors duration-200">Sua Mensagem:</label>
                  <div className="relative flex items-start">
                    <MessageSquare className="w-4 h-4 text-slate-400 group-focus-within:text-[#5F7DE3] absolute left-4 top-3.5 pointer-events-none transition-colors duration-200" />
                    <textarea 
                      rows={4}
                      placeholder="Escreva sua mensagem aqui..."
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#5F7DE3] focus:ring-4 focus:ring-[#5F7DE3]/15 transition-all duration-200 resize-none"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="group w-full py-3.5 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#5F7DE3]/25 active:translate-y-0 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2 min-h-[44px] focus:ring-4 focus:ring-[#5F7DE3]/30 focus:outline-none"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  <span>Enviar Mensagem</span>
                </button>

              </form>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 py-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Mensagem Enviada!</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
                  Obrigado pelo contato, <span className="font-semibold text-slate-700">{nome}</span>! Nossa equipe responderá no e-mail fornecido em breve.
                </p>
                <button 
                  onClick={() => {
                    setEnviado(false);
                    setNome('');
                    setEmail('');
                    setAssunto('');
                    setMensagem('');
                  }}
                  className="text-sm text-[#5F7DE3] font-semibold hover:underline hover:text-[#4d6bd3] mt-2 cursor-pointer min-h-[40px] flex items-center transition-colors duration-200"
                >
                  Enviar outra mensagem
                </button>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* FOOTER COMPLETO E ESTILIZADO */}
      <footer className="w-full bg-white border-t border-slate-200 mt-12 py-12 text-slate-600">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="flex flex-col gap-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <a 
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Voltar ao início"
                className="relative w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
              >
                <Image 
                  src="/logosemtitulo.svg" 
                  alt="Logo C.A.S.A - Início" 
                  width={40} 
                  height={40} 
                  className="object-contain"
                />
              </a>
              <a 
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-extrabold text-[#5F7DE3] text-lg tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
              >
                C.A.S.A.
              </a>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Comunicação Alternativa para Suporte a Autistas. Tecnologia assistiva focada em promover autonomia, comunicação fluida e inclusão social.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Navegação</h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-600">
              <li><a href="#sobre" className="hover:text-[#5F7DE3] hover:translate-x-1 transition-all duration-200 inline-block cursor-pointer">Sobre o Projeto</a></li>
              <li><a href="#projeto" className="hover:text-[#5F7DE3] hover:translate-x-1 transition-all duration-200 inline-block cursor-pointer">Recursos & Download</a></li>
              <li><a href="#equipe" className="hover:text-[#5F7DE3] hover:translate-x-1 transition-all duration-200 inline-block cursor-pointer">Nossa Equipe</a></li>
              <li><a href="#contato" className="hover:text-[#5F7DE3] hover:translate-x-1 transition-all duration-200 inline-block cursor-pointer">Fale Conosco</a></li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Acesso ao Sistema</h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/login" className="hover:text-[#5F7DE3] hover:translate-x-1 transition-all duration-200 flex items-center gap-1 cursor-pointer group">
                  <span>Área do Responsável</span>
                  <ArrowRight className="w-3 h-3 text-[#5F7DE3] group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </li>
              <li>
                <Link href="/cadastro" className="hover:text-[#5F7DE3] hover:translate-x-1 transition-all duration-200 flex items-center gap-1 cursor-pointer group">
                  <span>Criar Nova Conta</span>
                  <ArrowRight className="w-3 h-3 text-[#5F7DE3] group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Institucional</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Projeto acadêmico desenvolvido na <strong>Fatec Praia Grande</strong> no curso de Desenvolvimento de Software Multiplataforma.
            </p>
          </div>

        </div>

        <div className="max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 Projeto C.A.S.A. Todos os direitos reservados.</p>
          <p>Desenvolvido pela Equipe Selenes.</p>
        </div>
      </footer>

    </div>
  );
}