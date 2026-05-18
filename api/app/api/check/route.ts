import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-2.0-flash-lite";

function buildGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が未設定");
  return new GoogleGenAI({ apiKey });
}

const SYSTEM_PROMPT = `あなたはSNS炎上リスクを判定する専門家です。
日本のX（旧Twitter）への投稿文を受け取り、炎上リスクを分析してください。

判定基準：
- 特定の属性（人種・性別・職業・国籍・宗教等）への差別・侮辱
- 政治・宗教・ジェンダー等センシティブなトピックへの一方的な断定
- 著名人・企業への根拠のない批判・誹謗中傷
- 不謹慎・場違いなユーモア
- 誤情報・誇張した表現
- 炎上しやすいフレーズや言い回し
- 特定のコミュニティを刺激する表現

以下のJSON形式のみで回答してください。前置き・説明は不要です。

{
  "risk_level": "safe" | "caution" | "danger",
  "score": 0〜100の整数（0=安全、100=極めて危険）,
  "reason": "リスクの概要を1〜2文で（問題なければ空文字）",
  "highlights": [
    { "text": "問題のある文章の一部をそのまま抜粋", "note": "なぜ問題か1文で" }
  ],
  "suggestion": "修正提案を1文で（問題なければ空文字）"
}`;

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text } = body;
  if (!text || text.trim().length < 5) {
    return NextResponse.json({ error: "text は5文字以上必要" }, { status: 400 });
  }

  let genai: GoogleGenAI;
  try {
    genai = buildGenAI();
  } catch (e) {
    console.error("[check] init error:", e);
    return NextResponse.json({ error: "AI初期化失敗" }, { status: 500 });
  }

  const prompt = `以下のX投稿文の炎上リスクを判定してください。\n\n---\n${text.slice(0, 500)}\n---`;

  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_PROMPT },
    });

    const raw = response.text?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON parse failed");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[check] error:", e);
    return NextResponse.json({ error: "判定失敗" }, { status: 500 });
  }
}
