'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, erroParaFeedback } from '@/lib/api';
import { useUsuario } from '@/lib/UsuarioContext';
import {
  Cpu,
  Info,
  Power,
  X,
  Trash2,
  Share2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  BatteryCharging,
  Menu,
  Bluetooth,
  Volume2,
  ArrowRight,
  ArrowLeft,
  Radio,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';

import Sidebar from '@/components/Sidebar';
import BarraTopo from '@/components/BarraTopo';
import GerenciadorWifiDispositivo from '@/components/GerenciadorWifiDispositivo';
import { isDispositivoOnline } from '@/lib/tempo';

type Dispositivo = {
  mac: string;
  codigo: string;
  nome: string;
  modo?: string;
  volume?: number;
  config_versao?: number;
  ip: string | null;
  firmware: string | null;
  bateria_pct: number | null;
  nivelBateria?: number | null;
  carregando: boolean;
  sinal_wifi: number | null;
  ssid: string | null;
  online: boolean;
  ultima_sincronizacao: string | null;
};

interface BluetoothRemoteGATTCharacteristic {
  readValue?(): Promise<DataView>;
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithResponse?(data: BufferSource): Promise<void>;
}
interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}
interface BluetoothRemoteGATTServer {
  connected?: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}
interface BluetoothDevice {
  id?: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

type ItemHistorico = {
  id: string;
  nome: string;
  categoria: string;
  total: number;
  ultimo_acionamento: string;
  hora: string;
  data: string;
};

export default function Dashboard() {
  const { perfil } = useUsuario();
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? '';

  // Contexto Global
  const modoEscuro = perfil?.modo_escuro ?? false;
  const altoContraste = perfil?.alto_contraste ?? false;
  const feedbackSonoro = perfil?.feedback_sonoro ?? false;
  const tamanhoFonte = perfil?.tamanho_fonte ?? 10;

  // Dados da API
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [mais, setMais] = useState<ItemHistorico[]>([]);
  const [menos, setMenos] = useState<ItemHistorico[]>([]);

  // Modais
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [detalheMac, setDetalheMac] = useState<string | null>(null);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // Wizard de Pareamento Firmware v7+ / v11 / v12 (3 Passos)
  const [showPareamento, setShowPareamento] = useState(false);
  const [passoPareamento, setPassoPareamento] = useState<1 | 2 | 3>(1);
  const [btDevice, setBtDevice] = useState<BluetoothDevice | null>(null);
  const [btChar, setBtChar] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [btStatusChar, setBtStatusChar] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [btPin, setBtPin] = useState('');
  const [btSsid, setBtSsid] = useState('');
  const [btPass, setBtPass] = useState('');
  const [btStatus, setBtStatus] = useState<'idle' | 'conectando' | 'enviando' | 'sucesso' | 'erro'>('idle');
  const [btMensagem, setBtMensagem] = useState('');
  const [chaveWifiGerada, setChaveWifiGerada] = useState<string>('');
  const [reconfigurandoMac, setReconfigurandoMac] = useState<string | null>(null);
  const [codigoPareamento, setCodigoPareamento] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [redesReservasPareamento, setRedesReservasPareamento] = useState<{ ssid: string; senha: string; aberta: boolean }[]>([]);
  const [mostrarReservasPareamento, setMostrarReservasPareamento] = useState(false);
  const [novaReservaSsid, setNovaReservaSsid] = useState('');
  const [novaReservaSenha, setNovaReservaSenha] = useState('');
  const [novaReservaAberta, setNovaReservaAberta] = useState(false);

  // Ajustes em tempo real do dispositivo selecionado
  const [volumeEdicao, setVolumeEdicao] = useState<number>(70);
  const [salvandoAjustes, setSalvandoAjustes] = useState(false);

  // Modal de Exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<{ mac: string; nome: string } | null>(null);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'atencao' | null;
    titulo: string;
    mensagem: string;
  }>({ tipo: null, titulo: '', mensagem: '' });

