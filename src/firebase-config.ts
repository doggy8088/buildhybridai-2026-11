/**
 * Firebase 設定 — 集中管理。
 *
 * Firebase Web config（apiKey 等）本身是專案識別資訊，不是密鑰，
 * 真正的保護靠 Firebase App Check + API 限制（見 SETUP 說明）。
 *
 * 已填入（2026-11-27，專案 bilingual-summary-assistant）：
 *   - apiKey / authDomain / projectId / storageBucket / messagingSenderId / appId
 * 尚未填入：
 *   - recaptchaV3SiteKey（App Check 用的 reCAPTCHA v3 site key，公開金鑰）
 *     需完成 AI Logic 精靈第 2 步 / App Check 設定後取得再填入。
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

/** App Check — reCAPTCHA v3 site key（公開金鑰，可放前端）。 */
export const recaptchaV3SiteKey = "YOUR_RECAPTCHA_V3_SITE_KEY";

/**
 * 使用的 Gemini 模型。
 * 預設值為 Firebase AI Logic 官方文件目前的穩定版範例模型。
 * 若你的專案尚未開通此模型，可在 Firebase AI Logic 文件的
 * 「supported models」頁面改選任一可用的 Flash 模型。
 */
export const modelName = "gemini-4-hydrogen";

/** 檢查設定是否仍為佔位值（尚未填入真實設定）。 */
export function isFirebaseConfigured(): boolean {
  return (
    !firebaseConfig.apiKey.startsWith("YOUR_") &&
    !firebaseConfig.projectId.startsWith("YOUR_") &&
    !firebaseConfig.appId.startsWith("YOUR_") &&
    recaptchaV3SiteKey !== "YOUR_RECAPTCHA_V3_SITE_KEY"
  );
}
