'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import { ChevronDown, X, Search, Filter, Plus, Pencil, Trash2, LayoutGrid, CheckCircle2, XCircle, AlertTriangle, FolderOpen, Volume2, Eye, Menu, Image as ImageIcon, Mic, Folder, Save } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';
import SimuladorDispositivo from '@/components/SimuladorDispositivo';
import GeradorVozHumanizada from '@/components/GeradorVozHumanizada';

type Botao = {
  id: string; 
  rotulo: string; 
  significado: string | null; 
  ordem: number;
  imagem_id: string | null; 
  imagem: string | null; 
  audio_id: string | null; 
  audio: string | null;
  tipo_audio?: 'masculino' | 'feminino';
  imagemArquivo?: File | null;
  audioArquivo?: File | null;
  isNovo?: boolean;
  isModificado?: boolean;
};

type Cat = { 
  id: string; 
  nome: string; 
  slug: string; 
  cor: string | null; 
  ordem: number; 
  emoji?: string;
  imagem_id?: string | null;
  imagem?: string | null;
  audio_id?: string | null;
  audio?: string | null;
  tipo_audio?: 'masculino' | 'feminino';
  botoes: Botao[];
  imagemArquivo?: File | null;
  audioArquivo?: File | null;
  isNovo?: boolean;
  isModificado?: boolean;
};

export type InfoMidiaPredefinida = {
  id: string;
  nome: string;
  emoji?: string;
  categoriaId?: string;
  pronto: boolean;
  imagem: string | null;
  audio: string | null;
  audioFeminino?: string | null;
  audioMasculino?: string | null;
  temImagem: boolean;
  temAudio: boolean;
};

export type PredefinidosMapa = {
  diretorioBase: string;
  categorias: Record<string, InfoMidiaPredefinida>;
  acoes: Record<string, Record<string, InfoMidiaPredefinida>>;
};

const CATEGORIAS_CONFIG: { id: string; nome: string; emoji: string }[] = [
  { id: 'casa', nome: 'Casa', emoji: '🏠' },
  { id: 'desejos', nome: 'Desejos', emoji: '✨' },
  { id: 'emocoes', nome: 'Emoções', emoji: '💛' },
];

const ACOES_CONFIG: Record<string, { id: string; nome: string }[]> = {
  casa: [
    { id: 'banheiro', nome: 'Banheiro' },
    { id: 'cozinha', nome: 'Cozinha' },
    { id: 'lavanderia', nome: 'Lavanderia' },
    { id: 'sala', nome: 'Sala' },
    { id: 'quarto', nome: 'Quarto' },
  ],
  desejos: [
    { id: 'festa', nome: 'Festa' },
    { id: 'ler', nome: 'Ler' },
    { id: 'musica', nome: 'Música' },
    { id: 'silencio', nome: 'Silêncio' },
    { id: 'ajuda', nome: 'Ajuda' },
  ],
  emocoes: [
    { id: 'feliz', nome: 'Feliz' },
    { id: 'medo', nome: 'Medo' },
    { id: 'nojo', nome: 'Nojo' },
    { id: 'raiva', nome: 'Raiva' },
    { id: 'triste', nome: 'Triste' },
  ],
};

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function identificarCategoriaId(nome: string): string | null {
  const norm = normalizarTexto(nome);
  if (norm.includes('casa')) return 'casa';
  if (norm.includes('desejo')) return 'desejos';
  if (norm.includes('emoc')) return 'emocoes';
  return null;
}

async function urlParaArquivo(url: string, nomeArquivo: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao obter mídia predefinida (${url})`);
  const blob = await res.blob();
  const ext = url.split('.').pop()?.toLowerCase() || '';
  let tipoMime = blob.type;
  if (!tipoMime || tipoMime === 'application/octet-stream') {
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) tipoMime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    if (['mp3', 'wav', 'ogg'].includes(ext)) tipoMime = ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`;
  }
  return new File([blob], nomeArquivo, { type: tipoMime });
}

async function processarImagemParaESP32(imgSrc: string | File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    const isBlob = imgSrc instanceof Blob;
    const objectUrl = isBlob ? URL.createObjectURL(imgSrc) : imgSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isBlob) URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context indisponível'));
          return;
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 240, 240);

        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.max(240 / iw, 240 / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const dx = (240 - nw) / 2;
        const dy = (240 - nh) / 2;

        ctx.drawImage(img, dx, dy, nw, nh);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (isBlob) URL.revokeObjectURL(objectUrl);
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      } catch (e) {
        if (isBlob) URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };

    img.onerror = (e) => {
      if (isBlob) URL.revokeObjectURL(objectUrl);
      reject(e);
    };

    img.src = objectUrl;
  });
}