  const emitirSomBip = (frequencia = 587.33, duracao = 0.05) => {
    if (!feedbackSonoro) return;
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
      // AudioContext bloqueado sem interação
    }
  };

  useEffect(() => {
    if (modoEscuro || altoContraste) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [modoEscuro, altoContraste]);

  const carregar = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([
        api.get<Dispositivo[]>('/dispositivos'),
        api.get('/historico', { params: { periodo: 'semana' } }),
      ]);
      const listaLimpa = (Array.isArray(d.data) ? d.data : []).filter(
        (disp) => disp && disp.mac && disp.mac !== 'DEV-MODE' && !disp.nome?.toLowerCase().includes('desenvolvedor')
      );
      setDispositivos(listaLimpa);
      setMais(h.data.mais_acionados || []);
      setMenos(h.data.menos_acionados || []);
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Carregar os Dados'));
    }
  }, []);

  useEffect(() => {
    const primeira = setTimeout(carregar, 0);
    const ciclo = setInterval(carregar, 30000);
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

  // Ao abrir o modal de detalhes, atualiza controles locais
  useEffect(() => {
    if (det) {
      setVolumeEdicao(det.volume ?? 70);
    }
  }, [det]);

  const handleSalvarAjustes = async (novoVol?: number) => {
    if (!det) return;
    setSalvandoAjustes(true);
    const vol = novoVol !== undefined ? novoVol : volumeEdicao;
    try {
      await api.patch(`/dispositivos/${encodeURIComponent(det.mac)}`, {
        volume: vol,
      });
      emitirSomBip(650, 0.05);
      await carregar();
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao salvar ajustes'));
    } finally {
      setSalvandoAjustes(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    const item = itemParaExcluir;
    setItemParaExcluir(null);
    if (!item) return;
    const macId = item.mac || (item as unknown as { id?: string }).id || '';
    if (!macId) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Erro ao Desconectar',
        mensagem: 'Identificador do dispositivo não encontrado.',
      });
      return;
    }
    try {
      await api.delete(`/dispositivos/${encodeURIComponent(macId)}`);
      setShowDevicesModal(false);
      setShowDeviceDetails(false);
      await carregar();
      emitirSomBip(400, 0.1);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Dispositivo Removido',
        mensagem: `O dispositivo "${item.nome}" foi desconectado com sucesso!`,
      });
    } catch (err) {
      setFeedback(erroParaFeedback(err));
    }
  };

  // 1ª ETAPA: Conexão direta via Web Bluetooth para habilitar a visualização do PIN no OLED
  const handleConectarBluetooth = async () => {
    const navBt = (navigator as unknown as { bluetooth?: { requestDevice: (opt: unknown) => Promise<unknown> } }).bluetooth;
    if (!navBt) {
      setFeedback({
        tipo: 'atencao',
        titulo: 'Bluetooth Indisponível',
        mensagem: 'Seu navegador não suporta Web Bluetooth. Utilize Google Chrome ou Edge em localhost/HTTPS ou configure pelo aplicativo Android.',
      });
      return;
    }

    try {
      setBtStatus('conectando');
      setBtMensagem('Procurando aparelho C.A.S.A. via Bluetooth...');

      // Gera chave AES-256 (32 bytes aleatórios) em memória
      const keyBytes = crypto.getRandomValues(new Uint8Array(32));
      let binary = '';
      for (let i = 0; i < keyBytes.length; i++) binary += String.fromCharCode(keyBytes[i]);
      const keyB64 = btoa(binary);
      setChaveWifiGerada(keyB64);

      const device = (await navBt.requestDevice({
        filters: [{ namePrefix: 'CASA' }],
        optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
      })) as BluetoothDevice;

      if (!device.gatt) {
        throw new Error('Servidor GATT não suportado neste aparelho.');
      }

      setBtMensagem('Conectando ao ESP32...');
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
      const characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');

      let statusCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
      try {
        statusCharacteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26aa');
      } catch {
        // Característica opcional
      }

      setBtDevice(device);
      setBtChar(characteristic);
      setBtStatusChar(statusCharacteristic);
      setBtStatus('sucesso');
      setBtMensagem('Bluetooth conectado com sucesso! O visor OLED agora exibe o PIN de 6 dígitos.');
      emitirSomBip(800, 0.1);

      setTimeout(() => {
        setPassoPareamento(2);
        setBtStatus('idle');
        setBtMensagem('');
      }, 700);
    } catch (err: unknown) {
      setBtStatus('erro');
      const msg = err instanceof Error ? err.message : 'Falha na conexão Bluetooth';
      setBtMensagem(msg);
    }
  };

  // 2ª ETAPA: Envio de credenciais Wi-Fi pelo Bluetooth com chave AES-256 (PIN agora visível no OLED)
  const handleEnviarWifiBluetooth = async () => {
    const pinLimpo = btPin.replace(/\D/g, '').slice(0, 6);
    if (!reconfigurandoMac && pinLimpo.length !== 6) {
      setFeedback({ tipo: 'erro', titulo: 'PIN Obrigatório', mensagem: 'Digite os 6 números do PIN exibido no visor OLED do aparelho.' });
      return;
    }
    if (!btSsid.trim()) {
      setFeedback({ tipo: 'erro', titulo: 'SSID Obrigatório', mensagem: 'Informe o nome da rede Wi-Fi principal.' });
      return;
    }

    try {
      setBtStatus('enviando');
      setBtMensagem('Enviando Wi-Fi e chave de segurança...');

      let characteristic = btChar;
      let statusChar = btStatusChar;

      // Reconexão automática se a conexão GATT tiver caído
      if (!characteristic || (btDevice?.gatt && !btDevice.gatt.connected)) {
        if (btDevice?.gatt) {
          setBtMensagem('Reconectando ao ESP32 via Bluetooth...');
          const server = await btDevice.gatt.connect();
          const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
          characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
          try {
            statusChar = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26aa');
          } catch {}
          setBtChar(characteristic);
          setBtStatusChar(statusChar);
        } else {
          throw new Error('Conexão Bluetooth perdida. Volte ao Passo 1 e reconecte ao aparelho.');
        }
      }

      if (!characteristic) {
        throw new Error('Canal Bluetooth não disponível.');
      }

      const keyToSend = chaveWifiGerada || (() => {
        const keyBytes = crypto.getRandomValues(new Uint8Array(32));
        let binary = '';
        for (let i = 0; i < keyBytes.length; i++) binary += String.fromCharCode(keyBytes[i]);
        const keyB64 = btoa(binary);
        setChaveWifiGerada(keyB64);
        return keyB64;
      })();

      // Formatação estrita exigida pelo firmware v11/v12/v16: pin como string com aspas
      const payload = JSON.stringify({
        pin: pinLimpo,
        ssid: btSsid.trim(),
        pass: btPass,
        key: keyToSend,
      });
      const encoder = new TextEncoder();
      const bytes = encoder.encode(payload);

      // Chunks de no máximo 180 bytes para respeitar o MTU do ESP32
      const CHUNK_SIZE = 180;
      for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        const slice = bytes.slice(offset, offset + CHUNK_SIZE);
        if (characteristic.writeValueWithResponse) {
          await characteristic.writeValueWithResponse(slice);
        } else {
          await characteristic.writeValue(slice);
        }
      }

      // Tenta ler característica de status do Firmware v11/v12/v16
      try {
        await new Promise((r) => setTimeout(r, 600));
        if (statusChar && statusChar.readValue) {
          const val = await statusChar.readValue();
          const decoder = new TextDecoder();
          const statusStr = decoder.decode(val).trim();
          if (statusStr === 'pin_errado') {
            throw new Error('PIN incorreto! Verifique os 6 dígitos exibidos na tela do aparelho.');
          } else if (statusStr === 'bloqueado') {
            throw new Error('Aparelho temporariamente bloqueado por tentativas incorretas. Aguarde 10 segundos.');
          } else if (statusStr === 'dados_invalidos') {
            throw new Error('Dados de Wi-Fi inválidos.');
          } else if (statusStr === 'chave_invalida') {
            throw new Error('Chave de segurança AES inválida.');
          }
        }
      } catch (errStatus) {
        if (errStatus instanceof Error && (errStatus.message.includes('PIN') || errStatus.message.includes('bloqueado'))) {
          throw errStatus;
        }
      }

      setBtStatus('sucesso');
      setBtMensagem('Wi-Fi e chave configurados! O aparelho está reiniciando para conectar.');
      emitirSomBip(800, 0.1);

      // Preenche o código de pareamento no passo 3 com o mesmo PIN do OLED
      if (pinLimpo) {
        setCodigoPareamento(pinLimpo);
      }

      // Se estiver apenas reconfigurando a chave de um aparelho já vinculado:
      if (reconfigurandoMac) {
        try {
          await api.put(`/dispositivos/${encodeURIComponent(reconfigurandoMac)}/wifi/chave`, {
            chave_wifi: keyToSend,
          });
          setFeedback({
            tipo: 'sucesso',
            titulo: 'Wi-Fi Reconfigurado',
            mensagem: 'Chave atualizada no servidor e no aparelho com sucesso!',
          });
        } catch (e) {
          setFeedback(erroParaFeedback(e, 'Falha ao registrar chave no servidor'));
        } finally {
          setShowPareamento(false);
          setReconfigurandoMac(null);
          setBtStatus('idle');
          setBtMensagem('');
          setBtDevice(null);
          setBtChar(null);
          setBtStatusChar(null);
          await carregar();
        }
        return;
      }

      // Fluxo normal de novo pareamento -> Passo 3
      setTimeout(() => {
        setPassoPareamento(3);
      }, 1500);
    } catch (err: unknown) {
      setBtStatus('erro');
      const msg = err instanceof Error ? err.message : 'Falha no envio via Bluetooth';
      setBtMensagem(msg);
    }
  };

  // Pareamento por código de 6 dígitos exibido no ESP32 (Passo 3)
  const handleParearCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cod = codigoPareamento.replace(/\D/g, '');
    if (cod.length !== 6) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Código Inválido',
        mensagem: 'O código deve conter exatamente 6 números.',
      });
      return;
    }

    setEnviando(true);
    try {
      const payload: {
        codigo: string;
        nome?: string;
        chave_wifi?: string;
        redes_reservas?: { ssid: string; senha?: string; aberta?: boolean }[];
      } = {
        codigo: cod,
        nome: novoNome.trim() || undefined,
      };
      if (chaveWifiGerada) {
        payload.chave_wifi = chaveWifiGerada;
      }
      if (redesReservasPareamento.length > 0) {
        payload.redes_reservas = redesReservasPareamento.map((r) => ({
          ssid: r.ssid.trim(),
          senha: r.aberta ? undefined : r.senha,
          aberta: r.aberta,
        }));
      }

      await api.post<Dispositivo>('/dispositivos/parear', payload);

      setShowPareamento(false);
      setCodigoPareamento('');
      setBtPin('');
      setNovoNome('');
      setChaveWifiGerada('');
      setRedesReservasPareamento([]);
      setPassoPareamento(1);
      setBtStatus('idle');
      setBtMensagem('');
      setBtDevice(null);
      setBtChar(null);
      setBtStatusChar(null);
      emitirSomBip(800, 0.1);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Aparelho Vinculado!',
        mensagem: 'Aparelho vinculado! Ele vai sincronizar a prancha em instantes.',
      });
      await carregar();
    } catch (err) {
      setFeedback(erroParaFeedback(err, 'Falha ao Parear'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${
        altoContraste ? 'bg-black text-amber-300' : modoEscuro ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      } flex flex-col md:flex-row font-sans transition-colors duration-200`}
      style={{ fontSize: `${tamanhoFonte}px` }}
    >
      {/* BARRA TOPO MOBILE COM HAMBÚRGUER */}
      <div
        className={`md:hidden flex items-center justify-between p-4 ${
          altoContraste ? 'bg-black border-amber-500' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        } border-b sticky top-0 z-40 shadow-sm w-full shrink-0`}
      >
        <span className="font-bold text-sm tracking-wide">C.A.S.A. Dashboard</span>
        <button
          onClick={() => {
            emitirSomBip(600, 0.05);
            setMenuMobileAberto(!menuMobileAberto);
          }}
          className={`p-2 rounded-xl ${
            altoContraste ? 'bg-amber-400 text-black' : modoEscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
          } cursor-pointer transition-colors`}
          aria-label="Abrir Menu"
        >
          {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR LATERAL FIXA */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 h-full flex flex-col
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="h-full flex flex-col">
          <Sidebar ativo="dashboard" />
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {menuMobileAberto && (
        <div onClick={() => setMenuMobileAberto(false)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden" />
      )}

      {/* CONTEÚDO PRINCIPAL DA DASHBOARD */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-10 flex flex-col gap-8 w-full">
        <BarraTopo escuro={modoEscuro || altoContraste} />

        {/* HERO BANNER */}
        <section
          className="w-full h-44 rounded-3xl p-8 flex flex-col justify-center text-white shadow-lg relative overflow-hidden shrink-0"
          style={{
            background: altoContraste ? '#000000' : '#4D66B8',
            border: altoContraste ? '2px solid #FACC15' : 'none',
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 drop-shadow-sm">Olá, {primeiroNome}!</h1>
          <p className="text-white/90 font-normal text-[1em] max-w-md drop-shadow-sm">
            Personalize o seu dispositivo C.A.S.A ao seu estilo e acompanhe o uso em tempo real.
          </p>
        </section>

        {!temDispositivos ? (
          /* QUANDO NÃO HÁ DISPOSITIVOS: APENAS A DIV DE CONEXÃO DESTACADA E PULSANDO */
          <section className="flex flex-col items-center justify-center w-full my-auto py-10">
            <div
              onClick={() => {
                emitirSomBip(600, 0.05);
                setPassoPareamento(1);
                setShowPareamento(true);
              }}
              className={`w-full max-w-xl ${
                altoContraste
                  ? 'bg-black border-4 border-amber-400 text-amber-300 ring-4 ring-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                  : modoEscuro
                  ? 'bg-slate-900 border-2 border-[#5F7DE3] text-slate-100 ring-4 ring-[#5F7DE3]/30 shadow-[0_0_35px_rgba(95,125,227,0.25)]'
                  : 'bg-white border-2 border-[#5F7DE3] text-slate-800 ring-8 ring-[#5F7DE3]/15 shadow-2xl'
              } rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center gap-6 cursor-pointer transform hover:scale-[1.01] transition-all animate-pulse`}
            >
              <div
                className={`w-24 h-24 rounded-3xl ${
                  altoContraste
                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400'
                    : modoEscuro
                    ? 'bg-[#5F7DE3]/20 text-[#5F7DE3]'
                    : 'bg-[#5F7DE3]/10 text-[#5F7DE3]'
                } flex items-center justify-center shadow-inner`}
              >
                <Radio className="w-12 h-12" />
              </div>

              <div className="flex flex-col gap-2 max-w-md">
                <h2 className={`text-2xl sm:text-3xl font-extrabold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>
                  Conectar Dispositivo
                </h2>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nenhum dispositivo está vinculado à sua conta. Conecte o seu aparelho C.A.S.A. para começar a usar a prancha comunicadora e acompanhar a telemetria.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  emitirSomBip(600, 0.05);
                  setPassoPareamento(1);
                  setShowPareamento(true);
                }}
                className={`w-full py-4 px-6 rounded-2xl ${
                  altoContraste
                    ? 'bg-amber-400 hover:bg-amber-300 text-black font-extrabold'
                    : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white font-bold'
                } text-base sm:text-lg transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer`}
              >
                <Cpu className="w-5 h-5 shrink-0" />
                <span>Conectar Dispositivo Agora</span>
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* VISÃO GERAL */}
            <section className="flex flex-col gap-4 w-full">
              <h2
                className={`text-center font-bold ${
                  altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-300' : 'text-slate-700'
                } text-[1.2em]`}
              >
                Visão Geral
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {/* CARD 1: Dispositivos Conectados */}
                <div
                  className={`${
                    altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                  } border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-between gap-4 w-full`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-400' : 'text-slate-600'
                    } font-semibold text-[0.9em]`}
                  >
                    <Cpu className="w-4 h-4 text-slate-400" />
                    Dispositivos Conectados
                  </div>

                  <div className="flex flex-col items-center gap-1 my-2">
                    <div
                      className={`flex items-center gap-2 text-[1em] ${
                        altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'
                      } font-bold`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${isDispositivoOnline(disp) ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      {disp?.nome}
                    </div>
                    <span className="text-[0.8em] text-slate-400">
                      {isDispositivoOnline(disp) ? 'Conectado e Operacional' : 'Sem comunicação recente'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      emitirSomBip(600, 0.05);
                      setShowDevicesModal(true);
                    }}
                    className={`w-full py-2.5 rounded-xl ${
                      altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                    } text-[1em] font-semibold transition-all shadow-sm cursor-pointer`}
                  >
                    Gerenciar Dispositivos
                  </button>
                </div>

                {/* CARD 2: Informações Gerais */}
                <div
                  className={`${
                    altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                  } border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-between gap-4 w-full`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-400' : 'text-slate-600'
                    } font-semibold text-[0.9em]`}
                  >
                    <Info className="w-4 h-4 text-slate-400" />
                    Status da Conexão
                  </div>

                  <div className="flex flex-col items-center gap-1 my-2">
                    <span
                      className={`text-[1em] ${
                        altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'
                      } font-bold`}
                    >
                      {disp?.sinal_wifi != null ? `Sinal ${disp.sinal_wifi}% (Wi-Fi)` : 'Sinal não informado'}
                    </span>
                    <span className="text-[0.8em] text-slate-400">Rede: {disp?.ssid ?? 'não informada'}</span>
                  </div>

                  <button
                    onClick={() => {
                      emitirSomBip(600, 0.05);
                      setDetalheMac(disp.mac);
                      setShowDeviceDetails(true);
                    }}
                    className={`w-full py-2.5 rounded-xl ${
                      altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                    } text-[1em] font-semibold transition-all shadow-sm cursor-pointer`}
                  >
                    Mais Detalhes
                  </button>
                </div>

                {/* CARD 3: Último Acionamento */}
                <div
                  className={`${
                    altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                  } border rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-between gap-4 w-full`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-400' : 'text-slate-600'
                    } font-semibold text-[0.9em]`}
                  >
                    <Power className="w-4 h-4 text-slate-400" />
                    Último Acionamento
                  </div>

                  {ultimo ? (
                    <div className="flex flex-col items-center gap-1 my-2">
                      <span
                        className={`text-[1em] ${
                          altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'
                        } font-bold`}
                      >
                        {ultimo.nome}
                      </span>
                      <span className="text-[0.8em] text-slate-400">
                        {ultimo.data} às {ultimo.hora}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 my-2 py-1">
                      <span className="text-[1em] text-slate-400 font-medium">Sem registros recentes</span>
                      <span className="text-[0.8em] text-slate-400">Aguardando uso do botão</span>
                    </div>
                  )}

                  <Link href="/historico" onClick={() => emitirSomBip(600, 0.05)} className="w-full">
                    <button
                      className={`w-full py-2.5 rounded-xl ${
                        altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                      } text-[1em] font-semibold transition-all shadow-sm cursor-pointer`}
                    >
                      Ver Histórico
                    </button>
                  </Link>
                </div>
              </div>
            </section>

            {/* FEEDBACK DE SUGESTÕES */}
            <section className="flex flex-col gap-3 mt-2 w-full pb-16">
              <h3
                className={`font-bold ${
                  altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-300' : 'text-slate-700'
                } text-[1.1em]`}
              >
                Feedback de Atendimento:
              </h3>
              <div
                className={`w-full ${
                  altoContraste
                    ? 'bg-zinc-900 border-amber-500 text-amber-300'
                    : modoEscuro
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-100/70 border-slate-200/60 text-slate-600'
                } border rounded-3xl p-6 flex flex-col gap-2 text-[1em]`}
              >
                {menosUsado ? (
                  <>
                    <p>
                      <strong className={altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-100' : 'text-slate-800'}>OBS:</strong> O
                      botão menos utilizado nos últimos 7 dias é &quot;{menosUsado.nome}&quot; da categoria {menosUsado.categoria}.
                    </p>
                    <p>
                      <strong className={altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-100' : 'text-slate-800'}>
                        Último uso registrado:
                      </strong>{' '}
                      {menosUsado.data} às {menosUsado.hora}
                    </p>
                    <p>
                      <strong className={altoContraste ? 'text-amber-400' : modoEscuro ? 'text-slate-100' : 'text-slate-800'}>Sugestão:</strong> Se
                      ele não faz mais sentido na rotina, substitua-o por uma opção de maior relevância para a criança.
                    </p>
                  </>
                ) : (
                  <p>Ainda não há acionamentos suficientes nos últimos 7 dias para gerar sugestões. Use o dispositivo e volte aqui.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ------------------- MODAIS DO SISTEMA ------------------- */}

      {/* MODAL 1: LISTA / GERENCIAR DISPOSITIVOS */}
      {showDevicesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className={`${
              altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F3EFF5] border-indigo-100'
            } w-full max-w-md rounded-3xl p-6 shadow-2xl border relative flex flex-col items-center text-center`}
          >
            <button
              onClick={() => {
                emitirSomBip(500, 0.05);
                setShowDevicesModal(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 mt-2">
              <Share2 className={`w-6 h-6 ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`} />
              <h3 className={`text-xl font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>
                Dispositivos <span className="text-amber-500">Conectados</span>
              </h3>
            </div>

            <p className="text-[0.9em] text-slate-400 max-w-xs mb-6 leading-relaxed">
              Gerencie os dispositivos físicos que estão pareados com a sua conta.
            </p>

            {temDispositivos ? (
              <div className="w-full flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto">
                {dispositivos.map((d) => (
                  <div
                    key={d.mac}
                    className={`w-full ${
                      altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white/80 border-slate-200'
                    } border rounded-2xl p-3.5 flex items-center justify-between shadow-xs`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-3 h-3 rounded-full shadow-xs shrink-0 ${isDispositivoOnline(d) ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <div className="flex flex-col text-left min-w-0">
                        <span
                          className={`text-[1em] font-semibold ${
                            altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-800'
                          } truncate`}
                        >
                          {d.nome}
                        </span>
                        <span className="text-[0.8em] text-slate-400">ID: #{d.codigo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          emitirSomBip(600, 0.05);
                          setShowDevicesModal(false);
                          setDetalheMac(d.mac);
                          setShowDeviceDetails(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#5F7DE3] transition-colors cursor-pointer"
                        title="Ver detalhes"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          emitirSomBip(400, 0.1);
                          setItemParaExcluir({ mac: d.mac, nome: d.nome });
                        }}
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
              <div
                className={`w-full ${
                  altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white/60 border-slate-300'
                } border border-dashed rounded-2xl p-6 text-center mb-6 flex flex-col items-center gap-2`}
              >
                <Cpu className="w-8 h-8 text-slate-400" />
                <span className="text-[0.9em] text-slate-400 font-medium">Nenhum dispositivo cadastrado.</span>
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  emitirSomBip(600, 0.05);
                  setShowDevicesModal(false);
                  setPassoPareamento(1);
                  setShowPareamento(true);
                }}
                className={`w-full py-3 rounded-2xl ${
                  altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                } font-semibold text-[1em] transition-all shadow-md cursor-pointer`}
              >
                {temDispositivos ? 'Adicionar Outro Dispositivo' : 'Conectar ESP32'}
              </button>

              <button
                onClick={() => {
                  emitirSomBip(500, 0.05);
                  setShowDevicesModal(false);
                }}
                className={`w-full py-3 rounded-2xl ${
                  altoContraste ? 'bg-zinc-800 text-amber-300 border border-amber-500' : modoEscuro ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-500 hover:bg-slate-600 text-white'
                } font-semibold text-[1em] transition-all shadow-xs cursor-pointer`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETALHES E AJUSTES DO DISPOSITIVO */}
      {showDeviceDetails && det && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className={`${
              altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
            } w-full max-w-md rounded-3xl p-6 shadow-2xl border relative flex flex-col gap-5`}
          >
            <button
              onClick={() => {
                emitirSomBip(500, 0.05);
                setShowDeviceDetails(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-3 border-b ${altoContraste ? 'border-zinc-800' : modoEscuro ? 'border-slate-800' : 'border-slate-100'} pb-4`}>
              <div
                className={`w-12 h-12 rounded-2xl ${
                  altoContraste ? 'bg-zinc-800 text-amber-400 border border-amber-500' : 'bg-[#5F7DE3]/10 text-[#5F7DE3]'
                } flex items-center justify-center shrink-0`}
              >
                <Cpu className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-lg font-bold">{det.nome}</h3>
                <span className={`text-[0.9em] font-semibold flex items-center gap-1.5 ${isDispositivoOnline(det) ? 'text-emerald-500' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${isDispositivoOnline(det) ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  {isDispositivoOnline(det) ? 'Conectado e Ativo' : 'Sem comunicação recente'}
                </span>
              </div>
            </div>

            {/* TELEMETRIA */}
            <div className="grid grid-cols-2 gap-3 text-left text-[0.9em]">
              <div
                className={`${
                  altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
                } p-3 rounded-2xl border flex flex-col gap-1`}
              >
                <span className="text-slate-400 text-[10px] uppercase font-bold">Endereço IP</span>
                <span
                  className={`font-semibold ${
                    altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'
                  } flex items-center gap-1`}
                >
                  <Wifi className="w-3.5 h-3.5 text-[#5F7DE3]" /> {det.ip ?? '—'}
                </span>
              </div>

              <div
                className={`${
                  altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
                } p-3 rounded-2xl border flex flex-col gap-1`}
              >
                <span className="text-slate-400 text-[10px] uppercase font-bold">Bateria</span>
                <span
                  className={`font-semibold ${
                    altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'
                  } flex items-center gap-1`}
                >
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                  {det.bateria_pct != null ? `${det.bateria_pct}%${det.carregando ? ' (Carregando)' : ''}` : det.nivelBateria != null ? `${det.nivelBateria}%` : '—'}
                </span>
              </div>

              <div
                className={`${
                  altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
                } p-3 rounded-2xl border flex flex-col gap-1`}
              >
                <span className="text-slate-400 text-[10px] uppercase font-bold">Firmware</span>
                <span className={`font-semibold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>
                  {det.firmware ?? 'v6.0'}
                </span>
              </div>

              <div
                className={`${
                  altoContraste ? 'bg-zinc-900 border-amber-500' : modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
                } p-3 rounded-2xl border flex flex-col gap-1`}
              >
                <span className="text-slate-400 text-[10px] uppercase font-bold">Endereço MAC</span>
                <span className={`font-semibold ${altoContraste ? 'text-amber-300' : modoEscuro ? 'text-slate-200' : 'text-slate-700'}`}>
                  {det.mac}
                </span>
              </div>
            </div>

            {/* CONTROLES FIRMWARE V7: VOLUME */}
            <div className={`flex flex-col gap-4 border-t ${altoContraste ? 'border-zinc-800' : modoEscuro ? 'border-slate-800' : 'border-slate-100'} pt-4`}>
              <div className="flex flex-col gap-2 text-left">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#5F7DE3]" /> Volume do Aparelho
                  </span>
                  <span>{volumeEdicao}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volumeEdicao}
                  onChange={(e) => setVolumeEdicao(Number(e.target.value))}
                  onMouseUp={() => handleSalvarAjustes(volumeEdicao)}
                  onTouchEnd={() => handleSalvarAjustes(volumeEdicao)}
                  className="w-full accent-[#5F7DE3] cursor-pointer"
                />
              </div>

              {/* SEÇÃO WI-FI REMOTO FIRMWARE V7 */}
              <div className="border-t pt-4 border-slate-100 dark:border-slate-800">
                <GerenciadorWifiDispositivo
                  mac={det.mac}
                  modoEscuro={modoEscuro}
                  altoContraste={altoContraste}
                  emitirSomBip={emitirSomBip}
                  onAbrirBluetoothReconfig={() => {
                    setReconfigurandoMac(det.mac);
                    setBtStatus('idle');
                    setBtMensagem('');
                    setBtDevice(null);
                    setBtChar(null);
                    setBtStatusChar(null);
                    setPassoPareamento(1);
                    setShowPareamento(true);
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  emitirSomBip(400, 0.1);
                  setItemParaExcluir({ mac: det.mac, nome: det.nome });
                }}
                className="py-3 px-4 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Desconectar
              </button>

              <button
                onClick={() => {
                  emitirSomBip(600, 0.05);
                  setShowDeviceDetails(false);
                }}
                className={`flex-1 py-3 rounded-2xl ${
                  altoContraste ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                } font-semibold text-[1em] transition-all shadow-md cursor-pointer`}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: WIZARD DE PAREAMENTO FIRMWARE V7 (3 PASSOS) */}
      {showPareamento && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className={`${
              altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
            } w-full max-w-md rounded-3xl p-6 shadow-2xl border relative flex flex-col gap-5`}
          >
            <button
              type="button"
              onClick={() => {
                emitirSomBip(500, 0.05);
                setShowPareamento(false);
                setReconfigurandoMac(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Wizard */}
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                {reconfigurandoMac ? 'Reconfiguração BLE' : `Passo ${passoPareamento} de 3`}
              </span>
              <h3 className={`text-xl font-bold ${altoContraste ? 'text-amber-400' : 'text-[#5F7DE3]'}`}>
                {passoPareamento === 1 && '1. Conectar via Bluetooth'}
                {passoPareamento === 2 && '2. Configurar Wi-Fi e PIN'}
                {passoPareamento === 3 && '3. Digitar Código do Visor'}
              </h3>
            </div>

            {/* PASSO 1: CONECTAR VIA BLUETOOTH */}
            {passoPareamento === 1 && (
              <div className="flex flex-col gap-4 text-center items-center">
                <div
                  className={`w-20 h-20 rounded-3xl ${
                    altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  } border flex items-center justify-center shadow-inner`}
                >
                  <Bluetooth className="w-10 h-10 animate-pulse" />
                </div>
                <div className="text-[0.9em] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm space-y-2">
                  <p>
                    Ligue o aparelho segurando os <strong>3 botões de categoria</strong> por <strong>2 segundos</strong> (Modo Configuração).
                  </p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Conecte o Bluetooth para que o aparelho gere e exiba o PIN de 6 dígitos no visor OLED.
                  </p>
                </div>

                {btStatus !== 'idle' && (
                  <div
                    className={`w-full p-3 rounded-xl text-xs flex items-center gap-2 ${
                      btStatus === 'sucesso'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : btStatus === 'erro'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    <Bluetooth className="w-4 h-4 shrink-0" />
                    <span>{btMensagem}</span>
                  </div>
                )}

                <div className="w-full flex flex-col gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleConectarBluetooth}
                    disabled={btStatus === 'conectando'}
                    className={`w-full py-3.5 rounded-2xl ${
                      altoContraste ? 'bg-amber-500 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                    } disabled:opacity-50 font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <Bluetooth className="w-4 h-4" />
                    {btStatus === 'conectando' ? 'Buscando Aparelho via Bluetooth...' : 'Conectar via Bluetooth'}
                  </button>

                  {!reconfigurandoMac && (
                    <button
                      type="button"
                      onClick={() => setPassoPareamento(3)}
                      className="py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer underline text-center"
                    >
                      Já configurou o Wi-Fi? Pular para código
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 2: CONFIGURAR WI-FI E PIN (APARELHO EXIBINDO O PIN) */}
            {passoPareamento === 2 && (
              <div className="flex flex-col gap-4">
                <div
                  className={`p-3 rounded-2xl text-xs border flex items-center gap-2.5 ${
                    altoContraste
                      ? 'bg-zinc-900 border-amber-500 text-amber-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Bluetooth conectado!</strong> O visor OLED exibe o PIN de 6 dígitos. Informe-o abaixo junto ao seu Wi-Fi.
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {!reconfigurandoMac && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        PIN de 6 dígitos do visor OLED:
                      </label>
                      <input
                        value={btPin}
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => setBtPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Ex: 012345"
                        className={`w-full font-mono text-center tracking-[0.3em] font-bold ${
                          altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                        } border rounded-2xl px-4 py-2.5 text-[1em] focus:outline-none`}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Rede Wi-Fi Principal (SSID 2.4 GHz):
                    </label>
                    <input
                      value={btSsid}
                      maxLength={32}
                      onChange={(e) => setBtSsid(e.target.value)}
                      placeholder="Nome da rede principal"
                      className={`w-full ${
                        altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                      } border rounded-2xl px-4 py-2.5 text-[0.9em] focus:outline-none`}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Senha do Wi-Fi:
                    </label>
                    <input
                      type="password"
                      value={btPass}
                      maxLength={63}
                      onChange={(e) => setBtPass(e.target.value)}
                      placeholder="Senha da rede (deixe em branco se aberta)"
                      className={`w-full ${
                        altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                      } border rounded-2xl px-4 py-2.5 text-[0.9em] focus:outline-none`}
                    />
                  </div>

                  {/* SEÇÃO EXPANSÍVEL: REDES RESERVAS OPCIONAIS (FIRMWARE V11/V12) */}
                  {!reconfigurandoMac && (
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setMostrarReservasPareamento((v) => !v)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between py-1 cursor-pointer"
                      >
                        <span>Redes Reservas de Contingência ({redesReservasPareamento.length}/4)</span>
                        <span>{mostrarReservasPareamento ? '▲ Recolher' : '▼ Expandir'}</span>
                      </button>

                      {mostrarReservasPareamento && (
                        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          {redesReservasPareamento.map((r, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="font-semibold truncate max-w-[200px]">{r.ssid} {r.aberta ? '(Aberta)' : ''}</span>
                              <button
                                type="button"
                                onClick={() => setRedesReservasPareamento((l) => l.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {redesReservasPareamento.length < 4 && (
                            <div className="flex flex-col gap-1.5 pt-1">
                              <div className="flex gap-2">
                                <input
                                  value={novaReservaSsid}
                                  maxLength={32}
                                  onChange={(e) => setNovaReservaSsid(e.target.value)}
                                  placeholder="SSID reserva"
                                  className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                                <input
                                  type="password"
                                  disabled={novaReservaAberta}
                                  value={novaReservaSenha}
                                  maxLength={63}
                                  onChange={(e) => setNovaReservaSenha(e.target.value)}
                                  placeholder={novaReservaAberta ? 'Aberta' : 'Senha'}
                                  className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={novaReservaAberta}
                                    onChange={(e) => setNovaReservaAberta(e.target.checked)}
                                    className="rounded border-slate-300"
                                  />
                                  Rede aberta
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!novaReservaSsid.trim()) return;
                                    setRedesReservasPareamento((l) => [
                                      ...l,
                                      { ssid: novaReservaSsid.trim(), senha: novaReservaSenha, aberta: novaReservaAberta },
                                    ]);
                                    setNovaReservaSsid('');
                                    setNovaReservaSenha('');
                                    setNovaReservaAberta(false);
                                  }}
                                  className="px-3 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 cursor-pointer"
                                >
                                  + Adicionar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {btStatus !== 'idle' && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      btStatus === 'sucesso'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : btStatus === 'erro'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    <Bluetooth className="w-4 h-4 shrink-0" />
                    <span>{btMensagem}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleEnviarWifiBluetooth}
                    disabled={btStatus === 'enviando'}
                    className={`w-full py-3 rounded-2xl ${
                      altoContraste ? 'bg-amber-500 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                    } disabled:opacity-50 font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <Wifi className="w-4 h-4" />
                    {btStatus === 'enviando' ? 'Enviando ao Aparelho...' : 'Enviar Wi-Fi para o Aparelho'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPassoPareamento(1)}
                      className={`py-2.5 px-4 rounded-xl border ${
                        altoContraste ? 'border-amber-500 text-amber-300' : 'border-slate-200 text-slate-600'
                      } text-xs font-semibold cursor-pointer flex items-center gap-1`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                    </button>

                    {!reconfigurandoMac && (
                      <button
                        type="button"
                        onClick={() => setPassoPareamento(3)}
                        className="flex-1 py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs font-semibold cursor-pointer underline text-center"
                      >
                        Pular (Já conectado)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PASSO 3: CÓDIGO DE 6 DÍGITOS */}
            {passoPareamento === 3 && (
              <form onSubmit={handleParearCodigo} className="flex flex-col gap-4">
                <p className="text-[0.85em] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                  Quando o aparelho conectar ao Wi-Fi, o visor mostrará <strong>&quot;Código de pareamento&quot;</strong> com 6 dígitos. Digite aqui:
                </p>

                <div className="flex flex-col gap-3">
                  <input
                    value={codigoPareamento}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setCodigoPareamento(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className={`w-full text-center tracking-[0.5em] text-2xl font-bold font-mono py-3 rounded-2xl border ${
                      altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:outline-none`}
                  />

                  <input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Apelido opcional (ex: ESP32 Sala)"
                    maxLength={80}
                    className={`w-full ${
                      altoContraste ? 'bg-zinc-900 border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                    } border rounded-2xl px-4 py-3 text-[0.9em] focus:outline-none`}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPassoPareamento(2)}
                    className={`py-3 px-4 rounded-2xl border ${
                      altoContraste ? 'border-amber-500 text-amber-300' : 'border-slate-200 text-slate-600'
                    } text-sm font-semibold cursor-pointer flex items-center gap-1`}
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>

                  <button
                    type="submit"
                    disabled={enviando || codigoPareamento.length !== 6}
                    className={`flex-1 py-3 rounded-2xl ${
                      altoContraste ? 'bg-amber-500 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3] text-white'
                    } disabled:opacity-50 font-semibold text-sm transition-all shadow-md cursor-pointer`}
                  >
                    {enviando ? 'Vinculando...' : 'Vincular'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaExcluir && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className={`${
              altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
            } w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                altoContraste ? 'bg-rose-950 text-rose-500 border border-rose-500' : 'bg-rose-100 text-rose-600'
              } shadow-xs`}
            >
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold">Desconectar Aparelho?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O aparelho <strong>&quot;{itemParaExcluir.nome}&quot;</strong> ficará sem conta e voltará a pedir um novo código de pareamento.
              </p>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className={`flex-1 py-2.5 rounded-xl border ${
                  altoContraste ? 'border-amber-500 text-amber-300' : 'border-slate-200 text-slate-600'
                } text-xs font-semibold cursor-pointer`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FEEDBACKS DO SISTEMA */}
      {feedback.tipo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className={`${
              altoContraste ? 'bg-black border-amber-500 text-amber-300' : modoEscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
            } w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4`}
          >
            {feedback.tipo === 'sucesso' && (
              <div
                className={`w-14 h-14 rounded-full ${
                  altoContraste ? 'bg-zinc-800 text-emerald-400 border border-emerald-500' : 'bg-emerald-100 text-emerald-600'
                } flex items-center justify-center shadow-xs`}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}

            {feedback.tipo === 'erro' && (
              <div
                className={`w-14 h-14 rounded-full ${
                  altoContraste ? 'bg-zinc-800 text-rose-500 border border-rose-500' : 'bg-rose-100 text-rose-600'
                } flex items-center justify-center shadow-xs`}
              >
                <XCircle className="w-8 h-8" />
              </div>
            )}

            {feedback.tipo === 'atencao' && (
              <div
                className={`w-14 h-14 rounded-full ${
                  altoContraste ? 'bg-zinc-800 text-amber-400 border border-amber-500' : 'bg-amber-100 text-amber-600'
                } flex items-center justify-center shadow-xs`}
              >
                <AlertTriangle className="w-8 h-8" />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">{feedback.titulo}</h3>
              <p className="text-[0.9em] text-slate-400 leading-relaxed">{feedback.mensagem}</p>
            </div>

            <button
              onClick={() => {
                emitirSomBip(600, 0.05);
                setFeedback({ tipo: null, titulo: '', mensagem: '' });
              }}
              className={`w-full py-3 rounded-2xl ${
                altoContraste ? 'bg-amber-500 text-black font-bold' : 'bg-[#5F7DE3] hover:bg-[#4d6bd3]'
              } text-white font-semibold text-[0.9em] transition-all shadow-md mt-2 cursor-pointer`}
            >
              Ok, Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
