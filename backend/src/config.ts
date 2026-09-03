import dotenv from "dotenv";

dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV !== "test") {
    throw new Error(`Nedostaje obavezna promenljiva okruženja: ${name}`);
  }
  return value ?? "";
};

export const config = {
  port: Number(process.env.PORT ?? 5000),
  frontendUrl: required("FRONTEND_URL", "http://localhost:5173"),
  jwtSecret: () => required("JWT_SECRET", "test-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  cookieMaxAgeMs: Number(process.env.COOKIE_MAX_AGE_MS ?? 8 * 60 * 60 * 1000),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieSameSite: (process.env.COOKIE_SAME_SITE ?? "lax") as
    | "lax"
    | "strict"
    | "none",
};
