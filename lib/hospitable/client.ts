export const HOSPITABLE_BASE_URL = "https://public.api.hospitable.com/v2";

export type HospitableQuery = Record<string, string | number | boolean | string[] | undefined | null>;

export type HospitableListResponse<T = unknown> = {
  data?: T[];
  links?: Record<string, unknown> | null;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  } | null;
};

export class HospitableError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
  ) {
    super(message);
    this.name = "HospitableError";
  }
}

export type HospitableClientOptions = {
  token?: string;
  baseUrl?: string;
};

function appendQuery(url: URL, query: HospitableQuery) {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

export function createHospitableClient(options: HospitableClientOptions = {}) {
  const token = options.token || process.env.HOSPITABLE_API_TOKEN;
  const baseUrl = options.baseUrl || HOSPITABLE_BASE_URL;

  if (!token) {
    throw new HospitableError("Missing HOSPITABLE_API_TOKEN. Add it to .env.local and Vercel env vars.");
  }

  async function request<T>(path: string, query: HospitableQuery = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`);
    appendQuery(url, query);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new HospitableError(`Hospitable request failed with status ${res.status}`, res.status, text.slice(0, 1000));
    }

    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HospitableError("Hospitable returned invalid JSON", res.status, text.slice(0, 500));
    }
  }

  return {
    request,
    getProperties: () => request<HospitableListResponse>("/properties"),
    getReservations: (query: HospitableQuery = {}) => request<HospitableListResponse>("/reservations", query),
  };
}

export async function fetchHospitablePropertyIds() {
  if (process.env.HOSPITABLE_PROPERTY_IDS) {
    return process.env.HOSPITABLE_PROPERTY_IDS.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  const client = createHospitableClient();
  const response = await client.getProperties();
  const properties = Array.isArray(response.data) ? response.data : [];
  return properties
    .map((property) => (typeof property === "object" && property !== null && "id" in property ? String(property.id) : null))
    .filter((id): id is string => Boolean(id));
}

export async function fetchAllHospitableReservations(query: HospitableQuery = {}) {
  const client = createHospitableClient();
  const propertyIds = Array.isArray(query["properties[]"])
    ? (query["properties[]"] as string[])
    : await fetchHospitablePropertyIds();
  const maxPages = Number(query.maxPages || 100);
  const all: unknown[] = [];

  if (propertyIds.length === 0) {
    throw new HospitableError("No Hospitable properties found for this token.");
  }

  for (let page = Number(query.page || 1); page <= maxPages; page++) {
    const response = await client.getReservations({
      ...query,
      "properties[]": propertyIds,
      include: query.include || "guest,financials",
      page,
      maxPages: undefined,
    });
    const items = Array.isArray(response.data) ? response.data : [];
    all.push(...items);

    const lastPage = Number(response.meta?.last_page || page);
    if (page >= lastPage || items.length === 0) break;
  }

  return all;
}
