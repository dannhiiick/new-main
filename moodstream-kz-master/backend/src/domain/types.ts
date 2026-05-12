// Shared domain primitives for MoodStream backend

export type LocaleCode = "kk" | "ru" | "en";

export type TerritoryCode = "KZ" | "KG" | "UZ" | "AZ" | "TJ" | "TM" | "GLOBAL";

export type UserRole = "LISTENER" | "ADMIN" | "CATALOG_MANAGER";

// Locale fallback: kk -> ru -> en
export const LOCALE_FALLBACK: Record<LocaleCode, LocaleCode[]> = {
  kk: ["kk", "ru", "en"],
  ru: ["ru", "en"],
  en: ["en"],
};

// Territory fallback: KZ -> KG,UZ -> GLOBAL
export const TERRITORY_FALLBACK: Record<TerritoryCode, TerritoryCode[]> = {
  KZ: ["KZ", "KG", "UZ", "GLOBAL"],
  KG: ["KG", "KZ", "GLOBAL"],
  UZ: ["UZ", "KZ", "GLOBAL"],
  AZ: ["AZ", "GLOBAL"],
  TJ: ["TJ", "GLOBAL"],
  TM: ["TM", "GLOBAL"],
  GLOBAL: ["GLOBAL"],
};

export interface RequestContext {
  userId?: string;
  deviceId?: string;
  locale: LocaleCode;
  territory: TerritoryCode;
  role: UserRole | "ANONYMOUS";
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

// RFC 7807 Problem Details
export interface ProblemDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type AvailabilityStatus =
  | "AVAILABLE"
  | "UPCOMING"
  | "UNAVAILABLE"
  | "TAKEDOWN"
  | "GEO_BLOCKED"
  | "RIGHTS_HOLD";

export type PlaybackStatus = "PLAYABLE" | "PROCESSING" | "BLOCKED" | "REMOVED";
