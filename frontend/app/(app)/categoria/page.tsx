'use client';

import { useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { ChevronDown, X, Search, Filter, Plus, Pencil, Trash2, LayoutGrid, CheckCircle2, XCircle, AlertTriangle, FolderOpen, Volume2, Eye } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

type Botao = {
  id: string; rotulo: string; significado: string | null; ordem: number;
  imagem_id: string | null; imagem: string | null; audio_id: string | null; audio: string | null;
};
type Cat = { id: string; nome: string; slug: string; cor: string | null; ordem: number; botoes: Botao[] };

export default function Categoria() {
  const [categoriasList, setCategoriasList] = useState<Cat[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Cat | null>(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Cat | null>(null);

  // Guarda só o id: o modal sempre mostra a versão mais recente da lista
  const [categoriaAcessadaId, setCategoriaAcessadaId] = useState<string | null>(null);
  const categoriaAcessada = categoriasList.find((c) => c.id === categoriaAcessadaId) ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');

  // NOVO BOTÃO (rótulo + imagem + áudio opcionais)
  const [showNovoBotao, setShowNovoBotao] = useState(false);
  const [botaoRotulo, setBotaoRotulo] = useState('');
  const [botaoImagem, setBotaoImagem] = useState<File | null>(null);
  const [botaoAudio, setBotaoAudio] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  // Recarrega a lista sempre que "versao" muda (chamar carregar() = pedir uma nova leitura)
  const [versao, setVersao] = useState(0);
  const carregar = () => setVersao((v) => v + 1);

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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Inválido', mensagem: 'Por favor, digite um nome válido para a categoria.' });
      return;
    }
    try {
      const { data } = await api.post<Cat>('/categorias', { nome: newCategoryName.trim() });
      carregar();
      setNewCategoryName('');
      setShowAddModal(false);
      setFeedback({ tipo: 'sucesso', titulo: 'Categoria Criada', mensagem: `A categoria "${data.nome}" foi adicionada com sucesso!` });
    } catch (err) {
      setShowAddModal(false);
      setFeedback(erroParaFeedback(err, 'Não foi Possível Criar'));
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryName.trim() || !showEditModal) return;
    try {
      await api.patch(`/categorias/${showEditModal.id}`, { nome: editCategoryName.trim() });
      carregar();
      setShowEditModal(null);
      setFeedback({ tipo: 'sucesso', titulo: 'Categoria Atualizada', mensagem: 'O nome da categoria foi alterado com sucesso.' });
    } catch (err) {
      setShowEditModal(null);
      setFeedback(erroParaFeedback(err, 'Não foi Possível Renomear'));
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
      setFeedback({ tipo: 'sucesso', titulo: 'Categoria Removida', mensagem: 'A categoria foi excluída da prancha de comunicação.' });
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  const enviarMidia = async (arquivo: File, tipo: 'imagem' | 'audio') => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    form.append('tipo', tipo);
    const { data } = await api.post<{ id: string }>('/midias', form);
    return data.id;
  };

  const fecharNovoBotao = () => {
    setShowNovoBotao(false);
    setBotaoRotulo('');
    setBotaoImagem(null);
    setBotaoAudio(null);
  };

  const handleSalvarBotao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaAcessada) return;
    if (!botaoRotulo.trim()) {
      setFeedback({ tipo: 'erro', titulo: 'Nome Inválido', mensagem: 'Digite o nome (rótulo) do botão.' });
      return;
    }
    setSalvando(true);
    const enviados: string[] = [];
    try {
      const imagem_id = botaoImagem ? await enviarMidia(botaoImagem, 'imagem') : undefined;
      if (imagem_id) enviados.push(imagem_id);
      const audio_id = botaoAudio ? await enviarMidia(botaoAudio, 'audio') : undefined;
      if (audio_id) enviados.push(audio_id);
      await api.post(`/categorias/${categoriaAcessada.id}/botoes`, { rotulo: botaoRotulo.trim(), imagem_id, audio_id });
      carregar();
      fecharNovoBotao();
      setFeedback({ tipo: 'sucesso', titulo: 'Novo Botão', mensagem: 'Prancha atualizada com o novo botão!' });
    } catch (err) {
      // não deixa arquivos soltos se o botão não foi criado
      await Promise.all(enviados.map((id) => api.delete(`/midias/${id}`).catch(() => {})));
      setFeedback(erroParaFeedback(err, 'Não foi Possível Criar o Botão'));
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirBotao = async (botao: Botao) => {
    if (!categoriaAcessada) return;
    try {
      await api.delete(`/categorias/${categoriaAcessada.id}/botoes/${botao.id}`);
      carregar();
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  const tocarAudio = async (botao: Botao) => {
    if (!botao.audio_id) {
      setFeedback({ tipo: 'atencao', titulo: 'Sem Áudio', mensagem: `O botão "${botao.rotulo}" ainda não tem um áudio cadastrado.` });
      return;
    }
    try {
      // o endpoint exige o token, então baixamos como blob e tocamos localmente
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans relative">
      
      {/* SIDEBAR LATERAL */}
      <Sidebar ativo="categoria" />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 flex flex-col gap-6 max-w-6xl mx-auto relative">
        
        <BarraTopo />

        <section 
          className="w-full h-28 rounded-3xl p-8 flex items-center justify-center text-white shadow-lg relative overflow-hidden text-center"
          style={{ background: 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)' }}
        >
          <h1 className="text-3xl font-extrabold drop-shadow-sm">Categorias</h1>
        </section>

        <p className="text-center text-slate-400 text-xs max-w-md mx-auto leading-relaxed font-medium">
          Crie, edite ou elimine categorias. Em cada uma, você pode personalizar o que será exibido nos botões.
        </p>

        {/* FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative">
              <select className="appearance-none bg-white border border-slate-200 rounded-2xl px-10 py-3 text-xs font-medium text-slate-500 pr-10 cursor-pointer focus:outline-none shadow-xs">
                <option value="">Filtrar por</option>
                <option value="recentes">Mais recentes</option>
                <option value="az">A-Z</option>
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder="Busque por uma categoria...."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#2589F5] hover:bg-[#1d78dc] text-white text-xs font-semibold rounded-2xl transition-all shadow-md shadow-blue-500/20 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Adicionar Categoria
          </button>
        </div>

        {/* LISTA DE CATEGORIAS */}
        {categoriasFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            {categoriasFiltradas.map((cat) => (
              <div 
                key={cat.id} 
                className="bg-[#F3F4F8] border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-40 hover:border-[#5F7DE3]/50 transition-all"
              >
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                    <span>{cat.nome}</span>
                    <button 
                      onClick={() => {
                        setShowEditModal(cat);
                        setEditCategoryName(cat.nome);
                      }}
                      className="text-slate-400 hover:text-[#5F7DE3] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setCategoriaParaExcluir(cat)}
                    className="w-8 h-8 rounded-full border border-rose-200 bg-white flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={() => { setCategoriaAcessadaId(cat.id); setShowNovoBotao(false); }}
                  className="w-full py-2.5 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Acessar Categoria
                </button>
              </div>
            ))}
          </div>
        ) : carregando ? (
          <div className="text-center text-xs text-slate-400 py-12">Carregando categorias...</div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 my-4">
            <FolderOpen className="w-12 h-12 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-base">Nenhuma Categoria Encontrada</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Não há categorias cadastradas no momento. Clique no botão acima para adicionar a primeira.
            </p>
          </div>
        )}


      </main>

      {/* MODAL DE CONTEÚDO DA CATEGORIA ACESSADA */}
      {categoriaAcessada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 relative flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
            
            <button 
              onClick={() => { setCategoriaAcessadaId(null); fecharNovoBotao(); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#5F7DE3]/10 text-[#5F7DE3] flex items-center justify-center shrink-0 font-bold text-lg">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xl font-bold text-slate-800">
                  Categoria: <span className="text-[#5F7DE3]">{categoriaAcessada.nome}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Gerencie os botões e frases atribuídas a esta prancha.
                </span>
              </div>
            </div>

            {/* LISTA DOS BOTÕES DA CATEGORIA */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Botões Cadastrados ({categoriaAcessada.botoes?.length || 0})
              </h4>

              {categoriaAcessada.botoes && categoriaAcessada.botoes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoriaAcessada.botoes.map((botao) => (
                    <div 
                      key={botao.id}
                      className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800">{botao.rotulo}</span>
                          <span className="text-[10px] text-slate-400">{botao.audio ?? 'Sem áudio'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => tocarAudio(botao)}
                          className="p-1.5 text-[#5F7DE3] hover:bg-[#5F7DE3]/10 rounded-lg transition-colors cursor-pointer"
                          title="Ouvir Áudio"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluirBotao(botao)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir botão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  <span className="text-xs text-slate-400 font-medium">Nenhum botão cadastrado nesta categoria.</span>
                </div>
              )}
            </div>

            {showNovoBotao && (
              <form onSubmit={handleSalvarBotao} className="flex flex-col gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <input
                  value={botaoRotulo}
                  onChange={(e) => setBotaoRotulo(e.target.value)}
                  placeholder="Nome do botão (ex.: Beber água)"
                  maxLength={60}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-700 focus:outline-none"
                />
                <label className="text-[11px] text-slate-500 flex flex-col gap-1">
                  Imagem (opcional — PNG, JPEG ou WEBP; vira 240×240)
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setBotaoImagem(e.target.files?.[0] ?? null)} className="text-xs" />
                </label>
                <label className="text-[11px] text-slate-500 flex flex-col gap-1">
                  Áudio (opcional — MP3 ou WAV)
                  <input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" onChange={(e) => setBotaoAudio(e.target.files?.[0] ?? null)} className="text-xs" />
                </label>
                <div className="flex gap-3">
                  <button type="submit" disabled={salvando} className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-xs cursor-pointer">
                    {salvando ? 'Salvando...' : 'Salvar Botão'}
                  </button>
                  <button type="button" onClick={fecharNovoBotao} className="px-4 py-2.5 rounded-2xl bg-slate-200 text-slate-600 font-semibold text-xs cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => setShowNovoBotao(!showNovoBotao)}
                className="flex-1 py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Novo Botão
              </button>

              <button 
                onClick={() => { setCategoriaAcessadaId(null); fecharNovoBotao(); }}
                className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-xs transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CATEGORIA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#F3EFF5] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-indigo-100 relative flex flex-col items-center text-center">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="w-6 h-6 text-[#5F7DE3]" />
              <h3 className="text-xl font-bold text-[#5F7DE3]">Adicionar <span className="text-amber-500">Categoria</span></h3>
            </div>
            <p className="text-xs text-slate-500 max-w-xs mb-6 font-medium">Informe o nome para criar a nova categoria.</p>
            <form onSubmit={handleAddCategory} className="w-full flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Exemplo: Rotina Matinal..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-white/90 border border-purple-200/80 rounded-2xl px-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#5F7DE3] shadow-xs"
                autoFocus
              />
              <button type="submit" className="w-full py-3.5 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-sm transition-all shadow-md shadow-[#5F7DE3]/25 cursor-pointer">
                Salvar Categoria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CATEGORIA */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#F3EFF5] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-indigo-100 relative flex flex-col items-center text-center">
            <button onClick={() => setShowEditModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[#5F7DE3] mb-2">Editar Categoria</h3>
            <form onSubmit={handleEditCategory} className="w-full flex flex-col gap-4 mt-4">
              <input 
                type="text" 
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full bg-white/90 border border-purple-200/80 rounded-2xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#5F7DE3] shadow-xs"
              />
              <button type="submit" className="w-full py-3.5 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-sm transition-all shadow-md cursor-pointer">
                Atualizar Nome
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSÃO */}
      {categoriaParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-800">Deseja excluir?</h3>
              <p className="text-xs text-slate-500">Tem certeza que deseja apagar a categoria <strong>&quot;{categoriaParaExcluir.nome}&quot;</strong>?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button onClick={() => setCategoriaParaExcluir(null)} className="py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-xs cursor-pointer">Cancelar</button>
              <button onClick={handleConfirmarExclusao} className="py-3 rounded-2xl bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 cursor-pointer">Sim, Excluir</button>
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
            <button onClick={() => setFeedback({ tipo: null, titulo: '', mensagem: '' })} className="w-full py-3 rounded-2xl bg-[#5F7DE3] text-white font-semibold text-xs cursor-pointer">OK</button>
          </div>
        </div>
      )}

    </div>
  );
}