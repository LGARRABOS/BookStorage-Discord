import type { Locale } from './config.js';

const catalog: Record<Locale, Record<string, string>> = {
  fr: {
    link_success:
      'Compte BookStorage lié avec succès. Utilisez `/reading`, `/plus`, `/lien`, `/status` ou `/stats`.',
    link_invalid_token:
      'Jeton API invalide ou inaccessible. Vérifiez que le bot utilise la même URL que ce site (BOOKSTORAGE_BASE_URL) et que le jeton inclut lecture + écriture.',
    not_linked:
      'Compte non lié. Utilisez `/link token:<votre_jeton>` (créez un jeton dans Profil → Jetons API).',
    session_expired:
      'Session expirée ou jeton révoqué. Reliez votre compte avec `/link token:<votre_jeton>`.',
    insufficient_scope:
      'Permissions insuffisantes sur le jeton API. Scopes requis : `works:read` (lecture) et `works:write` (chapitres).',
    rate_limited: 'Trop de requêtes. Réessayez dans quelques instants.',
    api_error: 'Erreur BookStorage ({code}). Réessayez plus tard.',
    reading_empty: 'Aucune œuvre en cours de lecture.',
    reading_title: 'En cours de lecture',
    reading_more: '… et d’autres œuvres (affinez avec une recherche sur le site).',
    reading_buttons_hint: 'Cliquez sur un bouton pour avancer d’un chapitre, ou utilisez `/plus`.',
    reading_open_link: 'Lire',
    lien_no_link: 'Aucun lien enregistré pour « {title} ».',
    lien_field_link: 'Lien',
    lien_field_chapter: 'Chapitre',
    lien_field_status: 'Disponibilité',
    lien_status_unknown: '⚪ Non vérifié',
    status_app_title: 'BookStorage',
    status_app_online: '🟢 En ligne',
    status_app_degraded: '🟡 Base de données indisponible',
    status_app_unreachable: '🔴 Injoignable ({url})',
    status_field_state: 'État',
    status_field_version: 'Version',
    status_field_uptime: 'Uptime',
    status_sites_title: 'Sites de lecture',
    status_sites_empty: 'Aucun site configuré (Profil → Sites de lecture sur le site).',
    stats_title: 'Statistiques de lecture',
    stats_works: 'Œuvres',
    stats_chapters: 'Chapitres lus',
    stats_avg_rating: 'Note moyenne',
    stats_rated: 'Œuvres notées',
    chapter_not_found: 'Aucune œuvre trouvée pour « {title} ».',
    chapter_ambiguous_title: 'Plusieurs œuvres correspondent à « {title} » :',
    chapter_ambiguous_hint: 'Précisez le titre et réessayez.',
    chapter_result: '**{title}** — chapitre {chapter}',
    unknown_error: 'Une erreur inattendue est survenue.',
  },
  en: {
    link_success: 'BookStorage account linked. Use `/reading`, `/plus`, `/lien`, `/status`, or `/stats`.',
    link_invalid_token:
      'Invalid or unreachable API token. Ensure the bot BOOKSTORAGE_BASE_URL matches this site and the token has read + write scopes.',
    not_linked:
      'Account not linked. Use `/link token:<your_token>` (create a token under Profile → API tokens).',
    session_expired: 'Session expired or token revoked. Re-link with `/link token:<your_token>`.',
    insufficient_scope:
      'Insufficient API token scopes. Required: `works:read` (read) and `works:write` (chapters).',
    rate_limited: 'Too many requests. Please try again shortly.',
    api_error: 'BookStorage error ({code}). Please try again later.',
    reading_empty: 'No works currently reading.',
    reading_title: 'Currently reading',
    reading_more: '… and more works (refine on the website).',
    reading_buttons_hint: 'Click a button to advance one chapter, or use `/plus`.',
    reading_open_link: 'Read',
    lien_no_link: 'No reading link saved for "{title}".',
    lien_field_link: 'Link',
    lien_field_chapter: 'Chapter',
    lien_field_status: 'Availability',
    lien_status_unknown: '⚪ Not checked',
    status_app_title: 'BookStorage',
    status_app_online: '🟢 Online',
    status_app_degraded: '🟡 Database unavailable',
    status_app_unreachable: '🔴 Unreachable ({url})',
    status_field_state: 'State',
    status_field_version: 'Version',
    status_field_uptime: 'Uptime',
    status_sites_title: 'Reading sites',
    status_sites_empty: 'No sites configured (Profile → Reading sites on the website).',
    stats_title: 'Reading stats',
    stats_works: 'Works',
    stats_chapters: 'Chapters read',
    stats_avg_rating: 'Average rating',
    stats_rated: 'Rated works',
    chapter_not_found: 'No work found for "{title}".',
    chapter_ambiguous_title: 'Multiple works match "{title}":',
    chapter_ambiguous_hint: 'Use a more specific title and try again.',
    chapter_result: '**{title}** — chapter {chapter}',
    unknown_error: 'An unexpected error occurred.',
  },
};

export function t(
  locale: Locale,
  key: keyof (typeof catalog)['fr'],
  vars?: Record<string, string | number>,
): string {
  let text = catalog[locale][key] ?? catalog.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function mapApiError(locale: Locale, code: string): string {
  switch (code) {
    case 'session_expired':
    case 'unauthorized':
      return t(locale, 'session_expired');
    case 'insufficient_scope':
    case 'forbidden':
      return t(locale, 'insufficient_scope');
    case 'rate_limited':
      return t(locale, 'rate_limited');
    default:
      return t(locale, 'api_error', { code });
  }
}
