export const LODGIFY_BASE_URL = "https://api.lodgify.com";

export type LodgifyQuery = Record<string, string | number | boolean | undefined | null>;

export type LodgifyBookingsResponse = {
  count?: number | null;
  items?: unknown[];
};

export class LodgifyError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message);
    this.name = "LodgifyError";
  }
}

export type LodgifyClientOptions = {
  apiKey?: string;
  baseUrl?: string;
};

export function createLodgifyClient(options: LodgifyClientOptions = {}) {
  const apiKey = options.apiKey || process.env.LODGIFY_API_KEY;
  const baseUrl = options.baseUrl || LODGIFY_BASE_URL;

  if (!apiKey) {
    throw new LodgifyError("Missing LODGIFY_API_KEY. Add it to .env.local and Vercel env vars.");
  }
  const credential = apiKey;

  async function request<T>(path: string, query: LodgifyQuery = {}): Promise<T> {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-ApiKey": credential,
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new LodgifyError(`Lodgify request failed with status ${res.status}`, res.status, text);
    }

    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new LodgifyError("Lodgify returned invalid JSON", res.status, text.slice(0, 500));
    }
  }

  return {
    request,
    getBookings: (query: LodgifyQuery = {}) =>
      request<LodgifyBookingsResponse>("/v2/reservations/bookings", query),
    getProperties: () => request<unknown>("/v2/properties"),
  };
}

export async function fetchAllLodgifyBookings(query: LodgifyQuery = {}) {
  const client = createLodgifyClient();
  const size = Number(query.size || 100);
  const maxPages = Number(query.maxPages || 50);
  const all: unknown[] = [];

  for (let page = Number(query.page || 1); page <= maxPages; page++) {
    const response = await client.getBookings({ ...query, page, size, maxPages: undefined });
    const items = Array.isArray(response.items) ? response.items : [];
    all.push(...items);
    if (items.length < size) break;
  }

  return all;
}
