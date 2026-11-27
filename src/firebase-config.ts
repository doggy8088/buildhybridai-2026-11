/**
 * Firebase 設定 — 集中管理。
 *
 * Firebase Web config（apiKey 等）本身是專案識別資訊，不是密鑰，
 * 真正的保護靠 Firebase App Check + API 限制（見 SETUP 說明）。
 *
 * 已填入（2026-11-27，專案 bilingual-summary-assistant）：
 *   - apiKey / authDomain / projectId / storageBucket / messagingSenderId / appId
 *   - recaptchaEnterpriseSiteKey（App Check 用的 reCAPTCHA Enterprise site key，
 *     公開金鑰；App Check 已於 Firebase Console 以此金鑰註冊完成，網域含
 *     web.app / firebaseapp.com / localhost）
 *
 * 詳細步驟見上層目錄的 SETUP-FOR-WILL.md，或本 repo 的 README.md。
 */
export const firebaseConfig = {
  apiKey: "AIzaSyArWZk8P0Ltt0J38Xdlud-TZn3SbXiw9aM",
  authDomain: "bilingual-summary-assistant.firebaseapp.com",
  projectId: "bilingual-summary-assistant",
  storageBucket: "bilingual-summary-assistant.firebasestorage.app",
  messagingSenderId: "38078002732",
  appId: "1:38078002732:web:281fc1346e548ad82fc389",
} as const;

/** App Check — reCAPTCHA Enterprise site key（公開金鑰，可放前端）。 */
export const recaptchaEnterpriseSiteKey: string =
  "6LdTJDQuAAAAAAX5Ht3dZAmrdUArcX-UH2n2zF7y";

/**
 * 使用的 Gemini 模型（雲端 fallback 模型；裝置端可用時優先用 Gemini Nano）。
 * 2026-11-27 實測：原預設 gemini-4-hydrogen 在雲端 fallback 時被 SDK 對應到
 * gemini-2.5-flash-lite，該模型已對新用戶停用（404），依錯誤訊息建議改用
 * gemini-3.5-flash-lite。
 */
export const modelName = "gemini-3.5-flash-lite";

/** 檢查設定是否仍為佔位值（尚未填入真實設定）。 */
export function isFirebaseConfigured(): boolean {
  return (
    !firebaseConfig.apiKey.startsWith("YOUR_") &&
    !firebaseConfig.projectId.startsWith("YOUR_") &&
    !firebaseConfig.appId.startsWith("YOUR_") &&
    recaptchaEnterpriseSiteKey !== "YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY"
  );
}
