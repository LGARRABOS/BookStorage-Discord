import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchBookStorageHealth, type FetchFn } from '../src/api/bookstorage.js';
import { formatProbeStatusLabel, linkStatusEmoji } from '../src/link-status.js';

describe('link-status', () => {
  it('maps statuses to emojis', () => {
    expect(linkStatusEmoji('up')).toBe('🟢');
    expect(linkStatusEmoji('down')).toBe('🔴');
    expect(linkStatusEmoji('degraded')).toBe('🟡');
    expect(linkStatusEmoji('unknown')).toBe('⚪');
    expect(linkStatusEmoji(undefined)).toBe('');
  });

  it('formats probe labels with HTTP code', () => {
    expect(formatProbeStatusLabel('fr', 'up', 200)).toBe('🟢 En ligne (200)');
    expect(formatProbeStatusLabel('en', 'down', 503)).toBe('🔴 Offline (503)');
  });
});

describe('fetchBookStorageHealth', () => {
  let fetchMock: ReturnType<typeof vi.fn<FetchFn>>;

  beforeEach(() => {
    fetchMock = vi.fn<FetchFn>();
  });

  it('returns health payload from /healthz', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, version: '6.1.0', uptime_sec: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const health = await fetchBookStorageHealth('https://books.example.com', fetchMock);

    expect(health.ok).toBe(true);
    expect(health.version).toBe('6.1.0');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://books.example.com/healthz',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });
});
