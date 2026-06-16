export type LinkStatus = 'up' | 'down' | 'degraded' | 'unknown' | 'none';

export type ProbeStatus = 'up' | 'down' | 'degraded' | 'unknown';

export function linkStatusEmoji(status?: string): string {
  switch (status) {
    case 'up':
      return '🟢';
    case 'down':
      return '🔴';
    case 'degraded':
      return '🟡';
    case 'unknown':
      return '⚪';
    default:
      return '';
  }
}

export function probeStatusEmoji(status?: string): string {
  return linkStatusEmoji(status === 'none' ? undefined : status);
}

export function formatProbeStatusLabel(
  locale: 'fr' | 'en',
  status: string,
  httpStatus?: number | null,
): string {
  const code = httpStatus && httpStatus > 0 ? ` (${httpStatus})` : '';
  const labels: Record<'fr' | 'en', Record<string, string>> = {
    fr: {
      up: 'En ligne',
      down: 'Hors ligne',
      degraded: 'Dégradé',
      unknown: 'Inconnu',
    },
    en: {
      up: 'Online',
      down: 'Offline',
      degraded: 'Degraded',
      unknown: 'Unknown',
    },
  };
  const label = labels[locale][status] ?? status;
  return `${probeStatusEmoji(status)} ${label}${code}`;
}
