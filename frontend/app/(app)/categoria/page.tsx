'use client';

import { useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import { ChevronDown, X, Search, Filter, Plus, Pencil, Trash2, LayoutGrid, CheckCircle2, XCircle, AlertTriangle, FolderOpen, Volume2, Eye, Menu, Image as ImageIcon, Mic, Folder } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

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
  tipo_audio?: 'masculino' | 'feminino';
  botoes: Botao[];
};

export default function Categoria() {
  const { perfil } = useUsuario();
  
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

  const [categoriaAcessadaId, setCategoriaAcessadaId] = useState<string | null>(null);
  const categoriaAcessada = categoriasList.find((c) => c.id === categoriaAcessadaId) ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('⭐');
  const [newCategoryImagem, setNewCategoryImagem] = useState<File | null>(null);
  const [newCategoryAudioTipo, setNewCategoryAudioTipo] = useState<'masculino' | 'feminino'>('feminino');
  
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryEmoji, setEditCategoryEmoji] = useState('⭐');
  const [editCategoryImagem, setEditCategoryImagem] = useState<File | null>(null);
  const [editCategoryAudioTipo, setEditCategoryAudioTipo] = useState<'masculino' | 'feminino'>('feminino');

  const [showNovoBotao, setShowNovoBotao] = useState(false);
  const [botaoRotulo, setBotaoRotulo] = useState('');
  const [botaoImagem, setBotaoImagem] = useState<File | null>(null);
  const [botaoAudio, setBotaoAudio] = useState<File | null>(null);
  const [botaoTipoAudio, setBotaoTipoAudio] = useState<'masculino' | 'feminino'>('feminino');
  const [salvando, setSalvando] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  const [versao, setVersao] = useState(0);
  const carregar = () => setVersao((v) => v + 1);

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
    api
      .get<Cat[]>('/categorias')
      .then((r) => ativo && setCategoriasList(r.data))
      .catch((err) => ativo && setFeedback(erroParaFeedback(err, 'Falha ao Carregar as Categorias')))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [versao]);

  const enviarMidia = async (arquivo: File, tipo: 'imagem' | 'audio') => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    form.append('tipo', tipo);
    const { data } = await api.post<{ id: string }>('/midias', form);
    return data.id;
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoriasList.length >= 3) {
      setFeedback({ tipo: 'atencao', titulo: 'Limite Atingido', mensagem: 'O dispositivo aceita no máximo 3 categorias. Apague uma existente para adicionar outra.' });
      setShowAddModal(false);
      return;
    }
    if (!newCategoryName.trim()) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Inválido', mensagem: 'Por favor, digite um nome válido para a categoria.' });
      return;
    }
    const enviados: string[] = [];
    try {
      const imagem_id = newCategoryImagem ? await enviarMidia(newCategoryImagem, 'imagem') : undefined;
      if (imagem_id) enviados.push(imagem_id);

      const { data } = await api.post<Cat>('/categorias', { 
        nome: newCategoryName.trim(),
        emoji: newCategoryEmoji || '⭐',
        imagem_id,
        tipo_audio: newCategoryAudioTipo
      });
      carregar();
      setNewCategoryName('');
      setNewCategoryEmoji('⭐');
      setNewCategoryImagem(null);
      setNewCategoryAudioTipo('feminino');
      setShowAddModal(false);
      emitirSomBip(800, 0.1);
      setFeedback({ tipo: 'sucesso', titulo: 'Categoria Criada', mensagem: `A categoria "${data.nome}" foi adicionada com sucesso!` });
    } catch (err) {
      await Promise.all(enviados.map((id) => api.delete(`/midias/${id}`).catch(() => {})));
      setShowAddModal(false);
      setFeedback(erroParaFeedback(err, 'Não foi Possível Criar'));
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryName.trim() || !showEditModal) return;
    const enviados: string[] = [];
    try {
      const imagem_id = editCategoryImagem ? await enviarMidia(editCategoryImagem, 'imagem') : undefined;
      if (imagem_id) enviados.push(imagem_id);

      await api.patch(`/categorias/${showEditModal.id}`, { 
        nome: editCategoryName.trim(),
        emoji: editCategoryEmoji || '⭐',
        ...(imagem_id && { imagem_id }),
        tipo_audio: editCategoryAudioTipo
      });
      carregar();
      setShowEditModal(null);
      setEditCategoryImagem(null);
      emitirSomBip(800, 0.1);
      setFeedback({ tipo: 'sucesso', titulo: 'Categoria Atualizada', mensagem: 'A categoria foi alterada com sucesso.' });
    } catch (err) {
      await Promise.all(enviados.map((id) => api.delete(`/midias/${id}`).catch(() => {})));
      setShowEditModal(null);
      setFeedback(erroParaFeedback(err, 'Não foi Possível Atualizar'));
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!categoriaParaExcluir) return;
    const alvo = categoriaParaExcluir;
    setCategoriaParaExcluir(null);
    try {
      await api.delete(`/categorias/${alvo.id}`);
      if (categoriaAcessadaId === alvo.id) setCategoriaAcessadaId(null);
      carregar();
      emitirSomBip(400, 0.1);
      setFeedback({ tipo: 'sucesso', titulo: 'Categoria Removida', mensagem: 'A categoria foi excluída da prancha de comunicação.' });
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  const fecharNovoBotao = () => {
    emitirSomBip(500, 0.05);
    setShowNovoBotao(false);
    setBotaoRotulo('');
    setBotaoImagem(null);
    setBotaoAudio(null);
    setBotaoTipoAudio('feminino');
  };

  const handleSalvarBotao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaAcessada) return;
    
    const totalBotoes = categoriaAcessada.botoes?.length || 0;
    if (totalBotoes >= 5) {
      setFeedback({ tipo: 'atencao', titulo: 'Limite Atingido', mensagem: 'Cada categoria aceita no máximo 5 ações (botões). Apague uma ação existente para adicionar outra.' });
      return;
    }

    if (!botaoRotulo.trim()) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Inválido', mensagem: 'Digite o nome (rótulo) da ação/botão.' });
      return;
    }
    
    setSalvando(true);
    const enviados: string[] = [];
    try {
      const imagem_id = botaoImagem ? await enviarMidia(botaoImagem, 'imagem') : undefined;
      if (imagem_id) enviados.push(imagem_id);
      
      const audio_id = botaoAudio ? await enviarMidia(botaoAudio, 'audio') : undefined;
      if (audio_id) enviados.push(audio_id);

      await api.post(`/categorias/${categoriaAcessada.id}/botoes`, { 
        rotulo: botaoRotulo.trim(), 
        imagem_id, 
        audio_id,
        tipo_audio: botaoTipoAudio
      });
      
      carregar();
      fecharNovoBotao();
      emitirSomBip(800, 0.1);
      setFeedback({ tipo: 'sucesso', titulo: 'Nova Ação', mensagem: 'Prancha atualizada com a nova ação!' });
    } catch (err) {
      await Promise.all(enviados.map((id) => api.delete(`/midias/${id}`).catch(() => {})));
      setFeedback(erroParaFeedback(err, 'Não foi Possível Criar a Ação'));
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirBotao = async (botao: Botao) => {
    if (!categoriaAcessada) return;
    try {
      await api.delete(`/categorias/${categoriaAcessada.id}/botoes/${botao.id}`);
      emitirSomBip(400, 0.1);
      carregar();
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  const tocarAudio = async (botao: Botao) => {
    emitirSomBip(700, 0.05);
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

  const categoriasFiltradas = categoriasList.filter((cat) => cat.nome.toLowerCase().includes(searchTerm.toLowerCase()));

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
          <Sidebar ativo="categoria" />
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

        <section 
          className="w-full h-24 sm:h-32 rounded-3xl p-6 sm:p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center shrink-0"
          style={{
            background: altoContraste ? '#000000' : 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)',
            border: altoContraste ? '2px solid #FACC15' : 'none'
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow-sm">Categorias & Ações</h1>
        </section>

        {/* AVISO FIXO */}
        <div className={`w-full p-4 rounded-2xl border text-xs leading-relaxed text-justify shadow-xs ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-blue-50/70 border-blue-100 text-blue-900'}`}>
          <span className="font-bold">Aviso importante:</span> O dispositivo aceita no máximo 3 categorias e 5 ações por categoria por vez. Caso deseje cadastrar novos itens, será necessário apagar um item existente primeiro.
        </div>

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
              setShowAddModal(true);
            }}
            className={`flex items-center gap-2 px-6 py-3 ${altoContraste ? 'bg-amber-400 hover:bg-amber-500 text-black' : 'bg-[#2589F5] hover:bg-[#1d78dc] text-white'} text-xs font-semibold rounded-2xl transition-all shadow-md cursor-pointer w-full sm:w-auto justify-center shrink-0`}
          >
            <Plus className="w-4 h-4" />
            Adicionar Categoria ({categoriasList.length}/3)
          </button>
        </div>

        {/* LISTA DE CATEGORIAS */}
        {categoriasFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2 w-full pb-16">
            {categoriasFiltradas.map((cat) => (
              <div 
                key={cat.id} 
                className={`${altoContraste ? 'bg-black border-amber-500 hover:border-amber-400' : modoEscuro ? 'bg-slate-900 border-slate-800 hover:border-[#5F7DE3]/50' : 'bg-[#F3F4F8] border-slate-200/80 hover:border-[#5F7DE3]/50'} border rounded-3xl p-6 shadow-xs flex flex-col justify-between h-52 transition-all w-full`}
              >
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
                      className={`w-8 h-8 rounded-full border ${altoContraste ? 'bg-zinc-900 text-amber-400 hover:bg-zinc-800 border-amber-500' : modoEscuro ? 'border-slate-700 bg-black text-white hover:bg-slate-900' : 'border-slate-200 bg-white text-black hover:bg-slate-100'} flex items-center justify-center transition-colors cursor-pointer shadow-xs`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        emitirSomBip(600, 0.05);
                        setCategoriaParaExcluir(cat);
                      }}
                      className={`w-8 h-8 rounded-full border ${altoContraste ? 'bg-zinc-900 text-rose-500 hover:bg-zinc-800 border-rose-500' : modoEscuro ? 'border-rose-900/50 bg-slate-800 text-rose-400 hover:bg-rose-950/40' : 'border-rose-200 bg-white text-rose-500 hover:bg-rose-50'} flex items-center justify-center transition-colors cursor-pointer shadow-xs`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 px-1 font-medium flex items-center justify-between py-1 my-1">
                  <span>Ações: <strong className={altoContraste ? 'text-amber-400' : 'text-slate-500 dark:text-slate-300'}>{cat.botoes?.length || 0}/5</strong></span>
                  <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> {cat.tipo_audio || 'feminino'}</span>
                </div>

                <button 
                  onClick={() => {
                    emitirSomBip(650, 0.08);
                    setCategoriaAcessadaId(cat.id);
                    setShowNovoBotao(false);
                  }}
                  className={`w-full py-2.5 rounded-2xl ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'} text-xs font-semibold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2`}
                >
                  <Eye className="w-4 h-4" />
                  Acessar Categoria & Ações
                </button>
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
      </main>

      {/* MODAL DE CONTEÚDO DA CATEGORIA ACESSADA */}
      {categoriaAcessada && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border relative flex flex-col gap-6 max-h-[85vh] overflow-y-auto`}>
            <button 
              onClick={() => { setCategoriaAcessadaId(null); fecharNovoBotao(); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-3.5 border-b ${altoContraste ? 'border-zinc-800' : modoEscuro ? 'border-slate-800' : 'border-slate-100'} pb-4`}>
              <div className={`w-14 h-14 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-400 border-amber-400' : 'bg-[#5F7DE3]/10 text-[#5F7DE3] border-[#5F7DE3]/20'} flex items-center justify-center shrink-0 font-bold text-lg overflow-hidden border shadow-xs`}>
                {categoriaAcessada.imagem ? (
                  <img src={categoriaAcessada.imagem} alt={categoriaAcessada.nome} className="w-full h-full object-cover" />
                ) : (
                  <Folder className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xl font-bold">
                  Categoria: <span className={altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}>{categoriaAcessada.nome}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Gerencie as ações/botões desta categoria ({categoriaAcessada.botoes?.length || 0}/5).
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ações Cadastradas ({categoriaAcessada.botoes?.length || 0}/5)
              </h4>

              {categoriaAcessada.botoes && categoriaAcessada.botoes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoriaAcessada.botoes.map((botao) => (
                    <div 
                      key={botao.id}
                      className={`${altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} border p-4 rounded-2xl flex items-center justify-between shadow-xs`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border shadow-xs ${altoContraste ? 'bg-black text-amber-400 border-amber-400' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                          {botao.imagem ? (
                            <img src={botao.imagem} alt={botao.rotulo} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className={`text-xs font-bold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-800'}`}>{botao.rotulo}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mic className={`w-3 h-3 ${altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}`} /> Áudio {botao.tipo_audio || 'feminino'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => tocarAudio(botao)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer border ${altoContraste ? 'text-amber-400 border-amber-400 hover:bg-zinc-800' : 'text-[#5F7DE3] border-[#5F7DE3]/20 hover:bg-[#5F7DE3]/10'}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluirBotao(botao)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer border ${altoContraste ? 'text-rose-500 border-rose-500 hover:bg-zinc-800' : 'text-rose-500 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/50'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border border-dashed rounded-2xl p-6 text-center`}>
                  <span className="text-xs text-slate-400 font-medium">Nenhuma ação cadastrada nesta categoria.</span>
                </div>
              )}
            </div>

            {showNovoBotao && (
              <form onSubmit={handleSalvarBotao} className={`flex flex-col gap-3.5 ${altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-100'} border rounded-2xl p-4`}>
                <h5 className={`text-xs font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>Adicionar Nova Ação</h5>
                
                <input
                  value={botaoRotulo}
                  onChange={(e) => setBotaoRotulo(e.target.value)}
                  placeholder="Nome da ação (ex.: Beber água)"
                  maxLength={60}
                  className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none`}
                  autoFocus
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400 font-medium">Escolher Tipo de Voz da Ação</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { emitirSomBip(600, 0.05); setBotaoTipoAudio('feminino'); }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${botaoTipoAudio === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#5F7DE3] text-white border-[#5F7DE3]') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                    >
                      <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                    </button>
                    <button
                      type="button"
                      onClick={() => { emitirSomBip(600, 0.05); setBotaoTipoAudio('masculino'); }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${botaoTipoAudio === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#5F7DE3] text-white border-[#5F7DE3]') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                    >
                      <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <ImageIcon className={`w-3.5 h-3.5 ${altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}`} /> Escolher Imagem da Ação (apenas .jpg ou .jpeg)
                  </label>
                  <input 
                    type="file" 
                    accept="image/jpeg,.jpg,.jpeg" 
                    onChange={(e) => setBotaoImagem(e.target.files?.[0] ?? null)} 
                    className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Escolher Arquivo de Áudio Personalizado (opcional)
                  </label>
                  <input 
                    type="file" 
                    accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" 
                    onChange={(e) => setBotaoAudio(e.target.files?.[0] ?? null)} 
                    className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={salvando} className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer">
                    {salvando ? 'Salvando...' : 'Salvar Ação'}
                  </button>
                  <button type="button" onClick={fecharNovoBotao} className={`px-4 py-2.5 rounded-2xl ${altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} font-semibold text-xs cursor-pointer`}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => {
                  emitirSomBip(600, 0.05);
                  setShowNovoBotao(!showNovoBotao);
                }}
                className={`flex-1 py-3 rounded-2xl ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'} font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2`}
              >
                <Plus className="w-4 h-4" />
                Adicionar Nova Ação
              </button>
              <button 
                onClick={() => { setCategoriaAcessadaId(null); fecharNovoBotao(); }}
                className={`px-6 py-3 rounded-2xl ${altoContraste ? 'bg-zinc-900 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} font-semibold text-xs transition-all cursor-pointer`}
              >
                Fechar
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
              <input 
                type="text" 
                placeholder="Exemplo: Rotina Matinal..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300 placeholder:text-amber-700' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white/90 border-purple-200/80 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs`}
                autoFocus
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz Padrão</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { emitirSomBip(600, 0.05); setNewCategoryAudioTipo('feminino'); }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${newCategoryAudioTipo === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#5F7DE3] text-white border-[#5F7DE3]') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                  </button>
                  <button
                    type="button"
                    onClick={() => { emitirSomBip(600, 0.05); setNewCategoryAudioTipo('masculino'); }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${newCategoryAudioTipo === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#5F7DE3] text-white border-[#5F7DE3]') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <ImageIcon className={`w-3.5 h-3.5 ${altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}`} /> Imagem (.jpg/.jpeg)
                </label>
                <input 
                  type="file" 
                  accept="image/jpeg,.jpg,.jpeg" 
                  onChange={(e) => setNewCategoryImagem(e.target.files?.[0] ?? null)} 
                  className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                />
              </div>

              <button type="submit" className={`w-full py-3.5 rounded-2xl ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'} font-semibold text-sm transition-all shadow-md mt-2 cursor-pointer`}>
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
            <h3 className={`text-xl font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'} mb-2`}>Editar Categoria</h3>
            
            <form onSubmit={handleEditCategory} className="w-full flex flex-col gap-4 mt-2 text-left">
              <input 
                type="text" 
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className={`w-full ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white/90 border-purple-200/80 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none shadow-xs`}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium">Tipo de Voz da Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { emitirSomBip(600, 0.05); setEditCategoryAudioTipo('feminino'); }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${editCategoryAudioTipo === 'feminino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#5F7DE3] text-white border-[#5F7DE3]') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Áudio Feminino
                  </button>
                  <button
                    type="button"
                    onClick={() => { emitirSomBip(600, 0.05); setEditCategoryAudioTipo('masculino'); }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${editCategoryAudioTipo === 'masculino' ? (altoContraste ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#5F7DE3] text-white border-[#5F7DE3]') : (altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Áudio Masculino
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <ImageIcon className={`w-3.5 h-3.5 ${altoContraste ? 'text-amber-500' : 'text-[#5F7DE3]'}`} /> Alterar Imagem (.jpg ou .jpeg)
                </label>
                <input 
                  type="file" 
                  accept="image/jpeg,.jpg,.jpeg" 
                  onChange={(e) => setEditCategoryImagem(e.target.files?.[0] ?? null)} 
                  className={`text-xs p-2 rounded-xl border ${altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} 
                />
              </div>

              <button type="submit" className={`w-full py-3.5 rounded-2xl ${altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'} font-semibold text-sm transition-all shadow-md cursor-pointer mt-2`}>
                Atualizar Categoria
              </button>
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

    </div>
  );
}