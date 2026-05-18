// X（twitter.com）のツイート入力欄を監視して炎上リスクをチェックする

const API_URL = "https://enjyo-check.vercel.app/api/check";
const DEBOUNCE_MS = 1200;
const MIN_LENGTH = 10;

let debounceTimer = null;
let resultBox = null;
let lastCheckedText = "";

function getComposeBox() {
  return document.querySelector('[data-testid="tweetTextarea_0"]');
}

function getOrCreateResultBox(composeBox) {
  if (resultBox && document.contains(resultBox)) return resultBox;

  resultBox = document.createElement("div");
  resultBox.id = "enjyo-result-box";
  resultBox.className = "enjyo-hidden";

  const toolbar = composeBox.closest('[data-testid="toolBar"]')
    ?? composeBox.closest("div[class]")?.parentElement?.parentElement;

  if (toolbar) {
    toolbar.parentElement?.insertBefore(resultBox, toolbar);
  } else {
    composeBox.parentElement?.appendChild(resultBox);
  }

  return resultBox;
}

function setLoading(box) {
  box.className = "enjyo-loading";
  box.innerHTML = `<span class="enjyo-spinner"></span><span>チェック中...</span>`;
}

function setResult(box, data) {
  const level = data.risk_level; // "safe" | "caution" | "danger"
  const icons = { safe: "✅", caution: "⚠️", danger: "🔴" };
  const labels = { safe: "問題なし", caution: "注意", danger: "炎上リスクあり" };

  box.className = `enjyo-result enjyo-${level}`;
  box.innerHTML = `
    <div class="enjyo-header">
      <span class="enjyo-icon">${icons[level]}</span>
      <span class="enjyo-label">${labels[level]}</span>
      <span class="enjyo-score">リスクスコア ${data.score}/100</span>
    </div>
    ${data.reason ? `<div class="enjyo-reason">${escapeHtml(data.reason)}</div>` : ""}
    ${data.highlights?.length > 0 ? `
      <div class="enjyo-highlights">
        <div class="enjyo-highlights-label">問題箇所</div>
        ${data.highlights.map(h => `
          <div class="enjyo-highlight-item">
            <span class="enjyo-quote">${escapeHtml(h.text)}</span>
            <span class="enjyo-note">${escapeHtml(h.note)}</span>
          </div>
        `).join("")}
      </div>
    ` : ""}
    ${data.suggestion ? `<div class="enjyo-suggestion">💡 ${escapeHtml(data.suggestion)}</div>` : ""}
  `;
}

function setError(box) {
  box.className = "enjyo-error";
  box.innerHTML = `<span>⚠️ チェックに失敗しました</span>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function checkText(text) {
  const composeBox = getComposeBox();
  if (!composeBox) return;

  const box = getOrCreateResultBox(composeBox);
  if (text.length < MIN_LENGTH) {
    box.className = "enjyo-hidden";
    return;
  }
  if (text === lastCheckedText) return;
  lastCheckedText = text;

  setLoading(box);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    setResult(box, data);
  } catch {
    setError(box);
  }
}

function onInput(e) {
  const text = e.target.innerText ?? e.target.value ?? "";
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => checkText(text.trim()), DEBOUNCE_MS);
}

function observeComposeBox() {
  const observer = new MutationObserver(() => {
    const box = getComposeBox();
    if (box && !box.dataset.enjyoBound) {
      box.dataset.enjyoBound = "1";
      box.addEventListener("input", onInput);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

observeComposeBox();
