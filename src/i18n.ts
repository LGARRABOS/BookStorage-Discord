import type { Locale } from './config.js';

const catalog: Record<Locale, Record<string, string>> = {
  fr: {
    link_success:
      'Compte BookStorage lié avec succès. Vous pouvez utiliser `/reading`, `/stats` et `/chapter`.',
    link_invalid_token:
      'Jeton API invalide ou expiré. Créez un jeton dans Profil → Jetons API sur votre instance BookStorage.',
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
    link_success: 'BookStorage account linked. You can use `/reading`, `/stats`, and `/chapter`.',
    link_invalid_token:
      'Invalid or expired API token. Create a token under Profile → API tokens on your BookStorage instance.',
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
