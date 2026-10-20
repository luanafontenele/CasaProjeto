/** "Agora", "5m", "3h", "2d" ou dd/mm — usado nas notificações. */
export function tempoRelativo(iso: string): string {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 90) return 'Agora';
  if (seg < 3600) return `${Math.floor(seg / 60)}m`;
  if (seg < 86400) return `${Math.floor(seg / 3600)}h`;
  if (seg < 7 * 86400) return `${Math.floor(seg / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
