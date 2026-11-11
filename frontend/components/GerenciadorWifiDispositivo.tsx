'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Wifi,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  RefreshCw,
  Bluetooth,
  Lock,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api, erroParaFeedback } from '@/lib/api';

type RedeItem = {
  ssid: string;
  senha?: string;
  aberta?: boolean;
  isNova?: boolean;
};

type WifiStatusResponse = {
  redes: { ssid: string; principal: boolean }[];
  wifi_versao: number;
  aplicada: boolean;
  status: string;
  ssid_atual: string | null;
  remoto_disponivel: boolean;
};

interface GerenciadorWifiProps {
  mac: string;
  modoEscuro?: boolean;
  altoContraste?: boolean;
  emitirSomBip?: (freq?: number, dur?: number) => void;
  onAbrirBluetoothReconfig?: () => void;
}

export default function GerenciadorWifiDispositivo({
  mac,
  modoEscuro = false,
  altoContraste = false,
  emitirSomBip,
  onAbrirBluetoothReconfig,
}: GerenciadorWifiProps) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [wifiInfo, setWifiInfo] = useState<WifiStatusResponse | null>(null);
  const [redesEdicao, setRedesEdicao] = useState<RedeItem[]>([]);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'ok' | 'erro' | 'info'; texto: string } | null>(null);
  const [mostrarSenhas, setMostrarSenhas] = useState<Record<number, boolean>>({});

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingInicioRef = useRef<number>(0);

  const carregarWifi = useCallback(async () => {
    try {
      const { data } = await api.get<WifiStatusResponse>(`/dispositivos/${encodeURIComponent(mac)}/wifi`);
      setWifiInfo(data);
      setRedesEdicao(
        data.redes.map((r) => ({
          ssid: r.ssid,
          senha: '', // Senhas nunca retornadas pela API
          aberta: false,
          isNova: false,
        }))
      );
      return data;
    } catch (err) {
      console.warn('Erro ao carregar dados do Wi-Fi:', err);
      return null;
    } finally {
      setCarregando(false);
    }
  }, [mac]);

  useEffect(() => {
    carregarWifi();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [carregarWifi]);

  // Polling a cada 10s por até 2 minutos enquanto aguarda confirmação do aparelho
  const iniciarPollingConfirmacao = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingInicioRef.current = Date.now();

    pollingRef.current = setInterval(async () => {
      // Limite de 2 minutos (120s)
      if (Date.now() - pollingInicioRef.current > 120000) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      const data = await carregarWifi();
      if (data && (data.aplicada || data.status === 'erro_decifrar')) {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 10000);
  }, [carregarWifi]);

  const handleMoverRede = (index: number, direcao: 'cima' | 'baixo') => {
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= redesEdicao.length) return;
    emitirSomBip?.(600, 0.05);

    const copia = [...redesEdicao];
    const [item] = copia.splice(index, 1);
    copia.splice(novoIndex, 0, item);
    setRedesEdicao(copia);
  };

  const handleRemoverRede = (index: number) => {
    emitirSomBip?.(400, 0.05);
    setRedesEdicao(redesEdicao.filter((_, i) => i !== index));
  };

  const handleAdicionarReserva = () => {
    if (redesEdicao.length >= 4) return;
    emitirSomBip?.(700, 0.05);
    setRedesEdicao([
      ...redesEdicao,
      {
        ssid: '',
        senha: '',
        aberta: false,
        isNova: true,
      },
    ]);
  };

  const handleAlterarCampo = (index: number, campo: keyof RedeItem, valor: unknown) => {
    const copia = [...redesEdicao];
    copia[index] = { ...copia[index], [campo]: valor };
    setRedesEdicao(copia);
  };

  const handleSalvarRedes = async () => {
    setMensagemStatus(null);
    if (redesEdicao.length === 0) {
      setMensagemStatus({ tipo: 'erro', texto: 'Mantenha ao menos uma rede configurada.' });
      return;
    }

    // Validações locais
    for (let i = 0; i < redesEdicao.length; i++) {
      const r = redesEdicao[i];
      const nomeTipo = i === 0 ? 'principal' : `reserva ${i}`;
      if (!r.ssid.trim()) {
        setMensagemStatus({ tipo: 'erro', texto: `Informe o nome da rede ${nomeTipo}.` });
        return;
      }
      if (r.isNova && !r.aberta && (!r.senha || r.senha.length < 8)) {
        setMensagemStatus({ tipo: 'erro', texto: `A rede nova "${r.ssid}" precisa de uma senha com ao menos 8 caracteres (ou marque como aberta).` });
        return;
      }
    }

    setSalvando(true);
    try {
      const payloadRedes = redesEdicao.map((r) => {
        const item: { ssid: string; senha?: string; aberta?: boolean } = {
          ssid: r.ssid.trim(),
        };
        if (r.aberta) {
          item.aberta = true;
          item.senha = '';
        } else if (r.senha && r.senha.trim().length > 0) {
          item.senha = r.senha;
        }
        return item;
      });

      await api.put(`/dispositivos/${encodeURIComponent(mac)}/wifi`, {
        redes: payloadRedes,
      });

      emitirSomBip?.(800, 0.1);
      setMensagemStatus({
        tipo: 'ok',
        texto: 'Redes gravadas com sucesso! Aguardando o aparelho aplicar as credenciais...',
      });

      await carregarWifi();
      iniciarPollingConfirmacao();
    } catch (err: unknown) {
      const fb = erroParaFeedback(err);
      setMensagemStatus({ tipo: 'erro', texto: fb.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Carregando configurações de Wi-Fi...</span>
      </div>
    );
  }

  const remotoDisponivel = wifiInfo?.remoto_disponivel && wifiInfo.status !== 'sem_chave';
  const statusErroDecifrar = wifiInfo?.status === 'erro_decifrar';
  const statusAplicado = wifiInfo?.aplicada === true && wifiInfo.status === 'ok';
  const statusAguardando = wifiInfo && !wifiInfo.aplicada && !statusErroDecifrar;

  return (
    <div className="space-y-4 text-xs">
      {/* CABEÇALHO DO STATUS ATUAL */}
      <div
        className={`p-3.5 rounded-2xl border ${
          altoContraste
            ? 'bg-zinc-900 border-amber-500 text-amber-300'
            : modoEscuro
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-semibold">
            <Radio className="w-4 h-4 text-blue-600" />
            <span>Rede conectada:</span>
            <span className="font-mono text-slate-900 dark:text-white">
              {wifiInfo?.ssid_atual || 'Não informada'}
            </span>
          </div>

          {/* BADGE DE STATUS */}
          {statusAplicado && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aplicado no aparelho
            </span>
          )}
          {statusAguardando && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Aguardando o aparelho (até 1 min)…
            </span>
          )}
          {statusErroDecifrar && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              Erro ao decifrar
            </span>
          )}
        </div>

        {/* ALERTA DE CHAVE INDISPONÍVEL OU ERRO */}
        {!remotoDisponivel && (
          <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1">
              <p className="font-semibold">Edição remota desabilitada</p>
              <p className="text-[11px] mt-0.5">
                Para editar o Wi-Fi pelo site, reconfigure o aparelho por Bluetooth uma vez com a chave de segurança.
              </p>
            </div>
            {onAbrirBluetoothReconfig && (
              <button
                type="button"
                onClick={onAbrirBluetoothReconfig}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] cursor-pointer shrink-0"
              >
                Reconfigurar BLE
              </button>
            )}
          </div>
        )}

        {statusErroDecifrar && (
          <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">O aparelho não conseguiu ler a lista</p>
              <p className="text-[11px] mt-0.5">
                A chave de segurança foi alterada ou corrompida. Refaça a configuração por Bluetooth.
              </p>
            </div>
            {onAbrirBluetoothReconfig && (
              <button
                type="button"
                onClick={onAbrirBluetoothReconfig}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] cursor-pointer shrink-0"
              >
                Refazer por BLE
              </button>
            )}
          </div>
        )}
      </div>

      {/* AVISOS FIXOS OBRIGATÓRIOS DO SISTEMA */}
      <div
        className={`p-3 rounded-2xl border text-[11px] space-y-1 ${
          altoContraste
            ? 'bg-black border-zinc-800 text-amber-200'
            : modoEscuro
            ? 'bg-slate-900/60 border-slate-800 text-slate-400'
            : 'bg-blue-50/50 border-blue-100 text-slate-600'
        }`}
      >
        <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          Somente redes Wi-Fi de 2,4 GHz são suportadas pelo ESP32.
        </p>
        <p>• A troca da rede principal passa a valer na próxima vez que o aparelho precisar conectar (queda de sinal ou reinício).</p>
        <p>• Mantenha ao menos uma rede funcional: se nenhuma funcionar, a recuperação deve ser feita via Bluetooth.</p>
      </div>

      {/* LISTA ORDENADA DE REDES */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
            Redes Cadastradas ({redesEdicao.length}/4)
          </span>
          {remotoDisponivel && redesEdicao.length < 4 && (
            <button
              type="button"
              onClick={handleAdicionarReserva}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-[11px] cursor-pointer ${
                altoContraste
                  ? 'bg-amber-400 text-black'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Reserva
            </button>
          )}
        </div>

        {redesEdicao.map((rede, idx) => {
          const isPrincipal = idx === 0;
          const label = isPrincipal ? 'Principal' : `Reserva ${idx}`;
          const visivel = mostrarSenhas[idx] ?? false;

          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-colors ${
                isPrincipal
                  ? altoContraste
                    ? 'border-amber-400 bg-zinc-900'
                    : modoEscuro
                    ? 'border-blue-900/70 bg-slate-900'
                    : 'border-blue-200 bg-blue-50/40'
                  : altoContraste
                  ? 'border-zinc-800 bg-black'
                  : modoEscuro
                  ? 'border-slate-800 bg-slate-900/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                      isPrincipal
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </span>
                  {rede.isNova && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Nova
                    </span>
                  )}
                </div>

                {/* BOTÕES DE REORDENAÇÃO E REMOÇÃO */}
                {remotoDisponivel && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoverRede(idx, 'cima')}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === redesEdicao.length - 1}
                      onClick={() => handleMoverRede(idx, 'baixo')}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {redesEdicao.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoverRede(idx)}
                        className="p-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer ml-1"
                        title="Remover rede"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* CAMPOS SSID E SENHA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Nome da Rede (SSID)</label>
                  <input
                    type="text"
                    disabled={!remotoDisponivel}
                    value={rede.ssid}
                    maxLength={32}
                    onChange={(e) => handleAlterarCampo(idx, 'ssid', e.target.value)}
                    placeholder="Ex: MinhaCasa_2.4G"
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                      altoContraste
                        ? 'bg-black border-amber-500 text-amber-300'
                        : modoEscuro
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-800'
                    } disabled:opacity-50`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-slate-500 font-medium">Senha</label>
                    <label className="inline-flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!remotoDisponivel}
                        checked={rede.aberta}
                        onChange={(e) => handleAlterarCampo(idx, 'aberta', e.target.checked)}
                        className="rounded accent-blue-600"
                      />
                      <span>Rede aberta</span>
                    </label>
                  </div>
                  {!rede.aberta && (
                    <div className="relative">
                      <input
                        type={visivel ? 'text' : 'password'}
                        disabled={!remotoDisponivel}
                        value={rede.senha || ''}
                        maxLength={63}
                        onChange={(e) => handleAlterarCampo(idx, 'senha', e.target.value)}
                        placeholder={rede.isNova ? 'Senha (mín. 8 carac.)' : 'Vazio = manter a atual'}
                        className={`w-full pl-3 pr-8 py-1.5 rounded-xl border text-xs ${
                          altoContraste
                            ? 'bg-black border-amber-500 text-amber-300'
                            : modoEscuro
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-800'
                        } disabled:opacity-50`}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenhas({ ...mostrarSenhas, [idx]: !visivel })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {visivel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FEEDBACK STATUS */}
      {mensagemStatus && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            mensagemStatus.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          {mensagemStatus.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{mensagemStatus.texto}</span>
        </div>
      )}

      {/* BOTÃO DE SALVAR */}
      {remotoDisponivel && (
        <div className="pt-2">
          <button
            type="button"
            disabled={salvando}
            onClick={handleSalvarRedes}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
              altoContraste
                ? 'bg-amber-400 hover:bg-amber-300 text-black'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            } disabled:opacity-50`}
          >
            {salvando ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Cifrando e Gravando...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Salvar Redes no Aparelho</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
