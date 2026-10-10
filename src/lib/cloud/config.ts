// ============================================================
// Cloud Service Configuration — reads from .env
// ============================================================
// Environment variables are loaded automatically by Next.js.
// Copy .env.example as .env and fill in your values.
//
// WorkBuddy Cloud: fill after running cloud-service activation
// SovernStack: fill with your API key from the playground
// ============================================================

export interface CloudPublicConfig {
  endpoint: string;
  publishableKey: string;
  oauthRelayBaseUrl?: string;
}

// === WorkBuddy Cloud config (from .env) ===
// These are safe for client-side (publishableKey carries no permissions)
export const CLOUD_CONFIG: CloudPublicConfig = {
  endpoint: process.env.WORKBUDDY_CLOUD_ENDPOINT ?? '',
  publishableKey: process.env.WORKBUDDY_CLOUD_PUBLISHABLE_KEY ?? '',
  // oauthRelayBaseUrl: '',  // only needed for WeChat QR login
};

// === SovernStack API config (from .env, server-side only) ===
// SovernStack uses custom headers (not OpenAI format):
//   POST {baseUrl}/llm/chat
//   x-user-id: <apiKey>
//   x-model: <model>
export const SOVERNSTACK_CONFIG = {
  apiKey: process.env.SOVERNSTACK_API_KEY ?? '',
  baseUrl: process.env.SOVERNSTACK_BASE_URL ?? 'https://api.sovernstack.com',
  model: process.env.SOVERNSTACK_MODEL ?? 'GPT-OSS 120B',
  endpoint: '/llm/chat',
};

/** True when WorkBuddy Cloud is configured */
export function isCloudConfigured(): boolean {
  return !!(CLOUD_CONFIG.endpoint && CLOUD_CONFIG.publishableKey);
}

/** True when SovernStack API key is set */
export function isSovernStackConfigured(): boolean {
  return !!SOVERNSTACK_CONFIG.apiKey;
}

/**
 * Returns the current LLM mode:
 *   "mock"   — using mock data (no API calls)
 *   "cloud"  — using WorkBuddy Cloud SDK
 *   "sovern" — using SovernStack API (GPT-OSS 120B)
 *
 * Priority: cloud > sovern > mock
 */
export function getLLMMode(): 'mock' | 'cloud' | 'sovern' {
  if (isCloudConfigured()) return 'cloud';
  if (isSovernStackConfigured()) return 'sovern';
  return 'mock';
}
