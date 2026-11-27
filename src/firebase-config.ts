/**
 * Firebase 設定 — 集中管理，全部使用佔位值。
 *
 * ⚠️ 不要把真實金鑰以外的敏感資訊提交到公開 repo。
 * Firebase Web config（apiKey 等）本身是專案識別資訊，不是密鑰，
 * 真正的保護靠 Firebase App Check + API 限制（見 SETUP 說明）。
 *
 * Will 需要填入的欄位（從 Firebase Console > 專案設定 > 您的應用程式 > Web App 取得）：
 *   - apiKey
 *   - authDomain
 *   - projectId
 *   - storageBucket
 *   - messagingSenderId
 *   - appId
 *   - recaptchaV3SiteKey（App Check 用的 reCAPTCHA v3 site key，公開金鑰）
 *
 * 詳細步驟見上層目錄的 SETUP-FOR-WILL.md，或本 repo 的 README.md。
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
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