async function processarAudioParaESP32(audioSrc: string | File | Blob): Promise<string> {
  let blob: Blob;
  if (audioSrc instanceof Blob) {
    blob = audioSrc;
  } else {
    const res = await fetch(audioSrc);
    blob = await res.blob();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Dispositivo() {
  const { perfil } = useUsuario();
  console.log('[DEBUG /dispositivo] Renderizando página Dispositivo. Perfil atual:', perfil);
  
  // Lendo as preferências globais do perfil
  const modoEscuro = perfil?.modo_escuro ?? false;
  const altoContraste = perfil?.alto_contraste ?? false;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;

  const [categoriasList, setCategoriasList] = useState<Cat[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Cat | null>(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Cat | null>(null);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // Estados do controle de alterações pendentes e sincronização
  const [temAlteracoesPendentes, setTemAlteracoesPendentes] = useState(false);
  const [mostrarModalSaida, setMostrarModalSaida] = useState(false);
  const [acaoSaidaPendente, setAcaoSaidaPendente] = useState<(() => void) | null>(null);
  const [salvandoTudo, setSalvandoTudo] = useState(false);
  const [categoriasExcluidasIds, setCategoriasExcluidasIds] = useState<string[]>([]);
  const [botoesExcluidos, setBotoesExcluidos] = useState<{ catId: string; botaoId: string }[]>([]);

  const [categoriaAcessadaId, setCategoriaAcessadaId] = useState<string | null>(null);
  const categoriaAcessada = categoriasList.find((c) => c.id === categoriaAcessadaId) ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  
  const [modoCategoria, setModoCategoria] = useState<'predefinida' | 'personalizada'>('predefinida');
  const [categoriaPredefinidaId, setCategoriaPredefinidaId] = useState<string>('casa');
  const [newCategoryName, setNewCategoryName] = useState('Casa');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('🏠');
  const [newCategoryImagem, setNewCategoryImagem] = useState<File | null>(null);
  const [newCategoryAudio, setNewCategoryAudio] = useState<File | null>(null);
  const [newCategoryAudioTipo, setNewCategoryAudioTipo] = useState<'masculino' | 'feminino'>('feminino');
  
  const [editModoCategoria, setEditModoCategoria] = useState<'predefinida' | 'personalizada'>('predefinida');
  const [editCategoriaPredefinidaId, setEditCategoriaPredefinidaId] = useState<string>('casa');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryEmoji, setEditCategoryEmoji] = useState('⭐');
  const [editCategoryImagem, setEditCategoryImagem] = useState<File | null>(null);
  const [editCategoryAudio, setEditCategoryAudio] = useState<File | null>(null);
  const [editCategoryAudioTipo, setEditCategoryAudioTipo] = useState<'masculino' | 'feminino'>('feminino');

  const [showNovoBotao, setShowNovoBotao] = useState(false);
  const [categoriaParaAcao, setCategoriaParaAcao] = useState<Cat | null>(null);
  const [acaoParaExcluir, setAcaoParaExcluir] = useState<{ catId: string; catNome: string; botao: Botao } | null>(null);
  const [showEditBotaoModal, setShowEditBotaoModal] = useState<Botao | null>(null);
  const [editModoAcao, setEditModoAcao] = useState<'predefinida' | 'personalizada'>('predefinida');
  const [editAcaoPredefinida, setEditAcaoPredefinida] = useState<string>('');
  const [editBotaoCatId, setEditBotaoCatId] = useState<string | null>(null);
  const [editBotaoRotulo, setEditBotaoRotulo] = useState('');
  const [editBotaoImagem, setEditBotaoImagem] = useState<File | null>(null);
  const [editBotaoAudio, setEditBotaoAudio] = useState<File | null>(null);
  const [editBotaoTipoAudio, setEditBotaoTipoAudio] = useState<'masculino' | 'feminino'>('feminino');

  const [modoAcao, setModoAcao] = useState<'predefinida' | 'personalizada'>('predefinida');
  const [acaoPredefinida, setAcaoPredefinida] = useState('');
  const [botaoRotulo, setBotaoRotulo] = useState('');
  const [botaoImagem, setBotaoImagem] = useState<File | null>(null);
  const [botaoAudio, setBotaoAudio] = useState<File | null>(null);
  const [botaoTipoAudio, setBotaoTipoAudio] = useState<'masculino' | 'feminino'>('feminino');
  const [salvando, setSalvando] = useState(false);

  const [predefinidosData, setPredefinidosData] = useState<PredefinidosMapa | null>(null);
  const [audioTocando, setAudioTocando] = useState<string | null>(null);

  const tocarAudioUrl = (url: string) => {
    try {
      const a = new Audio(url);
      setAudioTocando(url);
      a.play().catch(() => setAudioTocando(null));
      a.onended = () => setAudioTocando(null);
    } catch {
      setAudioTocando(null);
    }
  };

  const carregarPredefinidos = () => {
    fetch('/api/predefinidos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPredefinidosData(data);
      })
      .catch((e) => console.error('Erro ao buscar predefinidos:', e));
  };

  useEffect(() => {
    carregarPredefinidos();
  }, []);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  const [temDispositivo, setTemDispositivo] = useState<boolean | null>(null);
  const [modoDesenvolvedor, setModoDesenvolvedor] = useState(false);
  const [versao, setVersao] = useState(0);
  const carregar = () => setVersao((v) => v + 1);

  // Verifica se há dispositivos vinculados
  useEffect(() => {
    let ativo = true;
    api
      .get<unknown[]>('/dispositivos')
      .then((res) => {
        if (ativo) {
          setTemDispositivo(Array.isArray(res.data) && res.data.length > 0);
        }
      })
      .catch(() => {
        if (ativo) setTemDispositivo(false);
      });
    return () => {
      ativo = false;
    };
  }, [versao]);

  // Efeito para Modo Escuro / Alto Contraste
  useEffect(() => {
    if (modoEscuro || altoContraste) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [modoEscuro, altoContraste]);

  // Função global de feedback sonoro 
  const emitirSomBip = (frequencia = 587.33, duracao = 0.1) => {
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
      // Ignora se o navegador bloquear autoplay
    }
  };

  useEffect(() => {
    let ativo = true;
    console.log('[DEBUG /dispositivo] Solicitando categorias em api.get(/categorias)...');
    api
      .get<Cat[]>('/categorias')
      .then((r) => {
        console.log('[DEBUG /dispositivo] Categorias carregadas com sucesso:', r.data);
        if (ativo) {
          setCategoriasList(r.data);
          setTemAlteracoesPendentes(false);
          setCategoriasExcluidasIds([]);
          setBotoesExcluidos([]);
        }
      })
      .catch((err) => {
        console.error('[DEBUG /dispositivo] Erro ao carregar categorias:', err);
        if (ativo) setFeedback(erroParaFeedback(err, 'Falha ao Carregar as Categorias'));
      })
      .finally(() => {
        console.log('[DEBUG /dispositivo] Fim da requisição de categorias');
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [versao]);

  // Intercepta tentativa de recarregar a página ou fechar a janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (temAlteracoesPendentes) {
        e.preventDefault();
        e.returnValue = 'As alterações não seram salvas, deseja prosseguir?';
        return 'As alterações não seram salvas, deseja prosseguir?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [temAlteracoesPendentes]);

  const enviarMidia = async (arquivo: File, tipo: 'imagem' | 'audio') => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    form.append('tipo', tipo);
    const { data } = await api.post<{ id: string }>('/midias', form);
    return data.id;
  };

  // Salva no banco de dados e notifica o Realtime Database (lógica firebase.py)
  const handleSalvarAlteracoes = async () => {
    if (salvandoTudo) return;
    setSalvandoTudo(true);
    emitirSomBip(650, 0.08);

    try {
      // 1. Processar exclusões de categorias que existiam no banco
      for (const id of categoriasExcluidasIds) {
        await api.delete(`/categorias/${id}`).catch((e) => console.warn('Erro ao excluir categoria:', e));
      }

      // 2. Processar exclusões de botões que existiam no banco
      for (const item of botoesExcluidos) {
        await api.delete(`/categorias/${item.catId}/botoes/${item.botaoId}`).catch((e) => console.warn('Erro ao excluir botão:', e));
      }

      // 3. Processar criação / atualização de categorias e seus botões no banco
      const mapaIdsCategorias: Record<string, string> = {};

      for (let cIdx = 0; cIdx < categoriasList.length; cIdx++) {
        const cat = categoriasList[cIdx];
        let imagemId = cat.imagem_id;
        let audioId = cat.audio_id;

        if (cat.imagemArquivo) {
          imagemId = await enviarMidia(cat.imagemArquivo, 'imagem');
        }
        if (cat.audioArquivo) {
          audioId = await enviarMidia(cat.audioArquivo, 'audio');
        }

        let catIdPersistido = cat.id;

        if (cat.isNovo || cat.id.startsWith('temp_')) {
          const { data } = await api.post<Cat>('/categorias', {
            nome: cat.nome,
            emoji: cat.emoji || '⭐',
            imagem_id: imagemId,
            imagem: cat.imagem,
            audio_id: audioId,
            audio: cat.audio,
            tipo_audio: cat.tipo_audio || 'feminino',
          });
          catIdPersistido = data.id;
          mapaIdsCategorias[cat.id] = data.id;
        } else if (cat.isModificado) {
          const body: Record<string, unknown> = {
            nome: cat.nome,
            emoji: cat.emoji || '⭐',
            tipo_audio: cat.tipo_audio || 'feminino',
          };
          if (imagemId) body.imagem_id = imagemId;
          if (audioId) body.audio_id = audioId;
          if (cat.imagem) body.imagem = cat.imagem;
          if (cat.audio) body.audio = cat.audio;

          await api.patch(`/categorias/${cat.id}`, body).catch((e) => console.warn('Erro ao atualizar categoria:', e));
          mapaIdsCategorias[cat.id] = cat.id;
        } else {
          mapaIdsCategorias[cat.id] = cat.id;
        }

        // Processar botões da categoria
        for (let bIdx = 0; bIdx < (cat.botoes || []).length; bIdx++) {
          const b = cat.botoes[bIdx];
          let bImgId = b.imagem_id;
          let bAudId = b.audio_id;

          if (b.imagemArquivo) {
            bImgId = await enviarMidia(b.imagemArquivo, 'imagem');
          }
          if (b.audioArquivo) {
            bAudId = await enviarMidia(b.audioArquivo, 'audio');
          }

          if (b.isNovo || b.id.startsWith('temp_')) {
            await api.post(`/categorias/${catIdPersistido}/botoes`, {
              rotulo: b.rotulo,
              imagem_id: bImgId,
              imagem: b.imagem,
              audio_id: bAudId,
              audio: b.audio,
              tipo_audio: b.tipo_audio || 'feminino',
            });
          } else if (b.isModificado) {
            const body: Record<string, unknown> = {
              rotulo: b.rotulo,
              tipo_audio: b.tipo_audio || 'feminino',
            };
            if (bImgId) body.imagem_id = bImgId;
            if (bAudId) body.audio_id = bAudId;
            if (b.imagem) body.imagem = b.imagem;
            if (b.audio) body.audio = b.audio;

            await api.patch(`/categorias/${catIdPersistido}/botoes/${b.id}`, body).catch((e) => console.warn('Erro ao atualizar botão:', e));
          }
        }
      }

      // Sucesso na persistência! A API já atualizou mídias e incrementou config_versao.
      setTemAlteracoesPendentes(false);
      setCategoriasExcluidasIds([]);
      setBotoesExcluidos([]);
      emitirSomBip(800, 0.15);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Alterações Salvas!',
        mensagem: 'As mudanças chegam ao aparelho em alguns minutos, quando ele estiver conectado ao Wi-Fi.',
      });
      carregar();
    } catch (err: unknown) {
      console.error('Erro ao salvar alterações:', err);
      emitirSomBip(400, 0.2);
      setFeedback({
        tipo: 'erro',
        titulo: 'Falha ao Salvar',
        mensagem: 'Não foi possível salvar as alterações no banco de dados. Verifique a conexão e tente novamente.',
      });
    } finally {
      setSalvandoTudo(false);
    }
  };

  const abrirModalCriarCategoria = () => {
    emitirSomBip(600, 0.05);
    carregarPredefinidos();

    const disponiveis = CATEGORIAS_CONFIG.filter((c) => {
      return !categoriasList.some(
        (cat) =>
          normalizarTexto(cat.nome) === normalizarTexto(c.nome) ||
          cat.id === c.id ||
          identificarCategoriaId(cat.nome) === c.id
      );
    });

    if (disponiveis.length > 0) {
      setModoCategoria('predefinida');
      setCategoriaPredefinidaId(disponiveis[0].id);
      setNewCategoryName(disponiveis[0].nome);
      setNewCategoryEmoji(disponiveis[0].emoji);
    } else {
      setModoCategoria('personalizada');
      setCategoriaPredefinidaId('');
      setNewCategoryName('');
      setNewCategoryEmoji('⭐');
    }

    setNewCategoryImagem(null);
    setNewCategoryAudio(null);
    setNewCategoryAudioTipo('feminino');
    setShowAddModal(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoriasList.length >= 3) {
      setFeedback({ tipo: 'atencao', titulo: 'Limite Atingido', mensagem: 'O dispositivo aceita no máximo 3 categorias. Apague uma existente para adicionar outra.' });
      setShowAddModal(false);
      return;
    }

    const nomeFinal = modoCategoria === 'predefinida'
      ? (predefinidosData?.categorias[categoriaPredefinidaId]?.nome || newCategoryName || categoriaPredefinidaId)
      : newCategoryName.trim();

    if (!nomeFinal) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Obrigatório', mensagem: 'Por favor, selecione ou digite um nome para a categoria.' });
      return;
    }

    const categoriaJaExiste = categoriasList.some(
      (cat) =>
        normalizarTexto(cat.nome) === normalizarTexto(nomeFinal) ||
        (modoCategoria === 'predefinida' && identificarCategoriaId(cat.nome) === categoriaPredefinidaId)
    );

    if (categoriaJaExiste) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Categoria Já em Uso',
        mensagem: `A categoria "${nomeFinal}" já está cadastrada no dispositivo. Não é permitido cadastrar categorias repetidas.`,
      });
      return;
    }

    if (modoCategoria === 'predefinida') {
      const info = predefinidosData?.categorias[categoriaPredefinidaId];
      if (!info?.temImagem && !newCategoryImagem) {
        setFeedback({
          tipo: 'erro',
          titulo: 'Foto Não Encontrada',
          mensagem: `A foto predefinida para "${categoriaPredefinidaId}" não foi encontrada na pasta frontend/public/predefinidos/imagens/. Coloque o arquivo de imagem (ex: ${categoriaPredefinidaId}.jpeg/.png) ou adicione uma imagem personalizada.`,
        });
        return;
      }

      const audioUrlParaUsar = newCategoryAudioTipo === 'masculino'
        ? (info?.audioMasculino || info?.audio)
        : (info?.audioFeminino || info?.audio);

      const novaCat: Cat = {
        id: `temp_cat_${Date.now()}`,
        nome: info?.nome || newCategoryName || categoriaPredefinidaId,
        slug: normalizarTexto(info?.nome || newCategoryName || categoriaPredefinidaId).replace(/\s+/g, '-'),
        cor: null,
        ordem: categoriasList.length,
        emoji: newCategoryEmoji || '⭐',
        imagem_id: null,
        imagem: newCategoryImagem ? URL.createObjectURL(newCategoryImagem) : (info?.imagem || null),
        audio_id: null,
        audio: newCategoryAudio ? URL.createObjectURL(newCategoryAudio) : (audioUrlParaUsar || null),
        tipo_audio: newCategoryAudioTipo,
        imagemArquivo: newCategoryImagem || null,
        audioArquivo: newCategoryAudio || null,
        isNovo: true,
        botoes: [],
      };

      setCategoriasList((prev) => [...prev, novaCat]);
      setTemAlteracoesPendentes(true);
      setShowAddModal(false);
      emitirSomBip(800, 0.1);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Categoria Adicionada',
        mensagem: `A categoria "${novaCat.nome}" foi adicionada! Pressione "Salvar alterações" para gravar no dispositivo.`,
      });
    } else {
      if (!newCategoryName.trim()) {
        setFeedback({ tipo: 'erro', titulo: 'Nome Obrigatório', mensagem: 'Por favor, digite um nome válido para a categoria personalizada.' });
        return;
      }
      if (!newCategoryImagem) {
        setFeedback({ tipo: 'erro', titulo: 'Imagem Obrigatória', mensagem: 'Categorias personalizadas só são salvas se for preenchida a imagem.' });
        return;
      }
      if (!newCategoryAudio) {
        setFeedback({ tipo: 'erro', titulo: 'Áudio Obrigatório', mensagem: 'Categorias personalizadas só são salvas se for preenchido o áudio.' });
        return;
      }

      const novaCat: Cat = {
        id: `temp_cat_${Date.now()}`,
        nome: newCategoryName.trim(),
        slug: normalizarTexto(newCategoryName).replace(/\s+/g, '-'),
        cor: null,
        ordem: categoriasList.length,
        emoji: newCategoryEmoji || '⭐',
        imagem_id: null,
        imagem: URL.createObjectURL(newCategoryImagem),
        audio_id: null,
        audio: URL.createObjectURL(newCategoryAudio),
        tipo_audio: newCategoryAudioTipo,
        imagemArquivo: newCategoryImagem,
        audioArquivo: newCategoryAudio,
        isNovo: true,
        botoes: [],
      };

      setCategoriasList((prev) => [...prev, novaCat]);
      setTemAlteracoesPendentes(true);
      setShowAddModal(false);
      emitirSomBip(800, 0.1);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Categoria Adicionada',
        mensagem: `A categoria "${novaCat.nome}" foi criada! Pressione "Salvar alterações" para gravar no dispositivo.`,
      });
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    const nomeFinal = editModoCategoria === 'predefinida'
      ? (predefinidosData?.categorias[editCategoriaPredefinidaId]?.nome || editCategoryName || editCategoriaPredefinidaId)
      : editCategoryName.trim();

    if (!nomeFinal) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Obrigatório', mensagem: 'Por favor, selecione ou digite um nome para a categoria.' });
      return;
    }

    const categoriaJaExiste = categoriasList.some(
      (cat) =>
        cat.id !== showEditModal.id &&
        (normalizarTexto(cat.nome) === normalizarTexto(nomeFinal) ||
         (editModoCategoria === 'predefinida' && identificarCategoriaId(cat.nome) === editCategoriaPredefinidaId))
    );

    if (categoriaJaExiste) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Nome Já em Uso',
        mensagem: `Já existe outra categoria com o nome "${nomeFinal}".`,
      });
      return;
    }

    const catAlvo = showEditModal;
    const info = editModoCategoria === 'predefinida' ? predefinidosData?.categorias[editCategoriaPredefinidaId] : null;
    const audioUrlParaUsar = editCategoryAudioTipo === 'masculino'
      ? (info?.audioMasculino || info?.audio)
      : (info?.audioFeminino || info?.audio);

    setCategoriasList((prev) =>
      prev.map((c) => {
        if (c.id !== catAlvo.id) return c;
        return {
          ...c,
          nome: nomeFinal,
          emoji: editCategoryEmoji || c.emoji || '⭐',
          tipo_audio: editCategoryAudioTipo,
          imagem: editCategoryImagem ? URL.createObjectURL(editCategoryImagem) : (info?.imagem || c.imagem),
          audio: editCategoryAudio ? URL.createObjectURL(editCategoryAudio) : (audioUrlParaUsar || c.audio),
          imagemArquivo: editCategoryImagem || c.imagemArquivo,
          audioArquivo: editCategoryAudio || c.audioArquivo,
          isModificado: true,
        };
      })
    );

    setTemAlteracoesPendentes(true);
    setShowEditModal(null);
    setEditCategoryImagem(null);
    setEditCategoryAudio(null);
    emitirSomBip(800, 0.1);
    setFeedback({
      tipo: 'sucesso',
      titulo: 'Categoria Atualizada',
      mensagem: `A categoria "${nomeFinal}" foi atualizada! Pressione "Salvar alterações" para gravar no dispositivo.`,
    });
  };

  const abrirModalEditarCategoria = (cat: Cat) => {
    emitirSomBip(600, 0.05);
    carregarPredefinidos();

    const predefId = identificarCategoriaId(cat.nome) || (CATEGORIAS_CONFIG.some((c) => c.id === cat.id) ? cat.id : null);
    if (predefId) {
      setEditModoCategoria('predefinida');
      setEditCategoriaPredefinidaId(predefId);
      setEditCategoryName(cat.nome);
      setEditCategoryEmoji(cat.emoji || CATEGORIAS_CONFIG.find((c) => c.id === predefId)?.emoji || '⭐');
    } else {
      setEditModoCategoria('personalizada');
      setEditCategoriaPredefinidaId('');
      setEditCategoryName(cat.nome);
      setEditCategoryEmoji(cat.emoji || '⭐');
    }

    setEditCategoryAudioTipo(cat.tipo_audio || 'feminino');
    setEditCategoryImagem(null);
    setEditCategoryAudio(null);
    setShowEditModal(cat);
  };

  const abrirModalEditarAcao = (botao: Botao, catId: string) => {
    emitirSomBip(600, 0.05);
    carregarPredefinidos();

    const catAlvo = categoriasList.find((c) => c.id === catId);
    const catGrupoId = identificarCategoriaId(catAlvo?.nome || '');
    let predefAcaoEncontrada: { id: string; nome: string } | null = null;

    if (catGrupoId && ACOES_CONFIG[catGrupoId]) {
      predefAcaoEncontrada = ACOES_CONFIG[catGrupoId].find(
        (a) => normalizarTexto(a.nome) === normalizarTexto(botao.rotulo) || a.id === botao.id
      ) || null;
    }
    if (!predefAcaoEncontrada) {
      for (const grupo of Object.values(ACOES_CONFIG)) {
        const achou = grupo.find(
          (a) => normalizarTexto(a.nome) === normalizarTexto(botao.rotulo) || a.id === botao.id
        );
        if (achou) {
          predefAcaoEncontrada = achou;
          break;
        }
      }
    }

    if (predefAcaoEncontrada) {
      setEditModoAcao('predefinida');
      setEditAcaoPredefinida(predefAcaoEncontrada.id);
      setEditBotaoRotulo(predefAcaoEncontrada.nome);
    } else {
      setEditModoAcao('personalizada');
      setEditAcaoPredefinida('');
      setEditBotaoRotulo(botao.rotulo);
    }

    setEditBotaoCatId(catId);
    setEditBotaoImagem(null);
    setEditBotaoAudio(null);
    setEditBotaoTipoAudio(botao.tipo_audio || 'feminino');
    setShowEditBotaoModal(botao);
  };

  const handleSalvarEdicaoBotao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditBotaoModal || !editBotaoCatId) return;

    const catAlvo = categoriasList.find((c) => c.id === editBotaoCatId);
    const rotulosUsados = new Set(
      (catAlvo?.botoes || [])
        .filter((b) => b.id !== showEditBotaoModal.id)
        .map((b) => normalizarTexto(b.rotulo))
    );

    const nomeAcaoFinal = editModoAcao === 'predefinida'
      ? (editBotaoRotulo || editAcaoPredefinida)
      : editBotaoRotulo.trim();

    if (!nomeAcaoFinal) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Inválido', mensagem: 'Digite ou selecione o nome da ação.' });
      return;
    }

    if (rotulosUsados.has(normalizarTexto(nomeAcaoFinal))) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Ação Já em Uso',
        mensagem: `Já existe outra ação com o nome "${nomeAcaoFinal}" nesta categoria.`,
      });
      return;
    }

    const btnAlvo = showEditBotaoModal;
    const catId = identificarCategoriaId(catAlvo?.nome || '');
    let acaoInfo: InfoMidiaPredefinida | undefined;
    if (editModoAcao === 'predefinida') {
      if (catId && predefinidosData?.acoes[catId]?.[editAcaoPredefinida]) {
        acaoInfo = predefinidosData.acoes[catId][editAcaoPredefinida];
      } else if (predefinidosData?.acoes) {
        for (const grupo of Object.values(predefinidosData.acoes)) {
          if (grupo[editAcaoPredefinida]) {
            acaoInfo = grupo[editAcaoPredefinida];
            break;
          }
        }
      }
    }

    const audioUrlParaUsar = editBotaoTipoAudio === 'masculino'
      ? (acaoInfo?.audioMasculino || acaoInfo?.audio)
      : (acaoInfo?.audioFeminino || acaoInfo?.audio);

    setCategoriasList((prev) =>
      prev.map((c) => {
        if (c.id !== editBotaoCatId) return c;
        return {
          ...c,
          botoes: (c.botoes || []).map((b) => {
            if (b.id !== btnAlvo.id) return b;
            return {
              ...b,
              rotulo: nomeAcaoFinal,
              tipo_audio: editBotaoTipoAudio,
              imagem: editBotaoImagem ? URL.createObjectURL(editBotaoImagem) : (acaoInfo?.imagem || b.imagem),
              audio: editBotaoAudio ? URL.createObjectURL(editBotaoAudio) : (audioUrlParaUsar || b.audio),
              imagemArquivo: editBotaoImagem || b.imagemArquivo,
              audioArquivo: editBotaoAudio || b.audioArquivo,
              isModificado: true,
            };
          }),
          isModificado: true,
        };
      })
    );

    setTemAlteracoesPendentes(true);
    setShowEditBotaoModal(null);
    setEditBotaoCatId(null);
    emitirSomBip(800, 0.1);
    setFeedback({
      tipo: 'sucesso',
      titulo: 'Ação Atualizada',
      mensagem: `Ação "${nomeAcaoFinal}" atualizada! Pressione "Salvar alterações" para gravar no dispositivo.`,
    });
  };

  const handleConfirmarExclusao = async () => {
    if (!categoriaParaExcluir) return;
    const alvo = categoriaParaExcluir;
    setCategoriaParaExcluir(null);

    if (!alvo.id.startsWith('temp_')) {
      setCategoriasExcluidasIds((prev) => [...prev, alvo.id]);
    }

    setCategoriasList((prev) => prev.filter((c) => c.id !== alvo.id));
    if (categoriaAcessadaId === alvo.id) setCategoriaAcessadaId(null);
    setTemAlteracoesPendentes(true);
    emitirSomBip(400, 0.1);
    setFeedback({
      tipo: 'sucesso',
      titulo: 'Categoria Removida',
      mensagem: `A categoria "${alvo.nome}" foi removida da prancha. Pressione "Salvar alterações" para confirmar no banco.`,
    });
  };

  const fecharNovoBotao = () => {
    emitirSomBip(500, 0.05);
    setShowNovoBotao(false);
    setCategoriaParaAcao(null);
    setModoAcao('predefinida');
    setAcaoPredefinida('');
    setBotaoRotulo('');
    setBotaoImagem(null);
    setBotaoAudio(null);
    setBotaoTipoAudio('feminino');
  };

  const abrirModalCriarAcao = (cat: Cat) => {
    emitirSomBip(600, 0.05);
    carregarPredefinidos();
    if ((cat.botoes?.length || 0) >= 5) {
      setFeedback({
        tipo: 'atencao',
        titulo: 'Limite Atingido',
        mensagem: `A categoria "${cat.nome}" já atingiu o limite máximo de 5 ações do dispositivo. Exclua uma ação existente para adicionar outra.`,
      });
      return;
    }
    setCategoriaParaAcao(cat);
    setCategoriaAcessadaId(cat.id);

    const rotulosUsados = new Set(
      (cat.botoes || []).map((b) => normalizarTexto(b.rotulo))
    );

    const catId = identificarCategoriaId(cat.nome);
    const lista = catId ? ACOES_CONFIG[catId] : null;

    let primeira: { id: string; nome: string } | null = null;
    if (lista) {
      primeira = lista.find((a) => !rotulosUsados.has(normalizarTexto(a.nome)) && !rotulosUsados.has(normalizarTexto(a.id))) || null;
    } else {
      for (const grupo of Object.values(ACOES_CONFIG)) {
        const achou = grupo.find((a) => !rotulosUsados.has(normalizarTexto(a.nome)) && !rotulosUsados.has(normalizarTexto(a.id)));
        if (achou) {
          primeira = achou;
          break;
        }
      }
    }

    if (primeira) {
      setModoAcao('predefinida');
      setAcaoPredefinida(primeira.id);
      setBotaoRotulo(primeira.nome);
    } else {
      setModoAcao('personalizada');
      setAcaoPredefinida('');
      setBotaoRotulo('');
    }

    setBotaoImagem(null);
    setBotaoAudio(null);
    setBotaoTipoAudio('feminino');
    setShowNovoBotao(true);
  };

  const handleSalvarBotao = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categoriaParaAcao || categoriaAcessada;
    if (!cat) return;
    
    const totalBotoes = cat.botoes?.length || 0;
    if (totalBotoes >= 5) {
      setFeedback({ tipo: 'atencao', titulo: 'Limite Atingido', mensagem: 'Cada categoria aceita no máximo 5 ações (botões). Apague uma ação existente para adicionar outra.' });
      return;
    }

    const rotulosUsados = new Set(
      (cat.botoes || []).map((b) => normalizarTexto(b.rotulo))
    );

    if (modoAcao === 'predefinida') {
      const catId = identificarCategoriaId(cat.nome);
      let acaoInfo: InfoMidiaPredefinida | undefined;
      if (catId && predefinidosData?.acoes[catId]?.[acaoPredefinida]) {
        acaoInfo = predefinidosData.acoes[catId][acaoPredefinida];
      } else if (predefinidosData?.acoes) {
        for (const grupo of Object.values(predefinidosData.acoes)) {
          if (grupo[acaoPredefinida]) {
            acaoInfo = grupo[acaoPredefinida];
            break;
          }
        }
      }

      const nomeAcaoFinal = acaoInfo?.nome || botaoRotulo || acaoPredefinida;
      if (!nomeAcaoFinal || !acaoPredefinida) {
        setFeedback({ tipo: 'erro', titulo: 'Ação Não Selecionada', mensagem: 'Por favor, selecione uma ação predefinida válida.' });
        return;
      }

      if (rotulosUsados.has(normalizarTexto(nomeAcaoFinal))) {
        setFeedback({
          tipo: 'erro',
          titulo: 'Ação Já em Uso',
          mensagem: `A ação "${nomeAcaoFinal}" já está cadastrada na categoria "${cat.nome}". Não é permitido cadastrar ações repetidas na mesma categoria.`,
        });
        return;
      }

      if (!acaoInfo?.temImagem && !botaoImagem) {
        setFeedback({
          tipo: 'erro',
          titulo: 'Foto Não Encontrada',
          mensagem: `A foto predefinida para "${acaoPredefinida}" não foi encontrada. Adicione uma imagem.`,
        });
        return;
      }

      const audioUrlParaUsar = botaoTipoAudio === 'masculino'
        ? (acaoInfo?.audioMasculino || acaoInfo?.audio)
        : (acaoInfo?.audioFeminino || acaoInfo?.audio);

      const novoBotao: Botao = {
        id: `temp_btn_${Date.now()}`,
        rotulo: nomeAcaoFinal,
        significado: null,
        ordem: cat.botoes?.length || 0,
        imagem_id: null,
        imagem: botaoImagem ? URL.createObjectURL(botaoImagem) : (acaoInfo?.imagem || null),
        audio_id: null,
        audio: botaoAudio ? URL.createObjectURL(botaoAudio) : (audioUrlParaUsar || null),
        tipo_audio: botaoTipoAudio,
        imagemArquivo: botaoImagem || null,
        audioArquivo: botaoAudio || null,
        isNovo: true,
      };

      setCategoriasList((prev) =>
        prev.map((c) => {
          if (c.id !== cat.id) return c;
          return {
            ...c,
            botoes: [...(c.botoes || []), novoBotao],
            isModificado: true,
          };
        })
      );
      setTemAlteracoesPendentes(true);
      fecharNovoBotao();
      emitirSomBip(800, 0.1);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Nova Ação',
        mensagem: `Ação "${nomeAcaoFinal}" adicionada à categoria "${cat.nome}"! Pressione "Salvar alterações" para gravar no dispositivo.`,
      });
    } else {
      const rotuloTrim = botaoRotulo.trim();
      if (!rotuloTrim) {
        setFeedback({ tipo: 'erro', titulo: 'Nome Obrigatório', mensagem: 'Digite o nome da ação personalizada.' });
        return;
      }
      if (rotulosUsados.has(normalizarTexto(rotuloTrim))) {
        setFeedback({
          tipo: 'erro',
          titulo: 'Ação Já em Uso',
          mensagem: `A ação "${rotuloTrim}" já está cadastrada na categoria "${cat.nome}". Não é permitido cadastrar ações repetidas na mesma categoria.`,
        });
        return;
      }
      if (!botaoImagem) {
        setFeedback({ tipo: 'erro', titulo: 'Imagem Obrigatória', mensagem: 'Ações personalizadas só são salvas se for preenchida a imagem.' });
        return;
      }
      if (!botaoAudio) {
        setFeedback({ tipo: 'erro', titulo: 'Áudio Obrigatório', mensagem: 'Ações personalizadas só são salvas se for preenchido o arquivo de áudio.' });
        return;
      }

      const novoBotao: Botao = {
        id: `temp_btn_${Date.now()}`,
        rotulo: rotuloTrim,
        significado: null,
        ordem: cat.botoes?.length || 0,
        imagem_id: null,
        imagem: URL.createObjectURL(botaoImagem),
        audio_id: null,
        audio: URL.createObjectURL(botaoAudio),
        tipo_audio: botaoTipoAudio,
        imagemArquivo: botaoImagem,
        audioArquivo: botaoAudio,
        isNovo: true,
      };

      setCategoriasList((prev) =>
        prev.map((c) => {
          if (c.id !== cat.id) return c;
          return {
            ...c,
            botoes: [...(c.botoes || []), novoBotao],
            isModificado: true,
          };
        })
      );
      setTemAlteracoesPendentes(true);
      fecharNovoBotao();
      emitirSomBip(800, 0.1);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Nova Ação',
        mensagem: `Ação "${rotuloTrim}" adicionada à categoria "${cat.nome}"! Pressione "Salvar alterações" para gravar no dispositivo.`,
      });
    }
  };

  const confirmarExcluirBotao = async () => {
    if (!acaoParaExcluir) return;
    const { catId, botao } = acaoParaExcluir;
    setAcaoParaExcluir(null);

    if (!botao.id.startsWith('temp_')) {
      setBotoesExcluidos((prev) => [...prev, { catId, botaoId: botao.id }]);
    }

    setCategoriasList((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        return {
          ...c,
          botoes: (c.botoes || []).filter((b) => b.id !== botao.id),
          isModificado: true,
        };
      })
    );
    setTemAlteracoesPendentes(true);
    emitirSomBip(400, 0.1);
    setFeedback({
      tipo: 'sucesso',
      titulo: 'Ação Removida',
      mensagem: `A ação "${botao.rotulo}" foi excluída da prancha. Pressione "Salvar alterações" para confirmar no banco.`,
    });
  };

  const tocarAudio = async (botao: Botao) => {
    emitirSomBip(700, 0.05);
    if (botao.audio) {
      try {
        const audio = new Audio(botao.audio);
        await audio.play();
        return;
      } catch (err) {
        console.warn('Erro ao reproduzir áudio direto:', err);
      }
    }
    if (!botao.audio_id) {
      setFeedback({ tipo: 'atencao', titulo: 'Sem Áudio', mensagem: `A ação "${botao.rotulo}" ainda não possui áudio (${botao.tipo_audio || 'feminino'}) cadastrado.` });
      return;
    }
    try {
      const { data } = await api.get(`/midias/${botao.audio_id}/arquivo`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Não foi Possível Tocar o Áudio'));
    }
  };

  const categoriasFiltradas = (Array.isArray(categoriasList) ? categoriasList : []).filter((cat) =>
    (cat?.nome || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className={`h-screen w-screen overflow-hidden ${altoContraste ? 'bg-black text-amber-300' : modoEscuro ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} flex flex-col md:flex-row font-sans transition-colors duration-200`} style={{ fontSize: `${tamanhoFonte}px` }}>
      
      {/* BARRA TOPO MOBILE COM HAMBÚRGUER */}
      <div className={`md:hidden flex items-center justify-between p-4 ${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-40 shadow-sm w-full shrink-0`}>
        <span className="font-bold text-sm tracking-wide">C.A.S.A. Categorias</span>
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
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 h-full flex flex-col ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <Sidebar
            ativo="dispositivo"
            temAlteracoesPendentes={temAlteracoesPendentes}
            aoTentarSair={(prosseguir) => {
              setAcaoSaidaPendente(() => prosseguir);
              setMostrarModalSaida(true);
            }}
          />
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {menuMobileAberto && (
        <div 
          onClick={() => setMenuMobileAberto(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-10 flex flex-col gap-6 w-full">
        <BarraTopo escuro={modoEscuro || altoContraste} />

        {temDispositivo === false && !modoDesenvolvedor ? (
          /* ACESSO IMPEDIDO: AVISO PARA PRIMEIRO CONECTAR O DISPOSITIVO */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[50vh]">
            <div
              className={`w-full max-w-lg ${
                altoContraste
                  ? 'bg-black border-2 border-amber-400 text-amber-300'
                  : modoEscuro
                  ? 'bg-slate-900 border border-slate-800 text-slate-100'
                  : 'bg-white border border-slate-200 text-slate-800'
              } rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col items-center gap-6`}
            >
              <div
                className={`w-20 h-20 rounded-3xl ${
                  altoContraste
                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400'
                    : 'bg-amber-100 text-amber-600'
                } flex items-center justify-center`}
              >
                <AlertTriangle className="w-10 h-10" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold">Acesso Bloqueado</h2>
                <p className="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Primeiro conecte o dispositivo em Início
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Link
                  href="/dashboard"
                  className={`w-full py-3.5 px-6 rounded-2xl ${
                    altoContraste
                      ? 'bg-amber-400 text-black font-extrabold'
                      : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-bold'
                  } text-base transition-all shadow-md flex items-center justify-center gap-2`}
                >
                  Ir para Início
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    emitirSomBip(650, 0.08);
                    setModoDesenvolvedor(true);
                  }}
                  className={`w-full py-3 px-6 rounded-2xl border ${
                    altoContraste
                      ? 'border-amber-500/50 text-amber-300 hover:bg-zinc-900'
                      : modoEscuro
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  } text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2`}
                >
                  Acessar sem conexão (modo desenvolvedor)
                </button>
              </div>
            </div>
          </div>
        ) : temDispositivo === null ? (
          <div className="flex-1 flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 border-3 border-[#5F7DE3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {modoDesenvolvedor && temDispositivo === false && (
              <div
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
                  altoContraste
                    ? 'bg-amber-400/10 text-amber-300 border border-amber-400/40'
                    : modoEscuro
                    ? 'bg-blue-950/40 text-blue-300 border border-blue-900/50'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                <span>Modo Desenvolvedor Ativo (sem dispositivo vinculado)</span>
                <span className="text-[11px] opacity-80 font-normal">Apenas simulação local</span>
              </div>
            )}
            <section 
              className="w-full h-24 sm:h-32 rounded-3xl p-6 sm:p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center shrink-0"
              style={{
                background: altoContraste ? '#000000' : 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)',
                border: altoContraste ? '2px solid #FACC15' : 'none'
              }}
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow-sm">Configurar seu dispositivo</h1>
            </section>

        {/* AVISO FIXO */}
        <div className={`w-full p-4 rounded-2xl border text-xs leading-relaxed text-justify shadow-xs ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-blue-50/70 border-blue-100 text-blue-900'}`}>
          <span className="font-bold">Aviso importante:</span> O dispositivo aceita no máximo 3 categorias e 5 ações por categoria por vez. Caso deseje cadastrar novos itens, será necessário apagar um item existente primeiro.
        </div>

        {/* BOTÃO GRANDE SALVAR ALTERAÇÕES EM CIMA DO SIMULADOR */}
        <div className="w-full">
          <button
            type="button"
            onClick={handleSalvarAlteracoes}
            disabled={salvandoTudo}
            className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-extrabold text-base sm:text-xl transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer ${
              altoContraste
                ? 'bg-amber-400 text-black border-2 border-black hover:bg-amber-500 disabled:opacity-50'
                : temAlteracoesPendentes
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/20 active:scale-[0.99]'
                  : 'bg-[#5F7DE3] hover:bg-[#4D66B8] text-white active:scale-[0.99]'
            }`}
          >
            {salvandoTudo ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvando alterações no banco e notificando dispositivo...</span>
              </>
            ) : (
              <>
                <Save className="w-6 h-6 shrink-0" />
                <span>Salvar alterações</span>
                {temAlteracoesPendentes && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${altoContraste ? 'bg-black text-amber-400' : 'bg-white/20 text-white'}`}>
                    Alterações pendentes
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* SIMULADOR VISUAL DO DISPOSITIVO FÍSICO COM CASA.SVG */}
        <SimuladorDispositivo
          categorias={categoriasList}
          categoriaAtivaId={categoriaAcessadaId}
          onSelecionarCategoria={(id) => setCategoriaAcessadaId(id)}
          onAdicionarCategoria={() => {
            if (categoriasList.length >= 3) {
              setFeedback({ tipo: 'atencao', titulo: 'Limite Atingido', mensagem: 'O dispositivo aceita no máximo 3 categorias. Apague uma existente para adicionar outra.' });
              return;
            }
            abrirModalCriarCategoria();
          }}
          onEditarCategoria={(cat) => {
            const catCompleta = categoriasList.find((c) => c.id === cat.id);
            if (catCompleta) abrirModalEditarCategoria(catCompleta);
          }}
          onAdicionarAcao={(catId) => {
            const cat = categoriasList.find((c) => c.id === catId);
            if (cat) abrirModalCriarAcao(cat);
          }}
          onEditarAcao={(botao, catId) => {
            const cat = categoriasList.find((c) => c.id === catId);
            const b = cat?.botoes.find((item) => item.id === botao.id);
            if (b) abrirModalEditarAcao(b, catId);
          }}
          onClicarAcao={(botao, catId) => {
            setCategoriaAcessadaId(catId);
          }}
          modoEscuro={modoEscuro}
          altoContraste={altoContraste}
          emitirSomBip={emitirSomBip}
        />

        {/* FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-auto">
              <select className={`appearance-none ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-500'} border rounded-2xl px-10 py-3 text-xs font-medium pr-10 cursor-pointer focus:outline-none shadow-xs w-full sm:w-auto`}>
                <option value="">Filtrar por</option>
                <option value="recentes">Mais recentes</option>
                <option value="az">A-Z</option>
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="relative flex-1 w-full max-w-full">
              <input 
                type="text" 
                placeholder="Busque por uma categoria...."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-600' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400'} border rounded-2xl pl-10 pr-4 py-3 text-xs focus:outline-none shadow-xs`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={() => {
              emitirSomBip(600, 0.05);
              if (categoriasList.length >= 3) {
                setFeedback({ tipo: 'atencao', titulo: 'Limite Atingido', mensagem: 'O dispositivo aceita no máximo 3 categorias. Apague uma existente para adicionar outra.' });
                return;
              }
              abrirModalCriarCategoria();
            }}
            className={`flex items-center gap-2 px-6 py-3 ${altoContraste ? 'bg-amber-400 hover:bg-amber-500 text-black' : 'bg-[#2589F5] hover:bg-[#1d78dc] text-white'} text-xs font-semibold rounded-2xl transition-all shadow-md cursor-pointer w-full sm:w-auto justify-center shrink-0`}
          >
            <Plus className="w-4 h-4" />
            Adicionar Categoria ({categoriasList.length}/3)
          </button>
        </div>

        {/* LISTA DE CATEGORIAS */}
        {categoriasFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-2 w-full pb-16 items-start">
            {categoriasFiltradas.map((cat) => (
              <div 
                key={cat.id} 
                className={`${altoContraste ? 'bg-black border-amber-500 hover:border-amber-400' : modoEscuro ? 'bg-slate-900 border-slate-800 hover:border-[#5F7DE3]/50' : 'bg-[#F3F4F8] border-slate-200/80 hover:border-[#5F7DE3]/50'} border rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-all w-full gap-4`}
              >
                {/* TOPO: Imagem da categoria, Nome, Ações de editar/excluir */}
                <div className="flex justify-between items-center px-1">
                  <div className={`flex items-center gap-3 font-bold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'} text-sm`}>
                    <div className={`w-12 h-12 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-400 border-amber-400' : 'bg-[#5F7DE3]/10 text-[#5F7DE3] border-[#5F7DE3]/20'} flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border shadow-xs`}>
                      {cat.imagem ? (
                        <img src={cat.imagem} alt={cat.nome} className="w-full h-full object-cover" />
                      ) : (
                        <Folder className="w-5 h-5 opacity-70" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base">{cat.nome}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Categoria</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        emitirSomBip(600, 0.05);
                        setShowEditModal(cat);
                        setEditCategoryName(cat.nome);
                        setEditCategoryEmoji(cat.emoji || '⭐');
                        setEditCategoryAudioTipo(cat.tipo_audio || 'feminino');
                        setEditCategoryImagem(null);
                      }}
                      title="Editar Categoria"
                      className={`w-8 h-8 rounded-full border ${altoContraste ? 'bg-zinc-900 text-amber-400 hover:bg-zinc-800 border-amber-500' : modoEscuro ? 'border-slate-700 bg-black text-white hover:bg-slate-900' : 'border-slate-200 bg-white text-black hover:bg-slate-100'} flex items-center justify-center transition-colors cursor-pointer shadow-xs`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        emitirSomBip(600, 0.05);
                        setCategoriaParaExcluir(cat);
                      }}
                      title="Excluir Categoria"
                      className={`w-8 h-8 rounded-full border ${altoContraste ? 'bg-zinc-900 text-rose-500 hover:bg-zinc-800 border-rose-500' : modoEscuro ? 'border-rose-900/50 bg-slate-800 text-rose-400 hover:bg-rose-950/40' : 'border-rose-200 bg-white text-rose-500 hover:bg-rose-50'} flex items-center justify-center transition-colors cursor-pointer shadow-xs`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* INFORMAÇÕES: Ações e Tipo de Áudio */}
                <div className="text-[11px] text-slate-400 px-1 font-medium flex items-center justify-between py-1 border-t border-b border-slate-200/60 dark:border-slate-800/60">
                  <span>Ações: <strong className={altoContraste ? 'text-amber-400' : 'text-slate-600 dark:text-slate-300'}>{cat.botoes?.length || 0}/5</strong></span>
                  <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> {cat.tipo_audio || 'feminino'}</span>
                </div>

                {/* BOTÃO ADICIONAR AÇÃO (SUBSTITUI O ANTIGO ACESSAR CATEGORIA & AÇÕES) */}
                <button 
                  onClick={() => abrirModalCriarAcao(cat)}
                  disabled={(cat.botoes?.length || 0) >= 5}
                  className={`w-full py-2.5 rounded-2xl ${
                    (cat.botoes?.length || 0) >= 5
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      : altoContraste
                      ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer'
                      : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white cursor-pointer'
                  } text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  {(cat.botoes?.length || 0) >= 5 ? 'Limite de Ações Atingido (5/5)' : `Adicionar Ação (${cat.botoes?.length || 0}/5)`}
                </button>

                {/* AÇÕES CADASTRADAS EMBAIXO DA RESPECTIVA CATEGORIA */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ações no Dispositivo ({cat.botoes?.length || 0}/5)
                    </span>
                  </div>

                  {Array.isArray(cat.botoes) && cat.botoes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {cat.botoes.map((botao, bIdx) => (
                        <div
                          key={botao.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                            altoContraste
                              ? 'bg-zinc-900 border-amber-500/70 text-amber-300'
                              : modoEscuro
                              ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                              : 'bg-white border-slate-200/80 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border ${
                              altoContraste
                                ? 'bg-black text-amber-400 border-amber-400'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            }`}>
                              {botao.imagem ? (
                                <img src={botao.imagem} alt={botao.rotulo} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold">B{bIdx + 1}</span>
                              )}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-bold truncate">{botao.rotulo}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Mic className="w-2.5 h-2.5 text-blue-500" />
                                {botao.tipo_audio || 'feminino'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => tocarAudio(botao)}
                              title="Tocar áudio"
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                altoContraste
                                  ? 'text-amber-400 border-amber-400 hover:bg-zinc-800'
                                  : 'text-[#5F7DE3] border-[#5F7DE3]/20 hover:bg-[#5F7DE3]/10'
                              }`}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirModalEditarAcao(botao, cat.id)}
                              title="Editar ação"
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                altoContraste
                                  ? 'text-amber-400 border-amber-400 hover:bg-zinc-800'
                                  : modoEscuro
                                  ? 'text-slate-300 border-slate-700 hover:bg-slate-800'
                                  : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAcaoParaExcluir({ catId: cat.id, catNome: cat.nome, botao })}
                              title="Excluir ação"
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                altoContraste
                                  ? 'text-rose-500 border-rose-500 hover:bg-zinc-800'
                                  : 'text-rose-500 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/50'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl border border-dashed text-center ${
                      altoContraste ? 'border-amber-500/40 text-amber-300/70' : 'border-slate-300 dark:border-slate-800 text-slate-400'
                    }`}>
                      <p className="text-[11px]">Nenhuma ação cadastrada nesta categoria.</p>
                      <p className="text-[10px] mt-0.5 text-slate-400">Clique em &quot;Adicionar Ação&quot; acima para criar.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : carregando ? (
          <div className="text-center text-xs text-slate-400 py-12">Carregando categorias...</div>
        ) : (
          <div className={`${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 my-4`}>
            <FolderOpen className="w-12 h-12 text-slate-400" />
            <h3 className={`font-bold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'} text-base`}>Nenhuma Categoria Encontrada</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Não há categorias cadastradas no momento. Clique no botão acima para adicionar a primeira (máximo de 3).
            </p>
          </div>
        )}
          </>
        )}
      </main>

      {/* MODAL ADICIONAR NOVA AÇÃO */}
      {showNovoBotao && (categoriaParaAcao || categoriaAcessada) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto`}>
            <button 
              onClick={fecharNovoBotao}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-3.5 border-b ${altoContraste ? 'border-zinc-800' : modoEscuro ? 'border-slate-800' : 'border-slate-100'} pb-4`}>
              <div className={`w-12 h-12 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-400 border-amber-400' : 'bg-[#5F7DE3]/10 text-[#5F7DE3] border-[#5F7DE3]/20'} flex items-center justify-center shrink-0 font-bold text-lg border shadow-xs`}>
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xl font-bold">Adicionar Nova Ação</h3>
                <span className="text-xs text-slate-400">
                  Na categoria: <strong className={altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}>{(categoriaParaAcao || categoriaAcessada)?.nome}</strong> ({((categoriaParaAcao || categoriaAcessada)?.botoes?.length || 0)}/5)
                </span>
              </div>
            </div>

            <form onSubmit={handleSalvarBotao} className="flex flex-col gap-4">
              {/* SELECT DE TIPO / ORIGEM DA AÇÃO */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium">Origem da Ação</label>
                <select
                  value={modoAcao}
                  onChange={(e) => {
                    const novoModo = e.target.value as 'predefinida' | 'personalizada';
                    setModoAcao(novoModo);
                    emitirSomBip(600, 0.05);
                    if (novoModo === 'personalizada') {
                      setAcaoPredefinida('');
                      setBotaoRotulo('');
                    } else {
                      const catAlvo = categoriaParaAcao || categoriaAcessada;
                      const catId = identificarCategoriaId(catAlvo?.nome || '');
                      const rotulosUsados = new Set(
                        (catAlvo?.botoes || []).map((b) => normalizarTexto(b.rotulo))
                      );
                      const lista = catId ? ACOES_CONFIG[catId] : null;
                      let primeira: { id: string; nome: string } | null = null;
                      if (lista) {
                        primeira = lista.find((a) => !rotulosUsados.has(normalizarTexto(a.nome)) && !rotulosUsados.has(normalizarTexto(a.id))) || null;
                      } else {
                        for (const grupo of Object.values(ACOES_CONFIG)) {
                          const achou = grupo.find((a) => !rotulosUsados.has(normalizarTexto(a.nome)) && !rotulosUsados.has(normalizarTexto(a.id)));
                          if (achou) {
                            primeira = achou;
                            break;
                          }
                        }
                      }
                      if (primeira) {
                        setAcaoPredefinida(primeira.id);
                        setBotaoRotulo(primeira.nome);
                      } else {
                        setAcaoPredefinida('');
                        setBotaoRotulo('');
                      }
                    }
                  }}
                  className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                >
                  <option value="predefinida">Ações Predefinidas</option>
                  <option value="personalizada">Adicionar Ação Personalizada</option>
                </select>
              </div>

              {/* SELECT DE AÇÕES PREDEFINIDAS */}
              {modoAcao === 'predefinida' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-400 font-medium">Selecione a Ação Predefinida</label>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setModoAcao('personalizada');
                          setAcaoPredefinida('');
                          setBotaoRotulo('');
                        }}
                        className="text-[11px] text-[#2589F5] hover:underline cursor-pointer"
                      >
                        + Criar personalizada
                      </button>
                    </div>
                    <select
                      value={acaoPredefinida}
                      onChange={(e) => {
                        const val = e.target.value;
                        emitirSomBip(600, 0.05);
                        if (val === '__personalizada__') {
                          setModoAcao('personalizada');
                          setAcaoPredefinida('');
                          setBotaoRotulo('');
                        } else {
                          setAcaoPredefinida(val);
                          for (const acoesGrupo of Object.values(ACOES_CONFIG)) {
                            const achou = acoesGrupo.find((a) => a.id === val);
                            if (achou) {
                              setBotaoRotulo(achou.nome);
                              break;
                            }
                          }
                        }
                      }}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                      autoFocus
                    >
                      <option value="">Selecione uma ação predefinida...</option>
                      {(() => {
                        const catAlvo = categoriaParaAcao || categoriaAcessada;
                        const catId = identificarCategoriaId(catAlvo?.nome || '');
                        const rotulosUsados = new Set(
                          (catAlvo?.botoes || []).map((b) => normalizarTexto(b.rotulo))
                        );

                        const gruposBrutos = catId
                          ? [{ id: catId, nome: CATEGORIAS_CONFIG.find((c) => c.id === catId)?.nome || catId, acoes: ACOES_CONFIG[catId] || [] }]
                          : CATEGORIAS_CONFIG.map((c) => ({ id: c.id, nome: c.nome, acoes: ACOES_CONFIG[c.id] || [] }));

                        const gruposParaExibir = gruposBrutos
                          .map((g) => ({
                            ...g,
                            acoesDisponiveis: g.acoes.filter(
                              (a) =>
                                !rotulosUsados.has(normalizarTexto(a.nome)) &&
                                !rotulosUsados.has(normalizarTexto(a.id))
                            ),
                          }))
                          .filter((g) => g.acoesDisponiveis.length > 0);

                        const totalDisponiveis = gruposParaExibir.reduce(
                          (acc, g) => acc + g.acoesDisponiveis.length,
                          0
                        );

                        return (
                          <>
                            {gruposParaExibir.map((g) => (
                              <optgroup key={g.id} label={`Ações de ${g.nome}`}>
                                {g.acoesDisponiveis.map((a) => {
                                  const info = predefinidosData?.acoes[g.id]?.[a.id];
                                  const statusTexto = info?.temImagem && info?.temAudio
                                    ? '✓ (Pronto)'
                                    : info?.temImagem
                                    ? '📷 (Foto Pronta)'
                                    : '✗ (Faltam foto/áudio)';
                                  return (
                                    <option key={a.id} value={a.id}>
                                      {a.nome} {statusTexto}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            ))}
                            {totalDisponiveis === 0 && (
                              <option value="" disabled>
                                Todas as ações predefinidas desta categoria já estão em uso
                              </option>
                            )}
                            <option value="__personalizada__">+ Adicionar ação personalizada...</option>
                          </>
                        );
                      })()}
                    </select>
                  </div>

                  {/* TIPO DE VOZ DA FALA - LOGO ABAIXO DO SELECT */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz da Fala</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setBotaoTipoAudio('feminino');
                          if (modoAcao === 'predefinida' && acaoPredefinida) {
                            const catId = identificarCategoriaId((categoriaParaAcao || categoriaAcessada)?.nome || '');
                            let info = catId ? predefinidosData?.acoes[catId]?.[acaoPredefinida] : undefined;
                            if (!info && predefinidosData?.acoes) {
                              for (const grp of Object.values(predefinidosData.acoes)) {
                                if (grp[acaoPredefinida]) { info = grp[acaoPredefinida]; break; }
                              }
                            }
                            const audioUrl = info?.audioFeminino || info?.audio;
                            if (audioUrl) tocarAudioUrl(audioUrl);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          botaoTipoAudio === 'feminino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setBotaoTipoAudio('masculino');
                          if (modoAcao === 'predefinida' && acaoPredefinida) {
                            const catId = identificarCategoriaId((categoriaParaAcao || categoriaAcessada)?.nome || '');
                            let info = catId ? predefinidosData?.acoes[catId]?.[acaoPredefinida] : undefined;
                            if (!info && predefinidosData?.acoes) {
                              for (const grp of Object.values(predefinidosData.acoes)) {
                                if (grp[acaoPredefinida]) { info = grp[acaoPredefinida]; break; }
                              }
                            }
                            const audioUrl = info?.audioMasculino || info?.audio;
                            if (audioUrl) tocarAudioUrl(audioUrl);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          botaoTipoAudio === 'masculino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW DA AÇÃO PREDEFINIDA COM FOTO GRANDE E BOTÃO DE OUVIR */}
                  {(() => {
                    if (!acaoPredefinida) return null;
                    const catId = identificarCategoriaId((categoriaParaAcao || categoriaAcessada)?.nome || '');
                    let info = catId ? predefinidosData?.acoes[catId]?.[acaoPredefinida] : undefined;
                    if (!info && predefinidosData?.acoes) {
                      for (const grp of Object.values(predefinidosData.acoes)) {
                        if (grp[acaoPredefinida]) {
                          info = grp[acaoPredefinida];
                          break;
                        }
                      }
                    }

                    if (!info?.temImagem && !info?.temAudio) {
                      return (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex flex-col gap-1">
                          <span className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Mídia não encontrada
                          </span>
                          <span className="text-[11px] opacity-90 leading-relaxed">
                            Esta ação não possui imagem nem áudio na pasta <code>frontend/public/predefinidos/</code>. Coloque os arquivos (ex: <code>{acaoPredefinida}.jpg</code> ou <code>{acaoPredefinida}.png</code>) ou cadastre como personalizada.
                          </span>
                        </div>
                      );
                    }

                    const audioUrlAtual = botaoTipoAudio === 'masculino'
                      ? (info.audioMasculino || info.audio)
                      : (info.audioFeminino || info.audio);

                    return (
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3.5 text-center">
                        {info.imagem && (
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-950 flex items-center justify-center">
                            <img
                              src={info.imagem}
                              alt={info.nome}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {audioUrlAtual && (
                          <button
                            type="button"
                            onClick={() => tocarAudioUrl(audioUrlAtual)}
                            className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                              altoContraste
                                ? 'bg-amber-400 text-black font-bold'
                                : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>Ouvir Áudio ({botaoTipoAudio === 'masculino' ? 'Voz Masculina' : 'Voz Feminina'})</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* OPÇÃO DE TROCAR MÍDIA PREDEFINIDA */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">Personalizar mídia predefinida (opcional):</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Trocar Imagem (opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => setBotaoImagem(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Trocar Áudio (opcional)
                      </label>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,.mp3,.wav"
                        onChange={(e) => setBotaoAudio(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* MODO PERSONALIZADO */
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-400 font-medium">Nome / Rótulo da Ação (Obrigatório)</label>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setModoAcao('predefinida');
                        }}
                        className="text-[11px] text-[#2589F5] hover:underline cursor-pointer"
                      >
                        Voltar para predefinidas
                      </button>
                    </div>
                    <input
                      value={botaoRotulo}
                      onChange={(e) => setBotaoRotulo(e.target.value)}
                      placeholder="Digite o nome da ação personalizada (ex.: Tomar Remédio)"
                      maxLength={60}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs`}
                      autoFocus
                    />
                  </div>

                  {/* TIPO DE VOZ DA FALA - LOGO ABAIXO DO NOME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz da Fala</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setBotaoTipoAudio('feminino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${botaoTipoAudio === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setBotaoTipoAudio('masculino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${botaoTipoAudio === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Imagem da Ação
                      </span>
                      <strong className="text-rose-500 text-[10px]">* Obrigatório</strong>
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => setBotaoImagem(e.target.files?.[0] ?? null)}
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Arquivo de Áudio da Ação
                      </span>
                      <strong className="text-rose-500 text-[10px]">* Obrigatório</strong>
                    </label>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,.mp3,.wav"
                      onChange={(e) => setBotaoAudio(e.target.files?.[0] ?? null)}
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                    />
                  </div>

                  {/* GERADOR DE VOZ HUMANIZADA PARA AÇÃO PERSONALIZADA */}
                  <GeradorVozHumanizada
                    textoInicial={botaoRotulo}
                    rotuloAcao="esta ação personalizada"
                    modoEscuro={modoEscuro}
                    altoContraste={altoContraste}
                    emitirSomBip={emitirSomBip}
                    onAudioSelecionado={(arquivo) => {
                      setBotaoAudio(arquivo);
                    }}
                  />
                </>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="submit" 
                  disabled={salvando} 
                  className={`flex-1 py-3 rounded-2xl ${altoContraste ? 'bg-amber-400 hover:bg-amber-500 text-black font-bold' : 'bg-[#2589F5] hover:bg-[#1d78dc] text-white font-semibold'} text-xs transition-all shadow-md cursor-pointer`}
                >
                  {salvando ? 'Salvando Ação...' : 'Salvar Ação'}
                </button>
                <button 
                  type="button" 
                  onClick={fecharNovoBotao} 
                  className={`px-5 py-3 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} font-semibold text-xs cursor-pointer`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO DE AÇÃO */}
      {acaoParaExcluir && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl border relative flex flex-col gap-4 text-center`}>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Excluir Ação</h3>
              <p className="text-xs text-slate-400 mt-1">
                Deseja remover a ação <strong>&quot;{acaoParaExcluir.botao.rotulo}&quot;</strong> da categoria <strong>&quot;{acaoParaExcluir.catNome}&quot;</strong>?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={confirmarExcluirBotao}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-all shadow-sm"
              >
                Sim, Excluir
              </button>
              <button
                type="button"
                onClick={() => setAcaoParaExcluir(null)}
                className={`px-4 py-2.5 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'} font-semibold text-xs cursor-pointer`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CATEGORIA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F3EFF5] border-indigo-100'} w-full max-w-md rounded-3xl p-8 shadow-2xl border relative flex flex-col items-center text-center max-h-[90vh] overflow-y-auto`}>
            <button onClick={() => { emitirSomBip(500, 0.05); setShowAddModal(false); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className={`w-6 h-6 ${altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}`} />
              <h3 className={`text-xl font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>Adicionar <span className="text-amber-500">Categoria</span></h3>
            </div>
            
            <form onSubmit={handleAddCategory} className="w-full flex flex-col gap-4 text-left mt-4">
              {/* SELECT DE TIPO / ORIGEM DA CATEGORIA */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium">Origem da Categoria</label>
                <select
                  value={modoCategoria}
                  onChange={(e) => {
                    const novoModo = e.target.value as 'predefinida' | 'personalizada';
                    setModoCategoria(novoModo);
                    emitirSomBip(600, 0.05);
                    if (novoModo === 'predefinida') {
                      const disponiveis = CATEGORIAS_CONFIG.filter((c) => {
                        return !categoriasList.some(
                          (cat) =>
                            normalizarTexto(cat.nome) === normalizarTexto(c.nome) ||
                            cat.id === c.id ||
                            identificarCategoriaId(cat.nome) === c.id
                        );
                      });
                      if (disponiveis.length > 0) {
                        setCategoriaPredefinidaId(disponiveis[0].id);
                        setNewCategoryName(disponiveis[0].nome);
                        setNewCategoryEmoji(disponiveis[0].emoji);
                      } else {
                        setCategoriaPredefinidaId('');
                        setNewCategoryName('');
                        setNewCategoryEmoji('⭐');
                      }
                    } else {
                      setNewCategoryName('');
                      setNewCategoryEmoji('⭐');
                    }
                  }}
                  className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                >
                  <option value="predefinida">Categorias Predefinidas (Casa, Desejos, Emoções)</option>
                  <option value="personalizada">Adicionar Categoria Personalizada</option>
                </select>
              </div>

              {modoCategoria === 'predefinida' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Selecione a Categoria Predefinida</label>
                    <select
                      value={categoriaPredefinidaId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        emitirSomBip(600, 0.05);
                        if (cid === '__personalizada__') {
                          setModoCategoria('personalizada');
                          setNewCategoryName('');
                          setNewCategoryEmoji('⭐');
                        } else {
                          setCategoriaPredefinidaId(cid);
                          const conf = CATEGORIAS_CONFIG.find((c) => c.id === cid);
                          setNewCategoryName(conf ? conf.nome : '');
                          setNewCategoryEmoji(conf ? conf.emoji : '⭐');
                        }
                      }}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                    >
                      {(() => {
                        const categoriasDisponiveis = CATEGORIAS_CONFIG.filter((c) => {
                          return !categoriasList.some(
                            (cat) =>
                              normalizarTexto(cat.nome) === normalizarTexto(c.nome) ||
                              cat.id === c.id ||
                              identificarCategoriaId(cat.nome) === c.id
                          );
                        });

                        return (
                          <>
                            {categoriasDisponiveis.map((c) => {
                              const info = predefinidosData?.categorias[c.id];
                              const statusTexto = info?.temImagem && info?.temAudio
                                ? '✓ (Pronto)'
                                : info?.temImagem
                                ? '📷 (Foto Pronta)'
                                : '✗ (Faltam foto/áudio)';
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.nome} {statusTexto}
                                </option>
                              );
                            })}
                            {categoriasDisponiveis.length === 0 && (
                              <option value="" disabled>
                                Todas as categorias predefinidas já estão em uso
                              </option>
                            )}
                            <option value="__personalizada__">+ Adicionar categoria personalizada...</option>
                          </>
                        );
                      })()}
                    </select>
                  </div>

                  {/* TIPO DE VOZ PADRÃO - LOGO ABAIXO DO SELECT */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz Padrão</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setNewCategoryAudioTipo('feminino');
                          if (modoCategoria === 'predefinida') {
                            const info = predefinidosData?.categorias[categoriaPredefinidaId];
                            const url = info?.audioFeminino || info?.audio;
                            if (url) tocarAudioUrl(url);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          newCategoryAudioTipo === 'feminino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setNewCategoryAudioTipo('masculino');
                          if (modoCategoria === 'predefinida') {
                            const info = predefinidosData?.categorias[categoriaPredefinidaId];
                            const url = info?.audioMasculino || info?.audio;
                            if (url) tocarAudioUrl(url);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          newCategoryAudioTipo === 'masculino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW DA CATEGORIA PREDEFINIDA COM FOTO GRANDE E BOTÃO DE OUVIR */}
                  {(() => {
                    const info = predefinidosData?.categorias[categoriaPredefinidaId];
                    if (!info?.temImagem && !info?.temAudio) {
                      return (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex flex-col gap-1">
                          <span className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Mídia não encontrada
                          </span>
                          <span className="text-[11px] opacity-90 leading-relaxed">
                            Esta categoria não possui imagem na pasta <code>frontend/public/predefinidos/imagens/</code>.
                          </span>
                        </div>
                      );
                    }

                    const audioUrlAtual = newCategoryAudioTipo === 'masculino'
                      ? (info.audioMasculino || info.audio)
                      : (info.audioFeminino || info.audio);

                    return (
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3.5 text-center">
                        {info.imagem && (
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-950 flex items-center justify-center">
                            <img
                              src={info.imagem}
                              alt={info.nome}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {audioUrlAtual && (
                          <button
                            type="button"
                            onClick={() => tocarAudioUrl(audioUrlAtual)}
                            className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                              altoContraste
                                ? 'bg-amber-400 text-black font-bold'
                                : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>Ouvir Áudio ({newCategoryAudioTipo === 'masculino' ? 'Voz Masculina' : 'Voz Feminina'})</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* OPÇÃO DE TROCAR POR IMAGEM / ÁUDIO CUSTOMIZADOS */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">Personalizar mídia predefinida (opcional):</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Trocar Imagem (opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => setNewCategoryImagem(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Trocar Áudio (opcional)
                      </label>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,.mp3,.wav"
                        onChange={(e) => setNewCategoryAudio(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* MODO PERSONALIZADO */
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Nome da Categoria (Obrigatório)</label>
                    <input 
                      type="text" 
                      placeholder="Exemplo: Rotina Matinal..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs`}
                      autoFocus
                    />
                  </div>

                  {/* TIPO DE VOZ PADRÃO - LOGO ABAIXO DO NOME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz Padrão</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setNewCategoryAudioTipo('feminino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${newCategoryAudioTipo === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setNewCategoryAudioTipo('masculino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${newCategoryAudioTipo === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Imagem da Categoria
                      </span>
                      <strong className="text-rose-500 text-[10px]">* Obrigatório</strong>
                    </label>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" 
                      onChange={(e) => setNewCategoryImagem(e.target.files?.[0] ?? null)} 
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Arquivo de Áudio da Categoria
                      </span>
                      <strong className="text-rose-500 text-[10px]">* Obrigatório</strong>
                    </label>
                    <input 
                      type="file" 
                      accept="audio/mpeg,audio/wav,.mp3,.wav" 
                      onChange={(e) => setNewCategoryAudio(e.target.files?.[0] ?? null)} 
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                    />
                  </div>

                  <GeradorVozHumanizada
                    textoInicial={newCategoryName}
                    rotuloAcao="esta categoria personalizada"
                    modoEscuro={modoEscuro}
                    altoContraste={altoContraste}
                    emitirSomBip={emitirSomBip}
                    onAudioSelecionado={(arquivo) => {
                      setNewCategoryAudio(arquivo);
                    }}
                  />
                </>
              )}

              <button type="submit" className={`w-full py-3.5 rounded-2xl ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#2589F5] hover:bg-[#1d78dc] text-white'} font-semibold text-sm transition-all shadow-md mt-2 cursor-pointer`}>
                Salvar Categoria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CATEGORIA */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F3EFF5] border-indigo-100'} w-full max-w-md rounded-3xl p-8 shadow-2xl border relative flex flex-col items-center text-center max-h-[90vh] overflow-y-auto`}>
            <button onClick={() => { emitirSomBip(500, 0.05); setShowEditModal(null); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Pencil className={`w-6 h-6 ${altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}`} />
              <h3 className={`text-xl font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>Editar <span className="text-amber-500">Categoria</span></h3>
            </div>
            
            <form onSubmit={handleEditCategory} className="w-full flex flex-col gap-4 text-left mt-4">
              {/* SELECT DE TIPO / ORIGEM DA CATEGORIA */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium">Origem da Categoria</label>
                <select
                  value={editModoCategoria}
                  onChange={(e) => {
                    const novoModo = e.target.value as 'predefinida' | 'personalizada';
                    setEditModoCategoria(novoModo);
                    emitirSomBip(600, 0.05);
                    if (novoModo === 'predefinida') {
                      const disponiveis = CATEGORIAS_CONFIG.filter((c) => {
                        return !categoriasList.some(
                          (cat) =>
                            cat.id !== showEditModal.id &&
                            (normalizarTexto(cat.nome) === normalizarTexto(c.nome) ||
                              cat.id === c.id ||
                              identificarCategoriaId(cat.nome) === c.id)
                        );
                      });
                      const atualOuPrimeira = disponiveis.find((c) => normalizarTexto(c.nome) === normalizarTexto(showEditModal.nome) || c.id === identificarCategoriaId(showEditModal.nome)) || disponiveis[0];
                      if (atualOuPrimeira) {
                        setEditCategoriaPredefinidaId(atualOuPrimeira.id);
                        setEditCategoryName(atualOuPrimeira.nome);
                        setEditCategoryEmoji(atualOuPrimeira.emoji);
                      }
                    } else {
                      setEditCategoryName(showEditModal.nome || '');
                      setEditCategoryEmoji(showEditModal.emoji || '⭐');
                    }
                  }}
                  className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                >
                  <option value="predefinida">Categorias Predefinidas (Casa, Desejos, Emoções)</option>
                  <option value="personalizada">Categoria Personalizada</option>
                </select>
              </div>

              {editModoCategoria === 'predefinida' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Selecione a Categoria Predefinida</label>
                    <select
                      value={editCategoriaPredefinidaId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        emitirSomBip(600, 0.05);
                        if (cid === '__personalizada__') {
                          setEditModoCategoria('personalizada');
                          setEditCategoryName('');
                          setEditCategoryEmoji('⭐');
                        } else {
                          setEditCategoriaPredefinidaId(cid);
                          const conf = CATEGORIAS_CONFIG.find((c) => c.id === cid);
                          setEditCategoryName(conf ? conf.nome : '');
                          setEditCategoryEmoji(conf ? conf.emoji : '⭐');
                        }
                      }}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                    >
                      {(() => {
                        const categoriasDisponiveis = CATEGORIAS_CONFIG.filter((c) => {
                          return !categoriasList.some(
                            (cat) =>
                              cat.id !== showEditModal.id &&
                              (normalizarTexto(cat.nome) === normalizarTexto(c.nome) ||
                                cat.id === c.id ||
                                identificarCategoriaId(cat.nome) === c.id)
                          );
                        });

                        return (
                          <>
                            {categoriasDisponiveis.map((c) => {
                              const info = predefinidosData?.categorias[c.id];
                              const statusTexto = info?.temImagem && info?.temAudio
                                ? '✓ (Pronto)'
                                : info?.temImagem
                                ? '📷 (Foto Pronta)'
                                : '✗ (Faltam foto/áudio)';
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.nome} {statusTexto}
                                </option>
                              );
                            })}
                            <option value="__personalizada__">+ Mudar para personalizada...</option>
                          </>
                        );
                      })()}
                    </select>
                  </div>

                  {/* TIPO DE VOZ PADRÃO - LOGO ABAIXO DO SELECT */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz Padrão</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setEditCategoryAudioTipo('feminino');
                          if (editModoCategoria === 'predefinida') {
                            const info = predefinidosData?.categorias[editCategoriaPredefinidaId];
                            const url = info?.audioFeminino || info?.audio;
                            if (url) tocarAudioUrl(url);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          editCategoryAudioTipo === 'feminino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setEditCategoryAudioTipo('masculino');
                          if (editModoCategoria === 'predefinida') {
                            const info = predefinidosData?.categorias[editCategoriaPredefinidaId];
                            const url = info?.audioMasculino || info?.audio;
                            if (url) tocarAudioUrl(url);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          editCategoryAudioTipo === 'masculino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW DA CATEGORIA PREDEFINIDA COM FOTO GRANDE E BOTÃO DE OUVIR */}
                  {(() => {
                    const info = predefinidosData?.categorias[editCategoriaPredefinidaId];
                    if (!info?.temImagem && !info?.temAudio && !showEditModal.imagem) {
                      return (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex flex-col gap-1">
                          <span className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Mídia não encontrada
                          </span>
                          <span className="text-[11px] opacity-90 leading-relaxed">
                            Esta categoria não possui imagem na pasta <code>frontend/public/predefinidos/imagens/</code>.
                          </span>
                        </div>
                      );
                    }

                    const audioUrlAtual = editCategoryAudioTipo === 'masculino'
                      ? (info?.audioMasculino || info?.audio || showEditModal.audio)
                      : (info?.audioFeminino || info?.audio || showEditModal.audio);
                    const imagemUrlAtual = info?.imagem || showEditModal.imagem;

                    return (
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3.5 text-center">
                        {imagemUrlAtual && (
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-950 flex items-center justify-center">
                            <img
                              src={imagemUrlAtual}
                              alt={info?.nome || editCategoryName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {audioUrlAtual && (
                          <button
                            type="button"
                            onClick={() => tocarAudioUrl(audioUrlAtual)}
                            className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                              altoContraste
                                ? 'bg-amber-400 text-black font-bold'
                                : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>Ouvir Áudio ({editCategoryAudioTipo === 'masculino' ? 'Voz Masculina' : 'Voz Feminina'})</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* OPÇÃO DE TROCAR POR IMAGEM / ÁUDIO CUSTOMIZADOS */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">Personalizar mídia predefinida (opcional):</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Trocar Imagem (opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => setEditCategoryImagem(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Trocar Áudio (opcional)
                      </label>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,.mp3,.wav"
                        onChange={(e) => setEditCategoryAudio(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* MODO PERSONALIZADO */
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Nome da Categoria (Obrigatório)</label>
                    <input 
                      type="text" 
                      placeholder="Exemplo: Rotina Matinal..."
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs`}
                      autoFocus
                    />
                  </div>

                  {/* TIPO DE VOZ PADRÃO - LOGO ABAIXO DO NOME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz Padrão</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setEditCategoryAudioTipo('feminino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${editCategoryAudioTipo === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setEditCategoryAudioTipo('masculino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${editCategoryAudioTipo === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Imagem da Categoria
                      </span>
                    </label>
                    {showEditModal.imagem && (
                      <div className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm mx-auto bg-white dark:bg-slate-950 flex items-center justify-center">
                        <img src={showEditModal.imagem} alt={showEditModal.nome} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" 
                      onChange={(e) => setEditCategoryImagem(e.target.files?.[0] ?? null)} 
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Arquivo de Áudio da Categoria
                      </span>
                    </label>
                    {showEditModal.audio && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500">Áudio atual</span>
                        <button
                          type="button"
                          onClick={() => tocarAudioUrl(showEditModal.audio!)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Volume2 className="w-3 h-3" /> Ouvir
                        </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="audio/mpeg,audio/wav,.mp3,.wav" 
                      onChange={(e) => setEditCategoryAudio(e.target.files?.[0] ?? null)} 
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                    />
                  </div>

                  <GeradorVozHumanizada
                    textoInicial={editCategoryName}
                    rotuloAcao="esta categoria"
                    modoEscuro={modoEscuro}
                    altoContraste={altoContraste}
                    emitirSomBip={emitirSomBip}
                    onAudioSelecionado={(arquivo) => {
                      setEditCategoryAudio(arquivo);
                    }}
                  />
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={salvando}
                  className={`flex-1 py-3.5 rounded-2xl ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold'} text-xs transition-all shadow-md cursor-pointer`}
                >
                  {salvando ? 'Atualizando...' : 'Atualizar Categoria'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitirSomBip(500, 0.05);
                    setShowEditModal(null);
                  }}
                  className={`px-4 py-3 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} font-semibold text-xs cursor-pointer`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR AÇÃO */}
      {showEditBotaoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto`}>
            <button
              onClick={() => {
                emitirSomBip(500, 0.05);
                setShowEditBotaoModal(null);
                setEditBotaoCatId(null);
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-3.5 border-b ${altoContraste ? 'border-zinc-800' : modoEscuro ? 'border-slate-800' : 'border-slate-100'} pb-4`}>
              <div className={`w-12 h-12 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-400 border-amber-400' : 'bg-[#5F7DE3]/10 text-[#5F7DE3] border-[#5F7DE3]/20'} flex items-center justify-center shrink-0 font-bold text-lg border shadow-xs`}>
                <Pencil className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xl font-bold">Editar Ação</h3>
                <span className="text-xs text-slate-400">
                  Na categoria: <strong className={altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}>{categoriasList.find(c => c.id === editBotaoCatId)?.nome}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleSalvarEdicaoBotao} className="flex flex-col gap-4">
              {/* SELECT DE TIPO / ORIGEM DA AÇÃO */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium">Origem da Ação</label>
                <select
                  value={editModoAcao}
                  onChange={(e) => {
                    const novoModo = e.target.value as 'predefinida' | 'personalizada';
                    setEditModoAcao(novoModo);
                    emitirSomBip(600, 0.05);
                    if (novoModo === 'personalizada') {
                      setEditAcaoPredefinida('');
                      setEditBotaoRotulo(showEditBotaoModal.rotulo || '');
                    } else {
                      const catAlvo = categoriasList.find(c => c.id === editBotaoCatId);
                      const catId = identificarCategoriaId(catAlvo?.nome || '');
                      const rotulosUsados = new Set(
                        (catAlvo?.botoes || []).filter(b => b.id !== showEditBotaoModal.id).map(b => normalizarTexto(b.rotulo))
                      );
                      const lista = catId ? ACOES_CONFIG[catId] : null;
                      let primeira: { id: string; nome: string } | null = null;
                      if (lista) {
                        primeira = lista.find(a => !rotulosUsados.has(normalizarTexto(a.nome)) && !rotulosUsados.has(normalizarTexto(a.id))) || null;
                      } else {
                        for (const grupo of Object.values(ACOES_CONFIG)) {
                          const achou = grupo.find(a => !rotulosUsados.has(normalizarTexto(a.nome)) && !rotulosUsados.has(normalizarTexto(a.id)));
                          if (achou) {
                            primeira = achou;
                            break;
                          }
                        }
                      }
                      if (primeira) {
                        setEditAcaoPredefinida(primeira.id);
                        setEditBotaoRotulo(primeira.nome);
                      }
                    }
                  }}
                  className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                >
                  <option value="predefinida">Ações Predefinidas</option>
                  <option value="personalizada">Ação Personalizada</option>
                </select>
              </div>

              {/* SELECT DE AÇÕES PREDEFINIDAS */}
              {editModoAcao === 'predefinida' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-400 font-medium">Selecione a Ação Predefinida</label>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setEditModoAcao('personalizada');
                          setEditAcaoPredefinida('');
                        }}
                        className="text-[11px] text-[#2589F5] hover:underline cursor-pointer"
                      >
                        + Mudar para personalizada
                      </button>
                    </div>
                    <select
                      value={editAcaoPredefinida}
                      onChange={(e) => {
                        const val = e.target.value;
                        emitirSomBip(600, 0.05);
                        if (val === '__personalizada__') {
                          setEditModoAcao('personalizada');
                          setEditAcaoPredefinida('');
                        } else {
                          setEditAcaoPredefinida(val);
                          for (const acoesGrupo of Object.values(ACOES_CONFIG)) {
                            const achou = acoesGrupo.find((a) => a.id === val);
                            if (achou) {
                              setEditBotaoRotulo(achou.nome);
                              break;
                            }
                          }
                        }
                      }}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs cursor-pointer`}
                      autoFocus
                    >
                      <option value="">Selecione uma ação predefinida...</option>
                      {(() => {
                        const catAlvo = categoriasList.find(c => c.id === editBotaoCatId);
                        const catId = identificarCategoriaId(catAlvo?.nome || '');
                        const rotulosUsados = new Set(
                          (catAlvo?.botoes || [])
                            .filter((b) => b.id !== showEditBotaoModal.id)
                            .map((b) => normalizarTexto(b.rotulo))
                        );

                        const gruposBrutos = catId
                          ? [{ id: catId, nome: CATEGORIAS_CONFIG.find((c) => c.id === catId)?.nome || catId, acoes: ACOES_CONFIG[catId] || [] }]
                          : CATEGORIAS_CONFIG.map((c) => ({ id: c.id, nome: c.nome, acoes: ACOES_CONFIG[c.id] || [] }));

                        const gruposParaExibir = gruposBrutos
                          .map((g) => ({
                            ...g,
                            acoesDisponiveis: g.acoes.filter(
                              (a) =>
                                !rotulosUsados.has(normalizarTexto(a.nome)) &&
                                !rotulosUsados.has(normalizarTexto(a.id))
                            ),
                          }))
                          .filter((g) => g.acoesDisponiveis.length > 0);

                        return (
                          <>
                            {gruposParaExibir.map((g) => (
                              <optgroup key={g.id} label={`Ações de ${g.nome}`}>
                                {g.acoesDisponiveis.map((a) => {
                                  const info = predefinidosData?.acoes[g.id]?.[a.id];
                                  const statusTexto = info?.temImagem && info?.temAudio
                                    ? '✓ (Pronto)'
                                    : info?.temImagem
                                    ? '📷 (Foto Pronta)'
                                    : '✗ (Faltam foto/áudio)';
                                  return (
                                    <option key={a.id} value={a.id}>
                                      {a.nome} {statusTexto}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            ))}
                            <option value="__personalizada__">+ Mudar para personalizada...</option>
                          </>
                        );
                      })()}
                    </select>
                  </div>

                  {/* TIPO DE VOZ DA FALA - LOGO ABAIXO DO SELECT */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz da Fala</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setEditBotaoTipoAudio('feminino');
                          if (editModoAcao === 'predefinida' && editAcaoPredefinida) {
                            const catAlvo = categoriasList.find(c => c.id === editBotaoCatId);
                            const catId = identificarCategoriaId(catAlvo?.nome || '');
                            let info = catId ? predefinidosData?.acoes[catId]?.[editAcaoPredefinida] : undefined;
                            if (!info && predefinidosData?.acoes) {
                              for (const grp of Object.values(predefinidosData.acoes)) {
                                if (grp[editAcaoPredefinida]) { info = grp[editAcaoPredefinida]; break; }
                              }
                            }
                            const audioUrl = info?.audioFeminino || info?.audio;
                            if (audioUrl) tocarAudioUrl(audioUrl);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          editBotaoTipoAudio === 'feminino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setEditBotaoTipoAudio('masculino');
                          if (editModoAcao === 'predefinida' && editAcaoPredefinida) {
                            const catAlvo = categoriasList.find(c => c.id === editBotaoCatId);
                            const catId = identificarCategoriaId(catAlvo?.nome || '');
                            let info = catId ? predefinidosData?.acoes[catId]?.[editAcaoPredefinida] : undefined;
                            if (!info && predefinidosData?.acoes) {
                              for (const grp of Object.values(predefinidosData.acoes)) {
                                if (grp[editAcaoPredefinida]) { info = grp[editAcaoPredefinida]; break; }
                              }
                            }
                            const audioUrl = info?.audioMasculino || info?.audio;
                            if (audioUrl) tocarAudioUrl(audioUrl);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          editBotaoTipoAudio === 'masculino'
                            ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs')
                            : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW DA AÇÃO COM FOTO GRANDE E BOTÃO DE OUVIR */}
                  {(() => {
                    const catAlvo = categoriasList.find(c => c.id === editBotaoCatId);
                    const catId = identificarCategoriaId(catAlvo?.nome || '');
                    let info = catId ? predefinidosData?.acoes[catId]?.[editAcaoPredefinida] : undefined;
                    if (!info && predefinidosData?.acoes && editAcaoPredefinida) {
                      for (const grp of Object.values(predefinidosData.acoes)) {
                        if (grp[editAcaoPredefinida]) {
                          info = grp[editAcaoPredefinida];
                          break;
                        }
                      }
                    }

                    const audioUrlAtual = editBotaoTipoAudio === 'masculino'
                      ? (info?.audioMasculino || info?.audio || showEditBotaoModal.audio)
                      : (info?.audioFeminino || info?.audio || showEditBotaoModal.audio);
                    const imagemUrlAtual = info?.imagem || showEditBotaoModal.imagem;

                    return (
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3.5 text-center">
                        {imagemUrlAtual && (
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-950 flex items-center justify-center">
                            <img
                              src={imagemUrlAtual}
                              alt={info?.nome || editBotaoRotulo}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {audioUrlAtual && (
                          <button
                            type="button"
                            onClick={() => tocarAudioUrl(audioUrlAtual)}
                            className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                              altoContraste
                                ? 'bg-amber-400 text-black font-bold'
                                : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>Ouvir Áudio ({editBotaoTipoAudio === 'masculino' ? 'Voz Masculina' : 'Voz Feminina'})</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* OPÇÃO DE TROCAR MÍDIA PREDEFINIDA */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">Personalizar mídia predefinida (opcional):</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Trocar Imagem (opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => setEditBotaoImagem(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Trocar Áudio (opcional)
                      </label>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,.mp3,.wav"
                        onChange={(e) => setEditBotaoAudio(e.target.files?.[0] ?? null)}
                        className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* MODO PERSONALIZADO */
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-400 font-medium">Nome / Rótulo da Ação (Obrigatório)</label>
                      <button
                        type="button"
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setEditModoAcao('predefinida');
                        }}
                        className="text-[11px] text-[#2589F5] hover:underline cursor-pointer"
                      >
                        Voltar para predefinidas
                      </button>
                    </div>
                    <input
                      value={editBotaoRotulo}
                      onChange={(e) => setEditBotaoRotulo(e.target.value)}
                      placeholder="Digite o nome da ação"
                      maxLength={60}
                      className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs`}
                      autoFocus
                    />
                  </div>

                  {/* TIPO DE VOZ DA FALA - LOGO ABAIXO DO NOME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz da Fala</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setEditBotaoTipoAudio('feminino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${editBotaoTipoAudio === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => { emitirSomBip(600, 0.05); setEditBotaoTipoAudio('masculino'); }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${editBotaoTipoAudio === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-[#5F7DE3] text-white border-[#5F7DE3] shadow-xs') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                      >
                        <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5F7DE3]" /> Imagem da Ação
                      </span>
                    </label>
                    {showEditBotaoModal.imagem && (
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mx-auto shadow-sm bg-white dark:bg-slate-950 flex items-center justify-center">
                        <img src={showEditBotaoModal.imagem} alt={showEditBotaoModal.rotulo} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => setEditBotaoImagem(e.target.files?.[0] ?? null)}
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Arquivo de Áudio da Ação
                      </span>
                    </label>
                    {showEditBotaoModal.audio && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500">Áudio atualmente associado</span>
                        <button
                          type="button"
                          onClick={() => tocarAudioUrl(showEditBotaoModal.audio!)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Volume2 className="w-3 h-3" /> Ouvir
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,.mp3,.wav"
                      onChange={(e) => setEditBotaoAudio(e.target.files?.[0] ?? null)}
                      className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                    />
                  </div>

                  {/* GERADOR DE VOZ HUMANIZADA PARA AÇÃO */}
                  <GeradorVozHumanizada
                    textoInicial={editBotaoRotulo}
                    rotuloAcao="esta ação"
                    modoEscuro={modoEscuro}
                    altoContraste={altoContraste}
                    emitirSomBip={emitirSomBip}
                    onAudioSelecionado={(arquivo) => {
                      setEditBotaoAudio(arquivo);
                    }}
                  />
                </>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="submit" 
                  disabled={salvando} 
                  className={`flex-1 py-3 rounded-2xl ${altoContraste ? 'bg-amber-400 hover:bg-amber-500 text-black font-bold' : 'bg-[#2589F5] hover:bg-[#1d78dc] text-white font-semibold'} text-xs transition-all shadow-md cursor-pointer`}
                >
                  {salvando ? 'Atualizando Ação...' : 'Atualizar Ação'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    emitirSomBip(500, 0.05);
                    setShowEditBotaoModal(null);
                    setEditBotaoCatId(null);
                  }}
                  className={`px-5 py-3 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} font-semibold text-xs cursor-pointer`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSÃO */}
      {categoriaParaExcluir && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${altoContraste ? 'bg-rose-950 text-rose-500 border border-rose-500' : 'bg-rose-100 text-rose-600'}`}>
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">Deseja excluir?</h3>
              <p className="text-xs text-slate-400">Tem certeza que deseja apagar a categoria <strong>&quot;{categoriaParaExcluir.nome}&quot;</strong>?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button onClick={() => { emitirSomBip(500, 0.05); setCategoriaParaExcluir(null); }} className={`py-3 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'} font-semibold text-xs cursor-pointer`}>Cancelar</button>
              <button onClick={handleConfirmarExclusao} className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md cursor-pointer">Sim, Excluir</button>
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
              <p className="text-xs text-slate-400">{feedback.mensagem}</p>
            </div>
            <button onClick={() => setFeedback({ tipo: null, titulo: '', mensagem: '' })} className={`w-full py-3 rounded-2xl ${altoContraste ? 'bg-amber-500 text-black' : 'bg-[#5F7DE3] text-white'} font-semibold text-xs cursor-pointer`}>OK</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE SAÍDA COM ALTERAÇÕES NÃO SALVAS */}
      {mostrarModalSaida && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4 ${
              altoContraste
                ? 'bg-black border-amber-500 text-amber-300'
                : modoEscuro
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                altoContraste
                  ? 'bg-amber-950 text-amber-400 border border-amber-500'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">Aviso</h3>
              <p className="text-sm font-medium">As alterações não seram salvas, deseja prosseguir?</p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => {
                  emitirSomBip(500, 0.05);
                  setMostrarModalSaida(false);
                  setAcaoSaidaPendente(null);
                }}
                className={`py-3 rounded-2xl ${
                  altoContraste
                    ? 'bg-zinc-800 text-amber-300 border border-amber-500'
                    : modoEscuro
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } font-semibold text-xs cursor-pointer transition-colors`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  emitirSomBip(400, 0.1);
                  setMostrarModalSaida(false);
                  setTemAlteracoesPendentes(false);
                  if (acaoSaidaPendente) {
                    acaoSaidaPendente();
                    setAcaoSaidaPendente(null);
                  }
                }}
                className={`py-3 rounded-2xl ${
                  altoContraste
                    ? 'bg-amber-400 text-black font-bold hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
                } text-xs shadow-md cursor-pointer transition-colors`}
              >
                Sim, prosseguir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}