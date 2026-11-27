import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type GenerativeModel,
} from "firebase/ai";
import {
  firebaseConfig,
  isFirebaseConfigured,
  modelName,
  recaptchaEnterpriseSiteKey,
} from "./firebase-config";

/**
 * Firebase AI Logic 串接層
 * ---------------------------------------------------------------------------
 * 本專案真的透過 Firebase AI Logic JS SDK 呼叫 Gemini：
 *
 *   1. initializeApp(firebaseConfig)            — 初始化 Firebase App
 *   2. initializeAppCheck(app, ReCaptchaEnterprise)     — 啟用 App Check 保護 API
 *   3. getAI(app, { backend: GoogleAIBackend }) — 取得 AI Logic 服務
 *      （Gemini Developer API 後端，並啟用 limited-use App Check tokens
 *       以支援 replay protection）
 *   4. getGenerativeModel(ai, { model, mode })  — 建立 GenerativeModel
 *      mode = InferenceMode.PREFER_ON_DEVICE：
 *      在 Chrome 桌面版優先使用裝置端 Gemini Nano（on-device），
 *      不可用時自動 fallback 到雲端 Gemini 模型 — 這就是 Hybrid AI。
 *   5. model.generateContentStream(prompt)      — 串流產生內容，
 *      逐 chunk 以 chunk.text() 更新 UI。
 *
 * 官方文件：https://firebase.google.com/docs/ai-logic/get-started
 * Hybrid 文件：https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
 */

let cachedApp: FirebaseApp | null = null;
let cachedModel: GenerativeModel | null = null;

function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  const app = initializeApp(firebaseConfig);

  // 本機開發（localhost）時啟用 App Check debug provider，
  // 取得的 debug token 需到 Firebase Console > App Check > Apps >
  // Manage debug tokens 註冊。正式環境不會走這條路徑。
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      true;
  }

  // 啟用 App Check（reCAPTCHA Enterprise）— 必須在呼叫任何 Firebase 服務之前初始化。
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
    isTokenAutoRefreshEnabled: true,
  });

  cachedApp = app;
  return app;
}

function getModel(): GenerativeModel {
  if (cachedModel) return cachedModel;

  const app = getFirebaseApp();

  // 初始化 Firebase AI Logic 服務（Gemini Developer API 後端）。
  const ai = getAI(app, {
    backend: new GoogleAIBackend(),
    useLimitedUseAppCheckTokens: true,
  });

  // Hybrid 推論：優先裝置端 Gemini Nano，不可用時 fallback 雲端模型。
  const model = getGenerativeModel(ai, {
    model: modelName,
    mode: InferenceMode.PREFER_ON_DEVICE,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  });

  cachedModel = model;
  return model;
}

/** 粗略判斷原文主要語言：回傳 "zh" 或 "en"。 */
export function detectLanguage(text: string): "zh" | "en" {
  const cjk = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  return cjk > latin * 0.3 ? "zh" : "en";
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  tldr: string | null;
  raw: string;
}

const MARKER_SUMMARY = "===SUMMARY===";
const MARKER_POINTS = "===KEY_POINTS===";
const MARKER_TLDR = "===TLDR===";

/** 把模型串流中的原始文字解析成三個區塊。 */
export function parseSummary(raw: string): SummaryResult {
  const summaryStart = raw.indexOf(MARKER_SUMMARY);
  const pointsStart = raw.indexOf(MARKER_POINTS);
  const tldrStart = raw.indexOf(MARKER_TLDR);

  // 依出現順序切分（marker 順序固定為 SUMMARY → KEY_POINTS → TLDR）
  const summary =
    summaryStart >= 0
      ? raw
          .slice(summaryStart + MARKER_SUMMARY.length, pointsStart >= 0 ? pointsStart : tldrStart >= 0 ? tldrStart : undefined)
          .trim()
      : "";

  const pointsText =
    pointsStart >= 0
      ? raw
          .slice(pointsStart + MARKER_POINTS.length, tldrStart >= 0 ? tldrStart : undefined)
          .trim()
      : "";

  const tldrText =
    tldrStart >= 0 ? raw.slice(tldrStart + MARKER_TLDR.length).trim() : "";

  const keyPoints = pointsText
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0);

  const tldr =
    tldrText && tldrText !== "NONE" && tldrText !== "無" ? tldrText : null;

  return { summary, keyPoints, tldr, raw };
}

function buildPrompt(article: string): string {
  const lang = detectLanguage(article);
  const tldrInstruction =
    lang === "en"
      ? `The source article is in English, so you MUST provide one English TL;DR sentence in the TLDR section.`
      : `The source article is mainly in Chinese, so write NONE in the TLDR section.`;

  return [
    "You are a bilingual summarization assistant for Traditional Chinese readers in Taiwan.",
    "Read the article below and respond in EXACTLY the following format, keeping the markers verbatim on their own lines. Do not add any text before the first marker or after the last section.",
    "",
    MARKER_SUMMARY,
    "A summary in Traditional Chinese (zh-TW, Taiwan vocabulary), 3 to 5 sentences.",
    "",
    MARKER_POINTS,
    "Exactly 3 key points in Traditional Chinese, one per line, each starting with '- '.",
    "",
    MARKER_TLDR,
    "One English TL;DR sentence, or NONE.",
    "",
    tldrInstruction,
    "Use Taiwan Traditional Chinese vocabulary (for example: 程式, 資訊, 品質, 透過). Do not use Simplified Chinese.",
    "",
    "--- ARTICLE START ---",
    article,
    "--- ARTICLE END ---",
  ].join("\n");
}

/**
 * 透過 Firebase AI Logic 串流產生摘要。
 * 每收到一個 chunk 就呼叫 onPartial，帶入目前解析到一半的結果，讓 UI 即時更新。
 */
export async function streamSummary(
  article: string,
  onPartial: (partial: SummaryResult) => void,
): Promise<SummaryResult> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase 尚未設定：請先在 src/firebase-config.ts 填入你的 Firebase Web App 設定與 reCAPTCHA Enterprise site key（步驟見 README / SETUP-FOR-WILL.md）。",
    );
  }

  const trimmed = article.trim();
  if (trimmed.length < 40) {
    throw new Error("文章太短，請貼上至少 40 個字的英文或中文文章。");
  }

  const model = getModel();

  // Hybrid 模式要求：在使用者互動（按鈕點擊）之後、送出 prompt 之前，
  // 先初始化裝置端模型（若可用會觸發/等待 Gemini Nano 下載）。
  try {
    await model.initializeDeviceModel(() => {
      // 下載進度回呼 — 目前僅保留擴充點，UI 以串流狀態呈現為主。
    });
  } catch {
    // 裝置端模型不可用時忽略，PREFER_ON_DEVICE 會自動 fallback 到雲端。
  }

  const prompt = buildPrompt(trimmed);

  // 真正呼叫 Firebase AI Logic — 串流產生
  const result = await model.generateContentStream(prompt);

  let raw = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      raw += chunkText;
      onPartial(parseSummary(raw));
    }
  }

  const finalResult = parseSummary(raw);
  onPartial(finalResult);
  return finalResult;
}
