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

export type HospitableCalendarResponse = {
  data?: {
    days?: unknown[];
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
    getPropertyCalendar: (propertyId: string, query: HospitableQuery = {}) =>
      request<HospitableCalendarResponse>(`/properties/${encodeURIComponent(propertyId)}/calendar`, query),
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

export type HospitablePropertyCalendar = {
  propertyId: string;
  days: unknown[];
};

function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidCalendarDay(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const day = value as Record<string, unknown>;
  if (!isValidCalendarDate(day.date)) return false;
  if (!day.status || typeof day.status !== "object" || Array.isArray(day.status)) return false;
  const status = day.status as Record<string, unknown>;
  return typeof status.available === "boolean" && typeof status.reason === "string";
}

export async function fetchAllHospitableCalendars(query: HospitableQuery = {}): Promise<HospitablePropertyCalendar[]> {
  const client = createHospitableClient();
  const propertyIds = Array.isArray(query["properties[]"])
    ? (query["properties[]"] as string[])
    : await fetchHospitablePropertyIds();

  if (propertyIds.length === 0) {
    throw new HospitableError("No Hospitable properties found for this token.");
  }

  return Promise.all(
    propertyIds.map(async (propertyId) => {
      const response = await client.getPropertyCalendar(propertyId, {
        start_date: query.start_date,
        end_date: query.end_date,
      });
      const days = response.data?.days;
      if (!Array.isArray(days)) {
        throw new HospitableError(
          `Hospitable calendar response for property ${propertyId} is missing a valid data.days array.`,
        );
      }
      const malformedDayIndex = days.findIndex((day) => !isValidCalendarDay(day));
      if (malformedDayIndex !== -1) {
        throw new HospitableError(
          `Hospitable calendar response for property ${propertyId} contains a malformed day at index ${malformedDayIndex}.`,
        );
      }
      return {
        propertyId,
        days,
      };
    }),
  );
}
