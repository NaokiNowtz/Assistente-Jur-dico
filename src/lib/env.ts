export function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  databaseUrl: env("DATABASE_URL", "file:./prisma/dev.db"),
  lawyerPassword: env("LAWYER_PASSWORD", "troque-esta-senha"),
  whatsapp: {
    verifyToken: env("WHATSAPP_VERIFY_TOKEN", "change-me-verify-token"),
    accessToken: env("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    appSecret: env("WHATSAPP_APP_SECRET"),
    graphVersion: env("WHATSAPP_GRAPH_VERSION", "v21.0"),
    maxMediaBytes: Number(env("WHATSAPP_MAX_MEDIA_BYTES", String(10 * 1024 * 1024))),
  },
  openai: {
    apiKey: env("OPENAI_API_KEY"),
    model: env("OPENAI_MODEL", "gpt-4o-mini"),
  },
};
