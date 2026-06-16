import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  BookStorageClient,
  BookStorageApiError,
  resolveWorkByTitle,
  type FetchFn,
} from '../src/api/bookstorage.js';

const BASE_URL = 'https://books.example.com';
const TOKEN = 'bs_test_token';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

describe('BookStorageClient', () => {
  let fetchMock: ReturnType<typeof vi.fn<FetchFn>>;

  beforeEach(() => {
    fetchMock = vi.fn<FetchFn>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listWorks sends bearer token and query params', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [{ id: 1, title: 'Test', chapter: 3 }],
        meta: { page: 1, limit: 10, total: 1, total_pages: 1, has_next: false, has_prev: false },
      }),
    );

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    const result = await client.listWorks({ status: 'reading', limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/works?status=reading&limit=10`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      }),
    );
  });

  it('getStats returns stats payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          total_works: 5,
          total_chapters: 120,
          avg_rating: 4.2,
          rated_count: 3,
        },
      }),
    );

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    const result = await client.getStats();

    expect(result.data.total_works).toBe(5);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/stats`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      }),
    );
  });

  it('increment posts to increment endpoint', async () => {
    fetchMock.mockResolvedValue(textResponse('ok'));

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    await client.increment(42);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/increment/42`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('decrement posts to decrement endpoint', async () => {
    fetchMock.mockResolvedValue(textResponse('ok'));

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    await client.decrement(7);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/decrement/7`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('maps JSON API errors to BookStorageApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'session_expired' }, 401));

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);

    await expect(client.getStats()).rejects.toMatchObject({
      code: 'session_expired',
      status: 401,
    } satisfies Partial<BookStorageApiError>);
  });
});

describe('resolveWorkByTitle', () => {
  let fetchMock: ReturnType<typeof vi.fn<FetchFn>>;

  beforeEach(() => {
    fetchMock = vi.fn<FetchFn>();
  });

  const meta = {
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };

  it('returns not_found when search has no results', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], meta: { ...meta, total: 0 } }));

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    const result = await resolveWorkByTitle(client, 'Unknown');

    expect(result).toEqual({ ok: false, reason: 'not_found', title: 'Unknown' });
  });

  it('returns single work when exactly one match', async () => {
    const work = { id: 1, title: 'Solo Leveling', chapter: 10 };
    fetchMock.mockResolvedValue(jsonResponse({ data: [work], meta: { ...meta, total: 1 } }));

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    const result = await resolveWorkByTitle(client, 'Solo');

    expect(result).toEqual({ ok: true, work });
  });

  it('returns ambiguous when multiple matches', async () => {
    const works = [
      { id: 1, title: 'Solo Leveling', chapter: 10 },
      { id: 2, title: 'Solo Camping', chapter: 2 },
    ];
    fetchMock.mockResolvedValue(jsonResponse({ data: works, meta: { ...meta, total: 2 } }));

    const client = new BookStorageClient(BASE_URL, TOKEN, fetchMock);
    const result = await resolveWorkByTitle(client, 'Solo');

    expect(result).toEqual({ ok: false, reason: 'ambiguous', title: 'Solo', works });
  });
});
