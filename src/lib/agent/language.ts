import type { Lang } from "./types";

const ES_HINTS =
  /\b(hola|buenas|quiero|español|espanol|gracias|contrato|demanda|abogado|sí|si por favor|puedo|necesito)\b/i;
const PT_HINTS =
  /\b(olá|ola|oi|bom dia|boa tarde|portugu[eê]s|obrigad[oa]|processo|trabalhista|advogad[oa]|preciso|pode)\b/i;

export function detectLanguage(text: string, current: Lang = "pt-BR"): Lang {
  const lower = text.toLowerCase();
  if (/espa[nñ]ol|spanish|quiero español/.test(lower)) return "es";
  if (/portugu[eê]s|pode falar portugu/.test(lower)) return "pt-BR";
  const es = ES_HINTS.test(text);
  const pt = PT_HINTS.test(text);
  if (es && !pt) return "es";
  if (pt && !es) return "pt-BR";
  return current;
}

export function isAffirmative(text: string): boolean {
  return /\b(sim|sí|si|yes|aceito|acepto|concordo|confirmo|confirmar|de acuerdo|ok|claro)\b/i.test(text.trim());
}

export function isNegative(text: string): boolean {
  return /\b(n[aã]o|no|not|agora n[aã]o|ahora no|pular|saltar|skip)\b/i.test(text.trim());
}
