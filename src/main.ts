import "./style.css";
import { detectLanguage, streamSummary, type SummaryResult } from "./ai";
import { isFirebaseConfigured } from "./firebase-config";

const SAMPLE_EN = `Hybrid AI is changing how web applications use generative models. Instead of sending every request to the cloud, modern browsers can run a capable language model directly on the user's device. This on-device approach improves privacy because sensitive text never leaves the machine, reduces latency, and can even work offline. However, not every device supports on-device inference, and cloud models remain more powerful for complex tasks. A hybrid strategy combines both worlds: try the on-device model first, and seamlessly fall back to the cloud when needed. Firebase AI Logic makes this pattern practical for web developers by providing a single SDK that can route requests between Chrome's built-in Gemini Nano model and cloud-hosted Gemini models, protected by Firebase App Check. For products like summarization tools, hybrid inference offers a pragmatic balance of cost, privacy, speed, and quality.`;

const SAMPLE_ZH = `近年來，生成式人工智慧快速走入日常應用，從寫作輔助、程式開發到文件摘要，都能看到大型語言模型的參與。對許多使用者而言，最花時間的往往不是取得資訊，而是從大量文字中快速抓出重點。雙語摘要工具的價值正在於此：它能把冗長的英文或中文文章，濃縮成短短幾句繁體中文摘要，並條列出最重要的觀點，幫助讀者在幾秒內判斷一篇文章是否值得細讀。隨著瀏覽器裝置端推論技術成熟，這類工具未來還能進一步兼顧隱私與速度，讓敏感文件不必離開使用者的裝置也能完成摘要。`;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app not found");

app.innerHTML = `
  <main class="page">
    <header class="hero">
      <p class="eyebrow">#BuildHybridAI 2026 · Firebase AI Logic · Hybrid Inference</p>
      <h1>AI 雙語摘要助手</h1>
      <p class="subtitle">
        貼上英文或中文文章，透過 Firebase AI Logic 串流產生
        <strong>繁中摘要</strong>、<strong>3 個重點</strong>，
        英文原文再附一句 <strong>英文 TL;DR</strong>。
        在 Chrome 桌面版優先使用裝置端 Gemini Nano，不可用時自動切換雲端 Gemini。
      </p>
      <p id="configBanner" class="banner" hidden></p>
    </header>

    <section class="card">
      <label for="articleInput" class="label">文章內容（英文或中文）</label>
      <textarea id="articleInput" rows="10" placeholder="在這裡貼上文章文字，至少 40 個字…"></textarea>
      <div class="row">
        <span id="charCount" class="muted">0 字</span>
        <span id="langHint" class="muted"></span>
        <span class="spacer"></span>
        <button id="sampleEnBtn" type="button" class="btn btn-ghost">英文範例</button>
        <button id="sampleZhBtn" type="button" class="btn btn-ghost">中文範例</button>
        <button id="clearBtn" type="button" class="btn btn-ghost">清除</button>
        <button id="summarizeBtn" type="button" class="btn btn-primary">產生摘要</button>
      </div>
      <p id="status" class="status" role="status" aria-live="polite"></p>
      <p id="errorBox" class="error" role="alert" hidden></p>
    </section>

    <section id="resultSection" class="results" hidden>
      <article class="card">
        <h2>繁中摘要</h2>
        <p id="summaryOut" class="output"></p>
      </article>
      <article class="card">
        <h2>重點條列</h2>
        <ul id="pointsOut" class="points"></ul>
      </article>
      <article id="tldrCard" class="card" hidden>
        <h2>English TL;DR</h2>
        <p id="tldrOut" class="output"></p>
      </article>
    </section>

    <footer class="footer">
      <p>
        Powered by Firebase AI Logic (Gemini Developer API backend) with App Check ·
        Hybrid mode: <code>InferenceMode.PREFER_ON_DEVICE</code> — Gemini Nano on-device first, cloud fallback.
      </p>
    </footer>
  </main>
`;

function must<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

const input = must<HTMLTextAreaElement>("#articleInput");
const charCount = must<HTMLElement>("#charCount");
const langHint = must<HTMLElement>("#langHint");
const statusEl = must<HTMLElement>("#status");
const errorBox = must<HTMLElement>("#errorBox");
const summarizeBtn = must<HTMLButtonElement>("#summarizeBtn");
const resultSection = must<HTMLElement>("#resultSection");
const summaryOut = must<HTMLElement>("#summaryOut");
const pointsOut = must<HTMLUListElement>("#pointsOut");
const tldrCard = must<HTMLElement>("#tldrCard");
const tldrOut = must<HTMLElement>("#tldrOut");
const configBanner = must<HTMLElement>("#configBanner");

if (!isFirebaseConfigured()) {
  configBanner.hidden = false;
  configBanner.textContent =
    "提示：Firebase 尚未設定。目前是展示模式，請先依 README 在 src/firebase-config.ts 填入你的 Firebase 設定與 reCAPTCHA v3 site key，才能實際呼叫 Firebase AI Logic。";
}

function updateMeta(): void {
  const text = input.value;
  charCount.textContent = `${text.length} 字`;
  langHint.textContent =
    text.trim().length >= 10
      ? detectLanguage(text) === "en"
        ? "偵測語言：英文（將附英文 TL;DR）"
        : "偵測語言：中文"
      : "";
}

input.addEventListener("input", updateMeta);

must<HTMLButtonElement>("#sampleEnBtn").addEventListener("click", () => {
  input.value = SAMPLE_EN;
  updateMeta();
  input.focus();
});
must<HTMLButtonElement>("#sampleZhBtn").addEventListener("click", () => {
  input.value = SAMPLE_ZH;
  updateMeta();
  input.focus();
});
must<HTMLButtonElement>("#clearBtn").addEventListener("click", () => {
  input.value = "";
  updateMeta();
  resultSection.hidden = true;
  errorBox.hidden = true;
  statusEl.textContent = "";
});

function render(partial: SummaryResult): void {
  resultSection.hidden = false;
  summaryOut.textContent = partial.summary || "…";
  pointsOut.innerHTML = "";
  for (const point of partial.keyPoints) {
    const li = document.createElement("li");
    li.textContent = point;
    pointsOut.appendChild(li);
  }
  if (partial.keyPoints.length === 0) {
    const li = document.createElement("li");
    li.textContent = "…";
    pointsOut.appendChild(li);
  }
  if (partial.tldr) {
    tldrCard.hidden = false;
    tldrOut.textContent = partial.tldr;
  } else {
    tldrCard.hidden = true;
    tldrOut.textContent = "";
  }
}

summarizeBtn.addEventListener("click", async () => {
  errorBox.hidden = true;
  statusEl.textContent = "正在透過 Firebase AI Logic 串流產生摘要…";
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = "產生中…";
  try {
    await streamSummary(input.value, render);
    statusEl.textContent = "完成。結果由 Firebase AI Logic 即時串流產生。";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorBox.hidden = false;
    errorBox.textContent = message;
    statusEl.textContent = "";
  } finally {
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = "產生摘要";
  }
});

updateMeta();
