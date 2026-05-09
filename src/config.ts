function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  API_BASE_URL: getEnv("API_BASE_URL", "https://api.localseodata.com"),
  PORT: parseInt(getEnv("PORT", "3003"), 10),
} as const;
