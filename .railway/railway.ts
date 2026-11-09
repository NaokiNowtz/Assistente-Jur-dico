import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac";

const region = "us-east4-eqdc4a";
const database = postgres("postgres", { region });
const media = volume("media", { region, sizeMB: 1024 });

export default defineRailway(() =>
  project("assistente-juridico-homologacao", {
    resources: [
      database,
      media,
      service("web", {
        source: github("NaokiNowtz/Assistente-Jur-dico", {
          branch: "feat/whatsapp-webhook-flow",
        }),
        build: { command: "npm run build" },
        start: { command: "npm run start" },
        preDeploy: { command: "npm run db:migrate:postgres" },
        healthcheck: { path: "/api/health", timeout: 300 },
        replicas: { [region]: 1 },
        volumeMounts: { "/data": media },
        variables: {
          DATABASE_PROVIDER: "postgres",
          DATABASE_URL: database.env.DATABASE_URL,
          MEDIA_STORAGE_DIR: "/data/media",
          LAWYER_PASSWORD: preserve(),
          WHATSAPP_VERIFY_TOKEN: preserve(),
          WHATSAPP_ACCESS_TOKEN: preserve(),
          WHATSAPP_PHONE_NUMBER_ID: preserve(),
          WHATSAPP_APP_SECRET: preserve(),
          WHATSAPP_GRAPH_VERSION: preserve(),
          OPENAI_API_KEY: preserve(),
          OPENAI_MODEL: preserve(),
        },
      }),
    ],
  }),
);
