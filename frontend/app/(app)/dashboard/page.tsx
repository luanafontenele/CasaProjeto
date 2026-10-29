'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import { Cpu, Info, Power, X, Trash2, Share2, CheckCircle2, XCircle, AlertTriangle, Wifi, BatteryCharging, Menu } from 'lucide-react';
import Link from 'next/link';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';

type Dispositivo = {
  mac: string; codigo: string; nome: string; ip: string | null; firmware: string | null;
  bateria_pct: number | null; carregando: boolean; sinal_wifi: number | null; ssid: string | null;
  online: boolean; ultima_sincronizacao: string | null;
};
type ItemHistorico = { id: string; nome: string; categoria: string; total: number; ultimo_acionamento: string; hora: string; data: string };

export default function Dashboard() {
  const { perfil } = useUsuario();
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? '';
  const modoEscuro = perfil?.modo_escuro ?? false;

  // DADOS REAIS (API)
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [mais, setMais] = useState<ItemHistorico[]>([]);
  const [menos, setMenos] = useState<ItemHistorico[]>([]);

  // CONTROLE DOS MODAIS E MENU MOBILE
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [detalheMac, setDetalheMac] = useState<string | null>(null);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // PAREAMENTO DE NOVO DISPOSITIVO
  const [showPareamento, setShowPareamento] = useState(false);
  const [novoMac, setNovoMac] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<{ nome: string; mac: string; token: string } | null>(null);

  // MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
  const [itemParaExcluir, setItemParaExcluir] = useState<{ mac: string; nome: string } | null>(null);

  // MODAIS DE FEEDBACK (SUCESSO, ERRO, ATENÇÃO)
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  // Aplica classe dark globalmente
  useEffect(() => {
    if (modoEscuro) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [modoEscuro]);

  const carregar = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([api.get('/dispositivos'), api.get('/historico', { params: { periodo: 'semana' } })]);
      setDispositivos(d.data);
      setMais(h.data.mais_acionados);
      setMenos(h.data.menos_acionados);
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Carregar os Dados'));
    }
  }, []);

  useEffect(() => {
    const primeira = setTimeout(carregar, 0);
    const ciclo = setInterval(carregar, 30000); // status online/bateria atualizam sozinhos
    return () => {
      clearTimeout(primeira);
      clearInterval(ciclo);
    };
  }, [carregar]);

  const disp = dispositivos[0];
  const temDispositivos = dispositivos.length > 0;
  const det = dispositivos.find((d) => d.mac === detalheMac) ?? disp;
  const todos = [...mais, ...menos];
  const ultimo = [...todos].sort((a, b) => b.ultimo_acionamento.localeCompare(a.ultimo_acionamento))[0];
  const menosUsado = todos.length >= 2 ? (menos[0] ?? mais[mais.length - 1]) : undefined;

  const handleConfirmarExclusao = async () => {
    const item = itemParaExcluir;
    setItemParaExcluir(null);
    if (!item) return;
    try {
      await api.delete(`/dispositivos/${encodeURIComponent(item.mac)}`);
      setShowDevicesModal(false);
      await carregar();
      setFeedback({ tipo: 'sucesso', titulo: 'Dispositivo Removido', mensagem: `O dispositivo "${item.nome}" foi desconectado com sucesso!` });
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  const handleParear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMac.trim()) {
      setFeedback({ tipo: 'erro', titulo: 'MAC Obrigatório', mensagem: 'Informe o endereço MAC do ESP32.' });
      return;
    }
    setEnviando(true);
    try {
      const { data } = await api.post('/dispositivos', { mac: novoMac.trim(), nome: novoNome.trim() || undefined });
      setShowPareamento(false);
      setNovoMac('');
      setNovoNome('');
      setTokenGerado({ nome: data.nome, mac: data.mac, token: data.device_token });
      await carregar();
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Parear'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`h-screen w-screen overflow-hidden ${modoEscuro ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} flex flex-col md:flex-row font-sans transition-colors duration-200`}>
      
      {/* BARRA TOPO MOBILE COM HAMBÚRGUER */}
      <div className={`md:hidden flex items-center justify-between p-4 ${modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-40 shadow-sm w-full shrink-0`}>
        <span className="font-bold text-sm tracking-wide">C.A.S.A. Dashboard</span>
        <button 
          onClick={() => setMenuMobileAberto(!menuMobileAberto)}
          className={`p-2 rounded-xl ${modoEscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'} cursor-pointer transition-colors`}
          aria-label="Abrir Menu"
        >
          {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 1. SIDEBAR LATERAL FIXA OCUPANDO 100% DA ALTURA */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 h-full flex flex-col
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <Sidebar ativo="dashboard" escuro={modoEscuro} />
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {menuMobileAberto && (
        <div 
          onClick={() => setMenuMobileAberto(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* CONTEÚDO PRINCIPAL DA DASHBOARD COM ROLAGEM PRÓPRIA */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-10 flex flex-col gap-8 w-full">
        
        <BarraTopo escuro={modoEscuro} />

        {/* HERO BANNER */}
        <section 
          className="w-full h-44 rounded-3xl p-8 flex flex-col justify-center text-white shadow-lg relative overflow-hidden shrink-0"
          style={{
            background: 'linear-gradient(90deg, #F5AC46 0%, #6586F3 52%, #4D66B8 88%, #3B4E8D 100%)'
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 drop-shadow-sm">Olá, {primeiroNome}!</h1>
          <p className="text-white/90 font-normal text-xs sm:text-sm max-w-md drop-shadow-sm">
            Personalize o seu dispositivo C.A.S.A ao seu estilo e acompanhe tudo em tempo real.
          </p>
        </section>

        {/* VISÃO GERAL */}
        <section className="flex flex-col gap-4 w-full">
          <h2 className={`text-center font-bold ${modoEscuro ? 'text-slate-300' : 'text-slate-700'} text-sm sm:text-lg`}>Visão Geral</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            
            {/* CARD 1: Dispositivos Conectados */}
            <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-between gap-4 w-full`}>
              <div className={`flex items-center gap-2 ${modoEscuro ? 'text-slate-400' : 'text-slate-600'} font-semibold text-xs`}>
                <Cpu className="w-4 h-4 text-slate-400" />
                Dispositivos Conectados
              </div>

              {temDispositivos ? (
                <div className="flex flex-col items-center gap-1 my-2">
                  <div className={`flex items-center gap-2 text-xs ${modoEscuro ? 'text-slate-200' : 'text-slate-700'} font-bold`}>
                    <span className={`w-2 h-2 rounded-full ${disp?.online ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    {disp?.nome}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {disp?.online ? 'Conectado e Operacional' : 'Sem comunicação recente'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 my-2 py-1">
                  <span className="text-xs text-rose-500 font-medium">Nenhum dispositivo encontrado</span>
                  <span className="text-[10px] text-slate-400">Ligue o ESP32 para conectar</span>
                </div>
              )}

              <button 
                onClick={() => setShowDevicesModal(true)}
                className="w-full py-2.5 rounded-xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                Gerenciar Dispositivos
              </button>
            </div>

            {/* CARD 2: Informações Gerais */}
            <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-between gap-4 w-full`}>
              <div className={`flex items-center gap-2 ${modoEscuro ? 'text-slate-400' : 'text-slate-600'} font-semibold text-xs`}>
                <Info className="w-4 h-4 text-slate-400" />
                Status da Conexão
              </div>

              {temDispositivos ? (
                <div className="flex flex-col items-center gap-1 my-2">
                  <span className={`text-xs ${modoEscuro ? 'text-slate-200' : 'text-slate-700'} font-bold`}>{disp?.sinal_wifi != null ? `Sinal ${disp.sinal_wifi}% (Wi-Fi)` : 'Sinal não informado'}</span>
                  <span className="text-[11px] text-slate-400">Rede: {disp?.ssid ?? 'não informada'}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 my-2 py-1">
                  <span className="text-xs text-slate-400 font-medium">Desconectado da nuvem</span>
                  <span className="text-[10px] text-slate-400">Aguardando pareamento</span>
                </div>
              )}

              <button 
                onClick={() => {
                  if (temDispositivos) {
                    setDetalheMac(disp.mac);
                    setShowDeviceDetails(true);
                  } else {
                    setFeedback({
                      tipo: 'atencao',
                      titulo: 'Sem Conexão',
                      mensagem: 'Nenhum dispositivo está conectado para exibir estatísticas no momento.'
                    });
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                Mais Detalhes
              </button>
            </div>

            {/* CARD 3: Último Acionamento */}
            <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-between gap-4 w-full`}>
              <div className={`flex items-center gap-2 ${modoEscuro ? 'text-slate-400' : 'text-slate-600'} font-semibold text-xs`}>
                <Power className="w-4 h-4 text-slate-400" />
                Último Acionamento
              </div>

              {ultimo ? (
                <div className="flex flex-col items-center gap-1 my-2">
                  <span className={`text-xs ${modoEscuro ? 'text-slate-200' : 'text-slate-700'} font-bold`}>{ultimo.nome}</span>
                  <span className="text-[11px] text-slate-400">{ultimo.data} às {ultimo.hora}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 my-2 py-1">
                  <span className="text-xs text-slate-400 font-medium">Sem registros recentes</span>
                  <span className="text-[10px] text-slate-400">Aguardando uso do botão</span>
                </div>
              )}

              <Link href="/historico" className="w-full">
                <button className="w-full py-2.5 rounded-xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer">
                  Ver Histórico
                </button>
              </Link>
            </div>

          </div>
        </section>

        {/* FEEDBACK DE SUGESTÕES DA IA/SISTEMA */}
        <section className="flex flex-col gap-3 mt-2 w-full pb-16">
          <h3 className={`font-bold ${modoEscuro ? 'text-slate-300' : 'text-slate-700'} text-sm`}>Feedback de Atendimento:</h3>
          <div className={`w-full ${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100/70 border-slate-200/60 text-slate-600'} border rounded-3xl p-6 flex flex-col gap-2 text-xs`}>
            {menosUsado ? (
              <>
                <p><strong className={modoEscuro ? 'text-slate-100' : 'text-slate-800'}>OBS:</strong> O botão menos utilizado nos últimos 7 dias é &quot;{menosUsado.nome}&quot; da categoria {menosUsado.categoria}.</p>
                <p><strong className={modoEscuro ? 'text-slate-100' : 'text-slate-800'}>Último uso registrado:</strong> {menosUsado.data} às {menosUsado.hora}</p>
                <p><strong className={modoEscuro ? 'text-slate-100' : 'text-slate-800'}>Sugestão:</strong> Se ele não faz mais sentido na rotina, substitua-o por uma opção de maior relevância para a criança.</p>
              </>
            ) : (
              <p>Ainda não há acionamentos suficientes nos últimos 7 dias para gerar sugestões. Use o dispositivo e volte aqui.</p>
            )}
          </div>
        </section>

      </main>

      {/* ------------------- MODAIS DO SISTEMA ------------------- */}

      {/* MODAL 1: LISTA / GERENCIAR DISPOSITIVOS */}
      {showDevicesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F3EFF5] border-indigo-100'} w-full max-w-md rounded-3xl p-6 shadow-2xl border relative flex flex-col items-center text-center`}>
            
            <button 
              onClick={() => setShowDevicesModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 mt-2">
              <Share2 className="w-6 h-6 text-[#5F7DE3]" />
              <h3 className="text-xl font-bold text-[#5F7DE3]">
                Dispositivos <span className="text-amber-500">Conectados</span>
              </h3>
            </div>

            <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
              Gerencie os dispositivos físicos que estão pareados com a sua conta.
            </p>

            {temDispositivos ? (
              <div className="w-full flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto">
                {dispositivos.map((d) => (
                  <div key={d.mac} className={`w-full ${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white/80 border-purple-200/80'} border rounded-2xl p-3.5 flex items-center justify-between shadow-xs`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-3 h-3 rounded-full shadow-xs shrink-0 ${d.online ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <div className="flex flex-col text-left min-w-0">
                        <span className={`text-sm font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-800'} truncate`}>{d.nome}</span>
                        <span className="text-[10px] text-slate-400">ID: #{d.codigo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setShowDevicesModal(false);
                          setDetalheMac(d.mac);
                          setShowDeviceDetails(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#5F7DE3] transition-colors cursor-pointer"
                        title="Ver detalhes do card"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setItemParaExcluir({ mac: d.mac, nome: d.nome })}
                        className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Excluir dispositivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`w-full ${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white/60 border-slate-300'} border border-dashed rounded-2xl p-6 text-center mb-6 flex flex-col items-center gap-2`}>
                <Cpu className="w-8 h-8 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Nenhum dispositivo cadastrado.</span>
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowDevicesModal(false);
                  setShowPareamento(true);
                }}
                className="w-full py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-sm transition-all shadow-md shadow-[#5F7DE3]/20 cursor-pointer"
              >
                {temDispositivos ? 'Adicionar Outro Dispositivo' : 'Conectar ESP32'}
              </button>

              <button 
                onClick={() => setShowDevicesModal(false)}
                className={`w-full py-3 rounded-2xl ${modoEscuro ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-500 hover:bg-slate-600 text-white'} font-semibold text-sm transition-all shadow-xs cursor-pointer`}
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: DETALHES DO DISPOSITIVO */}
      {showDeviceDetails && det && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-md rounded-3xl p-6 shadow-2xl border relative flex flex-col gap-6`}>
            
            <button 
              onClick={() => setShowDeviceDetails(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-3 border-b ${modoEscuro ? 'border-slate-800' : 'border-slate-100'} pb-4`}>
              <div className="w-12 h-12 rounded-2xl bg-[#5F7DE3]/10 text-[#5F7DE3] flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-lg font-bold">{det.nome}</h3>
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${det.online ? 'text-emerald-500' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${det.online ? 'bg-emerald-500' : 'bg-slate-300'}`}></span> {det.online ? 'Conectado e Ativo' : 'Sem comunicação recente'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-3 rounded-2xl border flex flex-col gap-1`}>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Endereço IP</span>
                <span className={`font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'} flex items-center gap-1`}>
                  <Wifi className="w-3.5 h-3.5 text-[#5F7DE3]" /> {det.ip ?? '—'}
                </span>
              </div>

              <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-3 rounded-2xl border flex flex-col gap-1`}>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Bateria</span>
                <span className={`font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'} flex items-center gap-1`}>
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" /> {det.bateria_pct != null ? `${det.bateria_pct}%${det.carregando ? ' (Carregando)' : ''}` : '—'}
                </span>
              </div>

              <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-3 rounded-2xl border flex flex-col gap-1`}>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Firmware</span>
                <span className={`font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>{det.firmware ?? '—'}</span>
              </div>

              <div className={`${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-3 rounded-2xl border flex flex-col gap-1`}>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Endereço MAC</span>
                <span className={`font-semibold ${modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>{det.mac}</span>
              </div>
            </div>

            <button 
              onClick={() => setShowDeviceDetails(false)}
              className="w-full py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
            >
              Entendido
            </button>

          </div>
        </div>
      )}

      {/* MODAL: PAREAR NOVO DISPOSITIVO */}
      {showPareamento && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleParear} className={`${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F3EFF5] border-indigo-100'} w-full max-w-md rounded-3xl p-6 shadow-2xl border relative flex flex-col gap-4`}>
            <button type="button" onClick={() => setShowPareamento(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[#5F7DE3] text-center">Conectar <span className="text-amber-500">ESP32</span></h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Informe o endereço MAC do aparelho. Você receberá um código de acesso para gravá-lo no aparelho.
            </p>
            <input
              value={novoMac}
              onChange={(e) => setNovoMac(e.target.value)}
              placeholder="Endereço MAC (24:62:AB:E4:C1:0C)"
              className={`w-full ${modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none`}
            />
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do dispositivo (opcional)"
              maxLength={80}
              className={`w-full ${modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl px-4 py-3 text-xs focus:outline-none`}
            />
            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
            >
              {enviando ? 'Conectando...' : 'Conectar'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: TOKEN DO DISPOSITIVO */}
      {tokenGerado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-md rounded-3xl p-6 shadow-2xl border flex flex-col gap-4 text-center items-center`}>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold">Dispositivo Conectado</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              &quot;{tokenGerado.nome}&quot; ({tokenGerado.mac}) foi pareado. Grave o código abaixo no ESP32. <strong>Ele só é mostrado agora</strong>.
            </p>
            <code className={`w-full break-all ${modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'} border rounded-2xl p-3 text-[11px] select-all`}>{tokenGerado.token}</code>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => navigator.clipboard?.writeText(tokenGerado.token)}
                className={`py-3 rounded-2xl ${modoEscuro ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold text-xs cursor-pointer`}
              >
                Copiar
              </button>
              <button
                onClick={() => setTokenGerado(null)}
                className="py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-xs cursor-pointer"
              >
                Já guardei
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaExcluir && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}>
            
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">Deseja excluir?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tem certeza que deseja remover <strong className={modoEscuro ? 'text-slate-200' : 'text-slate-700'}>&quot;{itemParaExcluir.nome}&quot;</strong>? Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button 
                onClick={() => setItemParaExcluir(null)}
                className={`py-3 rounded-2xl ${modoEscuro ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold text-xs transition-all cursor-pointer`}
              >
                Cancelar
              </button>

              <button 
                onClick={handleConfirmarExclusao}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: FEEDBACKS DO SISTEMA */}
      {feedback.tipo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}>
            
            {feedback.tipo === 'sucesso' && (
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}

            {feedback.tipo === 'erro' && (
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <XCircle className="w-8 h-8" />
              </div>
            )}

            {feedback.tipo === 'atencao' && (
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-8 h-8" />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">{feedback.titulo}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feedback.mensagem}</p>
            </div>

            <button 
              onClick={() => setFeedback({ tipo: null, titulo: '', mensagem: '' })}
              className="w-full py-3 rounded-2xl bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-semibold text-xs transition-all shadow-md mt-2 cursor-pointer"
            >
              Ok, Entendido
            </button>

          </div>
        </div>
      )}

    </div>
  );
}