'use client';

import { useState } from 'react';
import { Plus, Volume2, Folder, Sparkles, Check, Image as ImageIcon, Pencil, Trash2, GripVertical } from 'lucide-react';

export type BotaoSimulador = {
  id: string;
  rotulo: string;
  significado?: string | null;
  ordem?: number;
  imagem_id?: string | null;
  imagem?: string | null;
  audio_id?: string | null;
  audio?: string | null;
  tipo_audio?: 'masculino' | 'feminino';
};

export type CategoriaSimulador = {
  id: string;
  nome: string;
  slug?: string;
  cor?: string | null;
  ordem?: number;
  emoji?: string;
  imagem_id?: string | null;
  imagem?: string | null;
  audio_id?: string | null;
  audio?: string | null;
  tipo_audio?: 'masculino' | 'feminino';
  audioArquivo?: File | null;
  botoes?: BotaoSimulador[];
};

function resolverAudioSrc(audio?: string | null, audioArquivo?: any): string | null {
  if (audioArquivo && typeof audioArquivo === 'object' && typeof URL !== 'undefined') {
    try {
      return URL.createObjectURL(audioArquivo);
    } catch {
      // Ignora erro
    }
  }
  if (!audio) return null;
  if (audio.startsWith('http://') || audio.startsWith('https://') || audio.startsWith('data:') || audio.startsWith('blob:')) {
    return audio;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  if (audio.startsWith('/midias/')) {
    return `${apiBase}${audio}`;
  }
  return audio;
}

interface SimuladorDispositivoProps {
  categorias: CategoriaSimulador[];
  categoriaAtivaId: string | null;
  onSelecionarCategoria: (id: string) => void;
  onAdicionarCategoria: (slotIndex?: number) => void;
  onEditarCategoria?: (categoria: CategoriaSimulador) => void;
  onExcluirCategoria?: (categoria: CategoriaSimulador) => void;
  onAdicionarAcao: (categoriaId: string, slotIndex?: number) => void;
  onEditarAcao?: (botao: BotaoSimulador, categoriaId: string) => void;
  onExcluirAcao?: (botao: BotaoSimulador, categoriaId: string) => void;
  onClicarAcao?: (botao: BotaoSimulador, categoriaId: string) => void;
  onTrocarOrdemAcoes?: (categoriaId: string, slotOrigem: number, slotDestino: number) => void;
  modoEscuro?: boolean;
  altoContraste?: boolean;
  emitirSomBip?: (freq?: number, dur?: number) => void;
}

export default function SimuladorDispositivo({
  categorias = [],
  categoriaAtivaId,
  onSelecionarCategoria,
  onAdicionarCategoria,
  onEditarCategoria,
  onExcluirCategoria,
  onAdicionarAcao,
  onEditarAcao,
  onExcluirAcao,
  onClicarAcao,
  onTrocarOrdemAcoes,
  modoEscuro = false,
  altoContraste = false,
  emitirSomBip,
}: SimuladorDispositivoProps) {
  const [botaoPressionadoIndex, setBotaoPressionadoIndex] = useState<number | null>(null);
  const [modoInteracao, setModoInteracao] = useState<'acionar' | 'editar'>('acionar');
  const [slotArrastando, setSlotArrastando] = useState<number | null>(null);
  const [slotSobre, setSlotSobre] = useState<number | null>(null);
  const [animandoTroca, setAnimandoTroca] = useState<{ de: number; para: number } | null>(null);

  const listaCategorias = Array.isArray(categorias) ? categorias : [];

  // Categoria atualmente exibida no painel de botões
  const categoriaAtiva =
    listaCategorias.find((c) => c.id === categoriaAtivaId) ?? (listaCategorias.length > 0 ? listaCategorias[0] : null);

  const tocarSomCategoria = (cat: CategoriaSimulador) => {
    const src = resolverAudioSrc(cat.audio, (cat as any).audioArquivo);
    if (src) {
      try {
        const audioEl = new Audio(src);
        audioEl.play().catch(() => {
          emitirSomBip?.(650, 0.06);
        });
        return;
      } catch {
        // Fallback
      }
    }
    emitirSomBip?.(650, 0.06);
  };

  const tocarSomBotao = (b: BotaoSimulador, index: number) => {
    setBotaoPressionadoIndex(index);
    setTimeout(() => setBotaoPressionadoIndex(null), 300);

    const src = resolverAudioSrc(b.audio, (b as any).audioArquivo);
    if (src) {
      try {
        const audioEl = new Audio(src);
        audioEl.play().catch(() => {
          emitirSomBip?.(520, 0.1);
        });
        return;
      } catch {
        // Fallback
      }
    }
    // Efeito sonoro tátil
    emitirSomBip?.(600, 0.08);
  };

  // Coordenadas exatas em % mapeadas do layout físico da carcaça casa.svg (viewBox 0 0 2752 1536)
  const TOP_SLOTS = [
    { x: 28.63, y: 17.97, w: 11.01, h: 20.18 }, // Tela 1 (Categoria 1)
    { x: 44.95, y: 17.97, w: 11.01, h: 20.18 }, // Tela 2 (Categoria 2)
    { x: 61.16, y: 17.97, w: 11.01, h: 20.18 }, // Tela 3 (Categoria 3)
  ];

  const BOTTOM_SLOTS = [
    { x: 13.74, y: 64.06, w: 10.21, h: 18.10 }, // Botão 1
    { x: 29.51, y: 64.06, w: 10.25, h: 18.10 }, // Botão 2
    { x: 45.28, y: 64.06, w: 10.25, h: 18.10 }, // Botão 3
    { x: 61.05, y: 64.06, w: 10.21, h: 18.10 }, // Botão 4
    { x: 76.82, y: 64.06, w: 10.21, h: 18.10 }, // Botão 5
  ];

  return (
    <div
      className={`w-full rounded-3xl p-4 sm:p-6 border transition-all shadow-md ${
        altoContraste
          ? 'bg-black border-amber-400'
          : modoEscuro
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white/90 border-slate-200'
      }`}
    >
      {/* HEADER DO SIMULADOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              altoContraste
                ? 'bg-amber-400 text-black'
                : 'bg-blue-600 text-white shadow-sm'
            }`}
          >
            ESP
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight">
              Simulador do Aparelho Físico C.A.S.A.
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Visualização fiel das telas TFT ST7789 (240x240) e botões de acionamento.
            </p>
          </div>
        </div>

        {/* CONTROLES DO SIMULADOR (MODO E CATEGORIA) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* SELETOR DE MODO DO SIMULADOR: ACIONAR vs EDITAR */}
          <div className="flex items-center rounded-xl bg-slate-200/80 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => {
                emitirSomBip?.(600, 0.04);
                setModoInteracao('acionar');
              }}
              title="Clique para testar o som e o acionamento dos botões"
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoInteracao === 'acionar'
                  ? altoContraste
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Ouvir Sons</span>
            </button>
            <button
              type="button"
              onClick={() => {
                emitirSomBip?.(600, 0.04);
                setModoInteracao('editar');
              }}
              title="Clique para editar categorias e ações ao clicar nos slots"
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoInteracao === 'editar'
                  ? altoContraste
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Modo Editar</span>
            </button>
          </div>

          {/* CONTROLE RÁPIDO DE CATEGORIA ATIVA */}
          {listaCategorias.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
                Ativa:
              </span>
              {listaCategorias.slice(0, 3).map((cat) => {
                const isAtiva = categoriaAtiva?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (modoInteracao === 'acionar') {
                        tocarSomCategoria(cat);
                      } else {
                        emitirSomBip?.(650, 0.05);
                      }
                      onSelecionarCategoria(cat.id);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isAtiva
                        ? altoContraste
                          ? 'bg-amber-400 text-black shadow-xs font-bold'
                          : 'bg-blue-600 text-white shadow-xs'
                        : altoContraste
                        ? 'bg-zinc-800 text-amber-300 hover:bg-zinc-700'
                        : modoEscuro
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.nome}</span>
                    {isAtiva && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DO DISPOSITIVO SVG INTERATIVO */}
      <div className="relative w-full max-w-4xl mx-auto aspect-[2752/1536] select-none overflow-hidden rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 shadow-inner flex items-center justify-center">
        {/* CARCAÇA FÍSICA DO DISPOSITIVO (casa.svg) */}
        <img
          src="/casa.svg"
          alt="Carcaça do Dispositivo C.A.S.A."
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* ───────────── TELAS SUPERIORES (3 CATEGORIAS) ───────────── */}
        {TOP_SLOTS.map((slot, index) => {
          const cat =
            listaCategorias.find((c) => c.ordem === index) ??
            (listaCategorias.every((c) => typeof c.ordem !== 'number')
              ? listaCategorias[index]
              : undefined);
          const isAtiva = cat && categoriaAtiva?.id === cat.id;

          return (
            <div
              key={`top-slot-${index}`}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`,
              }}
              className="absolute z-10 p-[1%]"
            >
              {cat ? (
                <div
                  onClick={() => {
                    if (modoInteracao === 'editar' && onEditarCategoria) {
                      emitirSomBip?.(600, 0.05);
                      onEditarCategoria(cat);
                    } else {
                      tocarSomCategoria(cat);
                      onSelecionarCategoria(cat.id);
                    }
                  }}
                  title={cat.nome}
                  className={`w-full h-full rounded-lg sm:rounded-xl overflow-hidden relative cursor-pointer transition-all shadow-inner group ${
                    modoInteracao === 'editar'
                      ? 'ring-2 ring-amber-400 shadow-md hover:scale-[1.02]'
                      : isAtiva
                      ? 'ring-2 sm:ring-4 ring-blue-500 shadow-lg scale-[1.02]'
                      : 'hover:opacity-100 opacity-90 ring-1 ring-slate-700/60'
                  }`}
                >
                  {/* FOTO DA CATEGORIA COBRINDO TODO O ESPAÇO */}
                  {cat.imagem ? (
                    <img
                      src={cat.imagem}
                      alt={cat.nome}
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <Folder className="w-6 h-6 sm:w-10 sm:h-10 text-blue-400" />
                    </div>
                  )}

                  {/* BOTÕES DE EDIÇÃO E EXCLUSÃO (APENAS NO MODO EDITAR) */}
                  {modoInteracao === 'editar' && (
                    <div className="absolute top-1 right-1 z-20 flex items-center gap-1">
                      {onEditarCategoria && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            emitirSomBip?.(600, 0.05);
                            onEditarCategoria(cat);
                          }}
                          title={`Editar categoria ${cat.nome}`}
                          className="p-1 sm:p-1.5 rounded-lg bg-black/60 hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md backdrop-blur-xs"
                        >
                          <Pencil className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                      {onExcluirCategoria && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            emitirSomBip?.(600, 0.05);
                            onExcluirCategoria(cat);
                          }}
                          title={`Excluir categoria ${cat.nome}`}
                          className="p-1 sm:p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-all cursor-pointer shadow-md backdrop-blur-xs"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    emitirSomBip?.(600, 0.05);
                    onAdicionarCategoria(index);
                  }}
                  title="Slot vazio. Clique para adicionar uma categoria"
                  className="w-full h-full rounded-lg sm:rounded-xl border border-dashed border-slate-500/70 bg-slate-900/40 hover:bg-slate-900/80 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition-all cursor-pointer p-1"
                >
                  <Plus className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400" />
                  <span className="text-[7px] sm:text-[9px] font-semibold text-center">
                    + Categoria {index + 1}
                  </span>
                </button>
              )}
            </div>
          );
        })}

        {/* ───────────── ÁREA CENTRAL / STATUS DO ESP32 ───────────── */}
        <div
          style={{
            left: '43.90%',
            top: '45.57%',
            width: '13.01%',
            height: '10.55%',
          }}
          className="absolute z-10 flex flex-col items-center justify-center p-1 rounded-md bg-slate-950/80 border border-slate-800 text-center pointer-events-none"
        >
          <span className="text-[6px] sm:text-[8px] font-mono tracking-widest text-blue-400 uppercase font-bold">
            C.A.S.A. ESP32
          </span>
          <span className="text-[8px] sm:text-[11px] font-bold text-slate-100 truncate max-w-full px-1">
            {categoriaAtiva ? categoriaAtiva.nome : 'Sem Categoria'}
          </span>
          <span className="text-[6px] sm:text-[8px] text-slate-400 font-medium">
            {categoriaAtiva ? `${categoriaAtiva.botoes?.length || 0}/5 Ações` : '0/5 Ações'}
          </span>
        </div>

        {/* ───────────── BOTÕES INFERIORES (5 AÇÕES) ───────────── */}
        {BOTTOM_SLOTS.map((slot, index) => {
          const botao =
            categoriaAtiva?.botoes?.find((b) => b.ordem === index) ??
            (categoriaAtiva?.botoes && categoriaAtiva.botoes.every((b) => typeof b.ordem !== 'number')
              ? categoriaAtiva.botoes[index]
              : undefined);
          const isPressionado = botaoPressionadoIndex === index;
          const isArrastando = slotArrastando === index;
          const isSobre = slotSobre === index && slotArrastando !== index;
          const isTrocando = animandoTroca && (animandoTroca.de === index || animandoTroca.para === index);

          return (
            <div
              key={`bottom-slot-${index}`}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`,
              }}
              onDragOver={(e) => {
                if (modoInteracao === 'editar' && slotArrastando !== null) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDragEnter={(e) => {
                if (modoInteracao === 'editar' && slotArrastando !== null) {
                  e.preventDefault();
                  setSlotSobre(index);
                }
              }}
              onDragLeave={(e) => {
                if (slotSobre === index) {
                  setSlotSobre(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (
                  modoInteracao === 'editar' &&
                  slotArrastando !== null &&
                  slotArrastando !== index &&
                  categoriaAtiva
                ) {
                  const de = slotArrastando;
                  const para = index;
                  setAnimandoTroca({ de, para });
                  emitirSomBip?.(750, 0.06);
                  onTrocarOrdemAcoes?.(categoriaAtiva.id, de, para);
                  setTimeout(() => setAnimandoTroca(null), 350);
                }
                setSlotArrastando(null);
                setSlotSobre(null);
              }}
              className={`absolute z-10 p-[0.8%] transition-all duration-300 ease-out ${
                isSobre ? 'scale-110 z-30' : ''
              }`}
            >
              {botao ? (
                <div
                  draggable={modoInteracao === 'editar'}
                  onDragStart={(e) => {
                    if (modoInteracao !== 'editar') return;
                    setSlotArrastando(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragEnd={() => {
                    setSlotArrastando(null);
                    setSlotSobre(null);
                  }}
                  onClick={() => {
                    if (modoInteracao === 'editar' && onEditarAcao && categoriaAtiva) {
                      emitirSomBip?.(600, 0.05);
                      onEditarAcao(botao, categoriaAtiva.id);
                    } else {
                      tocarSomBotao(botao, index);
                      if (categoriaAtiva) {
                        onClicarAcao?.(botao, categoriaAtiva.id);
                      }
                    }
                  }}
                  title={
                    modoInteracao === 'editar'
                      ? `Botão ${index + 1}: ${botao.rotulo} (Arraste e solte sobre outro botão para trocar posições)`
                      : botao.rotulo
                  }
                  className={`w-full h-full rounded-xl sm:rounded-2xl overflow-hidden relative transition-all duration-300 ease-out shadow-md group ${
                    modoInteracao === 'editar'
                      ? 'cursor-grab active:cursor-grabbing border-amber-400 ring-2 ring-amber-400/80 hover:ring-amber-300 hover:scale-[1.03]'
                      : 'cursor-pointer'
                  } ${
                    isArrastando
                      ? 'opacity-30 scale-90 ring-4 ring-blue-500 shadow-2xl rotate-2'
                      : isSobre
                      ? 'ring-4 ring-amber-400 bg-amber-400/30 scale-105 shadow-2xl brightness-110'
                      : isTrocando
                      ? 'scale-105 ring-4 ring-emerald-400 brightness-110'
                      : isPressionado
                      ? 'scale-95 brightness-125 ring-2 ring-blue-400'
                      : 'hover:scale-[1.02] ring-1 ring-slate-700/60'
                  }`}
                >
                  {/* FOTO DA AÇÃO COBRINDO TODO O ESPAÇO */}
                  {botao.imagem ? (
                    <img
                      src={botao.imagem}
                      alt={botao.rotulo}
                      className="w-full h-full object-cover absolute inset-0 pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 sm:w-10 sm:h-10 text-slate-400" />
                    </div>
                  )}

                  {/* BADGE DE DRAG & DROP E IDENTIFICADOR DO BOTÃO (APENAS NO MODO EDITAR) */}
                  {modoInteracao === 'editar' && (
                    <div className="absolute bottom-1 left-1 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[8px] sm:text-[10px] font-bold text-amber-300 pointer-events-none shadow-md border border-amber-400/30 select-none">
                      <GripVertical className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                      <span>B{index + 1}</span>
                    </div>
                  )}

                  {/* BOTÕES DE EDIÇÃO E EXCLUSÃO (APENAS NO MODO EDITAR) */}
                  {modoInteracao === 'editar' && (
                    <div className="absolute top-1 right-1 z-20 flex items-center gap-1">
                      {onEditarAcao && categoriaAtiva && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            emitirSomBip?.(600, 0.05);
                            onEditarAcao(botao, categoriaAtiva.id);
                          }}
                          title={`Editar ação: ${botao.rotulo}`}
                          className="p-1 sm:p-1.5 rounded-lg bg-black/60 hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md backdrop-blur-xs"
                        >
                          <Pencil className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                      {onExcluirAcao && categoriaAtiva && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            emitirSomBip?.(600, 0.05);
                            onExcluirAcao(botao, categoriaAtiva.id);
                          }}
                          title={`Excluir ação: ${botao.rotulo}`}
                          className="p-1 sm:p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-all cursor-pointer shadow-md backdrop-blur-xs"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    emitirSomBip?.(600, 0.05);
                    if (categoriaAtiva) {
                      onAdicionarAcao(categoriaAtiva.id, index);
                    } else {
                      onAdicionarCategoria(index);
                    }
                  }}
                  title={
                    isSobre
                      ? `Soltar aqui para mover para o Botão ${index + 1}`
                      : categoriaAtiva
                      ? `Slot ${index + 1} vazio. Clique para adicionar ação nesta categoria.`
                      : 'Cadastre uma categoria primeiro.'
                  }
                  className={`w-full h-full rounded-xl sm:rounded-2xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all duration-300 ease-out cursor-pointer p-1 ${
                    isSobre
                      ? 'border-amber-400 ring-4 ring-amber-400/80 bg-amber-400/20 text-amber-300 scale-105 shadow-xl'
                      : 'border-slate-500/60 bg-slate-900/30 hover:bg-slate-900/70 text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className={`transition-transform duration-300 ${isSobre ? 'w-5 h-5 sm:w-6 sm:h-6 text-amber-400 scale-125' : 'w-4 h-4 sm:w-5 sm:h-5 text-slate-400'}`} />
                  <span className="text-[7px] sm:text-[9px] font-semibold text-center">
                    {isSobre ? `Mover para B${index + 1}` : `+ Ação ${index + 1}`}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* LEGENDA INFORMATIVA INFERIOR */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
          {modoInteracao === 'editar'
            ? 'Modo Editar: Arraste e solte os botões para inverter ou trocar posições, ou use o lápis/lixeira.'
            : 'Modo Ouvir Sons: Clique nos botões para ouvir os áudios gravados no dispositivo.'}
        </span>
        <span className="font-medium text-slate-500 dark:text-slate-400">
          Hardware: ESP32-WROOM-32 + 3× ST7789 240x240 + I2S Audio
        </span>
      </div>
    </div>
  );
}
