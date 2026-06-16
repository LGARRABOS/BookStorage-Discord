export interface Work {
  id: number;
  title: string;
  chapter: number;
  link?: string;
  status?: string;
  reading_type?: string;
  rating?: number;
  notes?: string;
  updated_at?: string;
  reading_site_id?: number;
  link_status?: 'up' | 'down' | 'degraded' | 'unknown';
}

export interface ReadingSite {
  id: number;
  name: string;
  base_url: string;
  probe_status: 'up' | 'down' | 'degraded' | 'unknown';
  last_probe_at?: string;
  probe_http_status?: number | null;
  probe_detail?: string;
}

export interface ReadingSitesResponse {
  data: ReadingSite[];
}

export interface HealthData {
  ok: boolean;
  version: string;
  uptime_sec: number;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  sort?: string;
  search?: string;
}

export interface WorksListResponse {
  data: Work[];
  meta: ListMeta;
}

export interface StatsData {
  total_works: number;
  total_chapters: number;
  avg_rating: number;
  rated_count: number;
}

export interface StatsResponse {
  data: StatsData;
}

export interface WorkResponse {
  data: Work;
}

export interface ListWorksParams {
  page?: number;
  limit?: number;
  status?: string;
  reading_type?: string;
  search?: string;
  sort?: string;
}

export class BookStorageApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = 'BookStorageApiError';
  }
}

const HTTP_TIMEOUT_MS = 15_000;

export type FetchFn = typeof fetch;

export class BookStorageClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...init.headers,
        },
      });

      if (!response.ok) {
        let code = 'unknown_error';
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            code = body.error;
          }
        } catch {
          // Non-JSON error body
        }
        throw new BookStorageApiError(code, response.status);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      return undefined as T;
    } catch (error) {
      if (error instanceof BookStorageApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BookStorageApiError('timeout', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildQuery(params: ListWorksParams): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    }
    const serialized = query.toString();
    return serialized ? `?${serialized}` : '';
  }

  listWorks(params: ListWorksParams = {}): Promise<WorksListResponse> {
    return this.request<WorksListResponse>(`/api/works${this.buildQuery(params)}`);
  }

  getWork(id: number): Promise<WorkResponse> {
    return this.request<WorkResponse>(`/api/works/${id}`);
  }

  getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/api/stats');
  }

  increment(id: number): Promise<void> {
    return this.request<void>(`/api/increment/${id}`, { method: 'POST' });
  }

  decrement(id: number): Promise<void> {
    return this.request<void>(`/api/decrement/${id}`, { method: 'POST' });
  }

  listReadingSites(): Promise<ReadingSitesResponse> {
    return this.request<ReadingSitesResponse>('/api/reading-sites');
  }
}

export async function fetchBookStorageHealth(
  baseUrl: string,
  fetchFn: FetchFn = fetch,
): Promise<HealthData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const response = await fetchFn(`${baseUrl}/healthz`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new BookStorageApiError('unreachable', response.status);
    }

    return (await response.json()) as HealthData;
  } catch (error) {
    if (error instanceof BookStorageApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BookStorageApiError('timeout', 408);
    }
    throw new BookStorageApiError('unreachable', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export type ResolveWorkResult =
  | { ok: true; work: Work }
  | { ok: false; reason: 'not_found'; title: string }
  | { ok: false; reason: 'ambiguous'; title: string; works: Work[] };

export async function resolveWorkByTitle(
  client: BookStorageClient,
  title: string,
): Promise<ResolveWorkResult> {
  const response = await client.listWorks({ search: title, limit: 10 });

  if (response.data.length === 0) {
    return { ok: false, reason: 'not_found', title };
  }

  if (response.data.length === 1) {
    return { ok: true, work: response.data[0] };
  }

  return { ok: false, reason: 'ambiguous', title, works: response.data };
}
