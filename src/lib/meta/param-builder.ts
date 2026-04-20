/**
 * Meta Parameter Builder — Server-side (Node.js)
 *
 * Implementação baseada na Biblioteca do Configurador de Parâmetros da Meta.
 * Referência: https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder
 *
 * Funções:
 * 1. Extrai fbc, fbp de cookies _fbc / _fbp
 * 2. Captura client_ip_address (priorizando IPv6)  
 * 3. Normaliza parâmetros (email, phone, fn, ln, etc.) antes do hash
 * 4. Adiciona apêndice de versão para tracking de performance da biblioteca
 */

// Versão do SDK e identificador de linguagem
const SDK_VERSION = '01'; // v0.1
const SDK_INCREMENTALITY = '0'; // 0 = não-incremental
const SDK_LANGUAGE = 'nd'; // Node.js
const APPENDIX = `.${SDK_VERSION}${SDK_INCREMENTALITY}${SDK_LANGUAGE}000`;

// ---- Cookie Parsing ----

/**
 * Extrai o valor do cookie _fbc de uma string de cookies.
 * Formato: fb.${subdomain_index}.${creation_time}.${fbclid}.${appendix}
 */
export function extractFbc(cookies: string, fbclid?: string | null): string | null {
  const match = cookies.match(/(?:^|;\s*)_fbc=([^;]+)/);
  if (match) {
    return match[1]; // Preservar case — _fbc é case-sensitive
  }

  // Se não tem cookie _fbc mas tem fbclid, gerar um
  if (fbclid) {
    const now = Date.now();
    return `fb.1.${now}.${fbclid}${APPENDIX}`;
  }

  return null;
}

/**
 * Extrai o valor do cookie _fbp de uma string de cookies.
 * Formato: fb.${subdomain_index}.${creation_time}.${random_number}.${appendix}
 */
export function extractFbp(cookies: string): string | null {
  const match = cookies.match(/(?:^|;\s*)_fbp=([^;]+)/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Gera um _fbp se não existir.
 * Formato: fb.1.{timestamp}.{random}
 */
export function generateFbp(): string {
  const now = Date.now();
  const random = Math.floor(Math.random() * 2147483647) + 1;
  return `fb.1.${now}.${random}${APPENDIX}`;
}

// ---- IP Address Extraction ----

/**
 * Extrai client_ip_address dos headers da request.
 * Prioriza IPv6 conforme recomendação da Meta.
 */
export function extractClientIp(headers: Headers): string | null {
  // Ordem de prioridade para extrair IP real
  const headerNames = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'true-client-ip', // Akamai
  ];

  for (const name of headerNames) {
    const value = headers.get(name);
    if (value) {
      // x-forwarded-for pode ter múltiplos IPs: "client, proxy1, proxy2"
      const ip = value.split(',')[0].trim();
      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        return ip;
      }
    }
  }

  return null;
}

/**
 * Detecta se um IP é IPv6.
 */
export function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

// ---- Parameter Normalization ----
// Seguindo as regras da Meta para normalização antes do hash

/**
 * Normaliza email: trim + lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normaliza telefone: remove tudo exceto dígitos, adiciona código do país (55 BR).
 * NÃO converte para lowercase (são dígitos).
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '');

  // Remove leading zero
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Se parece número BR sem código do país, adiciona 55
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }

  return digits;
}

/**
 * Normaliza nome/sobrenome: trim + lowercase (UTF-8 preservado)
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Normaliza cidade: trim + lowercase + remove espaços e pontuação
 */
export function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/[\s.,'-]/g, '');
}

/**
 * Normaliza estado: trim + lowercase, apenas letras
 */
export function normalizeState(state: string): string {
  return state.trim().toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç]/gi, '').toLowerCase();
}

/**
 * Normaliza CEP: trim + lowercase, sem espaços ou hífens
 */
export function normalizeZip(zip: string): string {
  return zip.trim().replace(/[\s-]/g, '').toLowerCase();
}

/**
 * Normaliza país: ISO 3166-1 alpha-2 code, lowercase
 */
export function normalizeCountry(country: string): string {
  return country.trim().toLowerCase().slice(0, 2);
}

/**
 * Normaliza data de nascimento: YYYYMMDD
 */
export function normalizeDateOfBirth(dob: string): string {
  return dob.replace(/[^\d]/g, '').slice(0, 8);
}

/**
 * Normaliza gênero: primeiro caractere, lowercase (m/f)
 */
export function normalizeGender(gender: string): string {
  return gender.trim().toLowerCase().charAt(0);
}

// ---- Full Parameter Builder ----

export interface CapturedParams {
  fbc?: string;
  fbp?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

/**
 * Extrai todos os parâmetros disponíveis de uma request HTTP.
 * Deve ser chamado o mais cedo possível na jornada do cliente.
 */
export function extractRequestParams(request: Request): CapturedParams {
  const headers = request.headers;
  const cookies = headers.get('cookie') || '';
  const url = new URL(request.url);
  const fbclid = url.searchParams.get('fbclid');

  const params: CapturedParams = {};

  // fbc — do cookie ou gerado a partir do fbclid
  const fbc = extractFbc(cookies, fbclid);
  if (fbc) params.fbc = fbc;

  // fbp — do cookie
  const fbp = extractFbp(cookies);
  if (fbp) params.fbp = fbp;

  // client_ip_address — dos headers
  const ip = extractClientIp(headers);
  if (ip) params.client_ip_address = ip;

  // client_user_agent — do header User-Agent
  const ua = headers.get('user-agent');
  if (ua) params.client_user_agent = ua;

  return params;
}

/**
 * Aplica a normalização correta para um tipo de sinal.
 * Retorna o valor normalizado (NÃO hashado).
 */
export function normalizeSignal(signalType: string, value: string): string {
  if (!value || !value.trim()) return '';

  switch (signalType) {
    case 'email':
      return normalizeEmail(value);
    case 'phone':
      return normalizePhone(value);
    case 'fn':
    case 'ln':
      return normalizeName(value);
    case 'ct':
      return normalizeCity(value);
    case 'st':
      return normalizeState(value);
    case 'zp':
      return normalizeZip(value);
    case 'country':
      return normalizeCountry(value);
    case 'db':
      return normalizeDateOfBirth(value);
    case 'ge':
      return normalizeGender(value);
    default:
      return value.trim();
  }
}
