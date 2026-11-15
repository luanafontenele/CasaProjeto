/** "Agora", "5m", "3h", "2d" ou dd/mm — usado nas notificações. */
export function tempoRelativo(iso: string): string {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 90) return 'Agora';
  if (seg < 3600) return `${Math.floor(seg / 60)}m`;
  if (seg < 86400) return `${Math.floor(seg / 3600)}h`;
  if (seg < 7 * 86400) return `${Math.floor(seg / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Validação de status online com TTL de 12 minutos (720.000 ms),
 * com tolerância para até 2 minutos de divergência no relógio local/UTC.
 * Compatível com formato ISO-8601 e epoch numérico do firmware v11/v12 e app mobile.
 */
export function isDispositivoOnline(d?: {
  online?: boolean;
  statusOnline?: boolean;
  ultima_sincronizacao?: string | number | null;
}): boolean {
  if (!d) return false;
  if (!d.ultima_sincronizacao) {
    return d.online ?? d.statusOnline ?? false;
  }

  let syncMs: number | null = null;
  if (typeof d.ultima_sincronizacao === 'number') {
    syncMs = d.ultima_sincronizacao < 10_000_000_000 ? d.ultima_sincronizacao * 1000 : d.ultima_sincronizacao;
  } else {
    const raw = String(d.ultima_sincronizacao).trim();
    if (/^\d+$/.test(raw)) {
      const num = Number(raw);
      syncMs = num < 10_000_000_000 ? num * 1000 : num;
    } else {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) syncMs = parsed;
    }
  }

  if (syncMs === null) {
    return d.online ?? d.statusOnline ?? false;
  }

  const diffMs = Date.now() - syncMs;
  // Janela de tolerância de 12 minutos (-120s até +12min)
  return diffMs >= -120_000 && diffMs <= 12 * 60 * 1000;
}
