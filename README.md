# AI 雙語摘要助手 — Bilingual Summary Assistant

> A single-page web app built for **Devpost #BuildHybridAI 2026**.
> Paste an English or Chinese article and get, via streaming:
> 1. a **Traditional Chinese summary** (3–5 sentences),
> 2. **3 key points** in Traditional Chinese, and
> 3. a one-sentence **English TL;DR** when the source is English.

**Platform:** Web (Chrome) with Gemini Nano — Hybrid AI
**Stack:** Vite + TypeScript + Firebase AI Logic (JavaScript SDK)

---

## How Firebase AI Logic is used in this project

This app **really calls Firebase AI Logic** from the browser — there is no
custom backend and no direct Gemini API key in the code.

All AI Logic code lives in [`src/ai.ts`](src/ai.ts) and the configuration in
[`src/firebase-config.ts`](src/firebase-config.ts):

1. **Initialize Firebase**
   ```ts
   import { initializeApp } from "firebase/app";
   const app = initializeApp(firebaseConfig);
   ```

2. **Enable App Check** (required by Firebase AI Logic to protect the Gemini API)
   ```ts
   import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
   initializeAppCheck(app, {
     provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
     isTokenAutoRefreshEnabled: true,
   });
   ```
   On `localhost`, the App Check debug provider is enabled automatically
   (`self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`); the debug token printed in
   the browser console must be registered in
   Firebase Console → App Check → Apps → Manage debug tokens.

3. **Initialize the AI Logic service** with the Gemini Developer API backend
   and limited-use App Check tokens (replay protection):
   ```ts
   import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
   const ai = getAI(app, {
     backend: new GoogleAIBackend(),
     useLimitedUseAppCheckTokens: true,
   });
   ```

4. **Create a hybrid model instance** — this is the Hybrid AI core of the app:
   ```ts
   const model = getGenerativeModel(ai, {
     mode: InferenceMode.PREFER_ON_DEVICE,
     inCloudParams: { model: "gemini-3.5-flash-lite" }, // configurable in src/firebase-config.ts
   });
   ```
   Note: in hybrid mode the SDK ignores top-level `model`; the cloud model
   must be set via `inCloudParams` (otherwise the SDK falls back to its
   hard-coded default cloud model).
   ```
   `PREFER_ON_DEVICE` means: on Chrome desktop, prefer the on-device
   **Gemini Nano** model via the Prompt API; if it is unavailable, fall back
   seamlessly to the cloud-hosted Gemini model. Before sending a prompt, the
   app calls `model.initializeDeviceModel()` on the user's button click, as
   required by the hybrid workflow.

5. **Stream the summary**
   ```ts
   const result = await model.generateContentStream(prompt);
   for await (const chunk of result.stream) {
     const text = chunk.text(); // append to UI in real time
   }
   ```
   The prompt asks the model to return three clearly delimited sections
   (`===SUMMARY===`, `===KEY_POINTS===`, `===TLDR===`), which the app parses
   incrementally (`parseSummary` in `src/ai.ts`) and renders into three cards
   while streaming.

Official references:
- Get started: https://firebase.google.com/docs/ai-logic/get-started
- Hybrid (Web): https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- Supported models: https://firebase.google.com/docs/ai-logic/models

---

## Quick start (local)

### Prerequisites
- Node.js 20+ and npm
- A Firebase project with **AI Logic enabled** (see Setup below)

### Install & run
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

---

## Setup — what YOU must fill in

The repo ships with placeholder values only. **No real keys are committed.**

Edit [`src/firebase-config.ts`](src/firebase-config.ts) and replace:

| Field | Where to get it |
|---|---|
| `apiKey` | Firebase Console → Project settings → Your apps → Web app |
| `authDomain` | Same as above |
| `projectId` | Same as above |
| `storageBucket` | Same as above |
| `messagingSenderId` | Same as above |
| `appId` | Same as above |
| `recaptchaEnterpriseSiteKey` | reCAPTCHA Enterprise site key registered for App Check (public key) |
| `modelName` (optional) | Any model your project can access — see supported models doc |

Full step-by-step Firebase Console instructions (create project, enable
AI Logic, register a Web App, set up App Check with reCAPTCHA Enterprise, register a
debug token for localhost) are in the maintainer setup note that accompanies
this project.

> Note: The Firebase Web config is a project identifier, not a secret.
> Protection comes from App Check enforcement + API restrictions — do not
> rely on hiding the config.

---

## Project structure

```
.
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── LICENSE            # MIT
└── src/
    ├── firebase-config.ts   # ← fill in your Firebase config here
    ├── ai.ts                # Firebase AI Logic: App Check, hybrid model, streaming, parsing
    ├── main.ts              # UI wiring
    └── style.css
```

## How it works (user flow)

1. Paste an English or Chinese article (≥ 40 characters), or try a sample.
2. Click **產生摘要**.
3. The app detects the main language, builds a structured prompt, and streams
   the model response through Firebase AI Logic.
4. Results appear live in three cards: 繁中摘要 / 重點條列 / English TL;DR
   (TL;DR card only appears for English sources).

## Demo & submission notes (#BuildHybridAI 2026)

- Category: Web Chrome with Gemini Nano (Hybrid — on-device preferred, cloud fallback)
- Live URL: _to be added after deployment_
- Demo video (≤ 3 min, public YouTube, English or English subtitles): _to be added_

## License

MIT — see [LICENSE](LICENSE).
