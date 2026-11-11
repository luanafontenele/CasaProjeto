'use client';

import React, { useState } from 'react';
import { Sparkles, Volume2, Mic, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export interface GeradorVozHumanizadaProps {
  textoInicial?: string;
  onAudioSelecionado: (arquivo: File, previewUrl: string) => void;
  modoEscuro?: boolean;
  altoContraste?: boolean;
  emitirSomBip?: (freq?: number, dur?: number) => void;
  rotuloAcao?: string;
}

const VOZES = [
  {
    id: 'pt-BR-FranciscaNeural',
    nome: 'Francisca',
    genero: 'feminino',
    tipo: 'Feminina',
    detalhe: 'Suave, natural e acolhedora',
    padrao: true,
  },
  {
    id: 'pt-BR-AntonioNeural',
    nome: 'Antônio',
    genero: 'masculino',
    tipo: 'Masculino',
    detalhe: 'Natural, firme e claro',
    padrao: false,
  },
];

export default function GeradorVozHumanizada({
  textoInicial = '',
  onAudioSelecionado,
  modoEscuro = false,
  altoContraste = false,
  emitirSomBip,
  rotuloAcao = 'esta ação',
}: GeradorVozHumanizadaProps) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(textoInicial);
  const [voz, setVoz] = useState('pt-BR-FranciscaNeural');
  const [gerando, setGerando] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioAplicado, setAudioAplicado] = useState(false);

  // Sincroniza se o texto inicial mudar e o usuário ainda não tiver customizado
  React.useEffect(() => {
    if (textoInicial && (!texto || texto === '')) {
      setTexto(textoInicial);
    }
  }, [textoInicial]);

  const obterAudioBlob = async (textoParaGerar: string, vozEscolhida: string): Promise<Blob> => {
    const res = await api.post(
      '/tts/preview',
      { texto: textoParaGerar.trim(), voz: vozEscolhida },
      { responseType: 'blob' }
    );
    return res.data;
  };

  const handleOuvirPrevia = async () => {
    const frase = (texto || textoInicial).trim();
    if (!frase) return;

    setGerando(true);
    emitirSomBip?.(600, 0.04);
    try {
      const blob = await obterAudioBlob(frase, voz);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const nomeLimpo = frase.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 25);
      const file = new File([blob], `${nomeLimpo || 'audio'}_tts.mp3`, { type: 'audio/mpeg' });
      setAudioFile(file);

      const audio = new Audio(url);
      setTocando(true);
      audio.onended = () => setTocando(false);
      audio.onerror = () => setTocando(false);
      await audio.play();
    } catch (e) {
      console.error('Erro ao gerar prévia humanizada:', e);
    } finally {
      setGerando(false);
    }
  };

  const handleAplicar = async () => {
    const frase = (texto || textoInicial).trim();
    if (!frase) return;

    emitirSomBip?.(800, 0.08);

    // Se já gerou previamente
    if (audioFile && audioUrl) {
      onAudioSelecionado(audioFile, audioUrl);
      setAudioAplicado(true);
      return;
    }

    // Se ainda não gerou, gera e aplica direto
    setGerando(true);
    try {
      const blob = await obterAudioBlob(frase, voz);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const nomeLimpo = frase.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 25);
      const file = new File([blob], `${nomeLimpo || 'audio'}_tts.mp3`, { type: 'audio/mpeg' });
      setAudioFile(file);
      onAudioSelecionado(file, url);
      setAudioAplicado(true);
    } catch (e) {
      console.error('Erro ao gerar e aplicar áudio:', e);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        altoContraste
          ? 'bg-zinc-950 border-amber-500'
          : modoEscuro
          ? 'bg-slate-900/80 border-slate-700/80'
          : 'bg-blue-50/60 border-blue-200/80'
      } p-3.5 flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              altoContraste
                ? 'bg-amber-400 text-black'
                : 'bg-blue-600 text-white shadow-xs'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">Gerar Áudio com Voz Humanizada</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Vozes naturais em português (sem tom robótico de narrador)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            emitirSomBip?.(500, 0.04);
            setAberto(!aberto);
          }}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
            aberto
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              : 'text-blue-600 dark:text-blue-400 hover:underline'
          }`}
        >
          {aberto ? 'Fechar' : '+ Usar Gerador'}
        </button>
      </div>

      {/* ÁUDIO APLICADO SUCESSO */}
      {audioAplicado && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              Áudio humanizado pronto e vinculado a {rotuloAcao}!
            </span>
          </div>
          {audioUrl && (
            <button
              type="button"
              onClick={() => {
                const a = new Audio(audioUrl);
                a.play();
              }}
              className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3" /> Ouvir
            </button>
          )}
        </div>
      )}

      {aberto && (
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          {/* CAMPO DE TEXTO DA FALA */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Frase ou Palavra que a voz vai falar:
            </label>
            <input
              type="text"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setAudioAplicado(false);
              }}
              placeholder={textoInicial || 'Ex: Quero ir ao banheiro, Banheiro...'}
              className={`w-full px-3 py-2 rounded-xl text-xs border ${
                altoContraste
                  ? 'bg-zinc-900 border-amber-500 text-amber-300'
                  : modoEscuro
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              } focus:outline-none shadow-2xs`}
            />
          </div>

          {/* SELETOR DE VOZES HUMANIZADAS */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Escolha a Voz Humanizada:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOZES.map((v) => {
                const isSelected = voz === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      emitirSomBip?.(600, 0.04);
                      setVoz(v.id);
                      setAudioAplicado(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? altoContraste
                          ? 'bg-amber-400 text-black border-amber-400 font-bold'
                          : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : altoContraste
                        ? 'bg-zinc-900 text-amber-300 border-amber-500/50 hover:bg-zinc-800'
                        : modoEscuro
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        {v.nome}
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        {v.tipo}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] line-clamp-1 ${
                        isSelected ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {v.detalhe}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BOTÕES DE AÇÃO: PRÉVIA E APLICAR */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={gerando || !(texto || textoInicial).trim()}
              onClick={handleOuvirPrevia}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                altoContraste
                  ? 'border-amber-400 text-amber-300 hover:bg-zinc-900'
                  : modoEscuro
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {gerando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando voz...</span>
                </>
              ) : tocando ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  <span>Reproduzindo...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Ouvir Prévia</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={gerando || !(texto || textoInicial).trim()}
              onClick={handleAplicar}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                altoContraste
                  ? 'bg-amber-400 hover:bg-amber-500 text-black font-bold'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {audioAplicado ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Áudio Aplicado ✓</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Usar Esta Voz</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
