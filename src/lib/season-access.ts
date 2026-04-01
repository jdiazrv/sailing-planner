import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

import { buildAuthRedirectUrl, getEnv } from "@/lib/env";

export const SEASON_ACCESS_COOKIE_NAME = "season_access_guest";

export type SeasonAccessWindow = "season_end" | "season_plus_7";

export type SeasonAccessCookiePayload = {
  v: 1;
  linkId: string;
  boatId: string;
  seasonId: string;
  expiresAt: string;
};

const toBase64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
};

const getCookieSigningKey = () =>
  getEnv().SUPABASE_SERVICE_ROLE_KEY ?? getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;

const signPayload = (payload: string) =>
  createHmac("sha256", getCookieSigningKey()).update(payload).digest();

export const generateSeasonAccessToken = () => toBase64Url(randomBytes(32));

export const hashSeasonAccessToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const getSeasonAccessExpiry = (
  seasonEndDate: string,
  window: SeasonAccessWindow,
) => {
  const baseDate = new Date(`${seasonEndDate}T23:59:59.000Z`);

  if (window === "season_plus_7") {
    baseDate.setUTCDate(baseDate.getUTCDate() + 7);
  }

  return baseDate.toISOString();
};

export const buildSeasonAccessUrl = (token: string) =>
  buildAuthRedirectUrl(`/season-access/${token}`);

export const serializeSeasonAccessCookie = (
  payload: SeasonAccessCookiePayload,
) => {
  const json = JSON.stringify(payload);
  const encodedPayload = toBase64Url(json);
  const signature = toBase64Url(signPayload(encodedPayload));
  return `${encodedPayload}.${signature}`;
};

export const parseSeasonAccessCookie = (
  value: string | undefined,
): SeasonAccessCookiePayload | null => {
  if (!value) {
    return null;
  }

  const [encodedPayload, encodedSignature] = value.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const actualSignature = fromBase64Url(encodedSignature);

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload).toString("utf8"));
    if (
      parsed?.v !== 1 ||
      typeof parsed.linkId !== "string" ||
      typeof parsed.boatId !== "string" ||
      typeof parsed.seasonId !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return parsed as SeasonAccessCookiePayload;
  } catch {
    return null;
  }
};

export const getSeasonAccessCookieOptions = (expiresAt: string | Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: getEnv().NEXT_PUBLIC_APP_URL.startsWith("https://"),
  path: "/",
  expires: new Date(expiresAt),
});

export const getSeasonAccessErrorUrl = (reason: string) => {
  const url = new URL("/season-access/error", getEnv().NEXT_PUBLIC_APP_URL);
  url.searchParams.set("reason", reason);
  return url;
};
