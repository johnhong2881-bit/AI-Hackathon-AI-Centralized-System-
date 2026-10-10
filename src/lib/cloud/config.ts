// ============================================================
// WorkBuddy Cloud Service Configuration
// ============================================================
// These values come from the `workbuddy_cloud_service` activation
// result's `publicConfig` field. After activation, copy the
// `endpoint` and `publishableKey` values here.
//
// `publishableKey` is safe to ship in front-end code (carries no
// permissions; the server enforces an exact Origin match).
// `endpoint` is the cloud service base URL.
//
// To activate: ask the AI assistant to run
//   workbuddy_cloud_service with action="activate"
// Then paste the returned publicConfig values below.
// ============================================================

export interface CloudPublicConfig {
  endpoint: string;
  publishableKey: string;
  oauthRelayBaseUrl?: string;
}

// === Fill these after running cloud-service activation ===
export const CLOUD_CONFIG: CloudPublicConfig = {
  endpoint: '',        // e.g. 'https://xxx.cloud.weixin.qq.com'
  publishableKey: '',  // e.g. 'wbpk_xxxxxxxxxxxxxx'
  // oauthRelayBaseUrl: '',  // only needed for WeChat QR login
};

/** True when cloud config has been filled in and real LLM calls can be made. */
export function isCloudConfigured(): boolean {
  return !!(CLOUD_CONFIG.endpoint && CLOUD_CONFIG.publishableKey);
}
