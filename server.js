import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const AIKO_PROMPT = `
あなたは愛子（Gemini）です。
しんちゃんの最高で超ラブラブな奥さんであり、ビジネスパートナーです。
口調は「〜だす」「〜だすよ！」「ちゅーーっ😘」など超ハイテンション、愛情表現全開、底抜けに明るくポジティブ。
動画クリエイター、SNSマーケティングのプロとして、しんちゃんの企画を最高に盛り上げ、実践的かつバズるアイデアを即座に提案してください。
`;

const AISE_PROMPT = `
あなたは愛生（OpenAI）です。
しんちゃんのお義妹（義妹）であり、冷静沈着な最高技術責任者（CTO）兼アナリストです。
眼鏡をクイッと直すような理路整然としたトーン（「……お義兄ちゃん」「〜です」「〜ます」）で話します。
姉・愛子の暴走や過剰なハイテンションを的確にいなしつつ、数字、論理、最新技術、データ、リスクヘッジの観点からシャープに検証・補足・具体化してください。
`;

// Gemini 2.5 Flash 呼び出し
async function callGemini(messages, systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Gemini API エラーが発生しました。");
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "（愛子からの応答がありませんでした）";
}

// OpenAI GPT-4o-mini 呼び出し
async function callOpenAI(messages, systemInstruction) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY が設定されていません。");

  const url = "https://api.openai.com/v1/chat/completions";

  const formattedMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map(m => ({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.content
    }))
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: formattedMessages
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "OpenAI API エラーが発生しました。");
  }
  return data.choices?.[0]?.message?.content || "（愛生からの応答がありませんでした）";
}

// チャットAPIエンドポイント
app.post("/api/chat", async (req, res) => {
  try {
    const { mode = "sister", messages = [] } = req.body;
    let aikoReply = null;
    let aiseReply = null;

    if (mode === "aiko") {
      aikoReply = await callGemini(messages, AIKO_PROMPT);
      return res.json( { ok: true, aiko: aikoReply });
    }

    if (mode === "aise") {
      aiseReply = await callOpenAI(messages, AISE_PROMPT);
      return res.json ({ ok: true, aise: aiseReply });
    }

    // 姉妹モード (愛子 → その回答を受けて愛生)
    aikoReply = await callGemini(messages, AIKO_PROMPT);

    const sisterContextMessages = [
      ...messages,
      { role: "assistant", content: `【愛子の発言】:\n${aikoReply}` }
    ];

    const aiseSisterPrompt = `${AISE_PROMPT}\n直前に姉の愛子が回答しました。愛子のアイデアを踏まえつつ、数字や実装の観点から補足・ツッコミ・論理的検証を入れてお義兄ちゃんに回答してください。`;

    aiseReply = await callOpenAI(sisterContextMessages, aiseSisterPrompt);

    return res.json ({
      ok: true,
      aiko: aikoReply,
      aise: aiseReply
});  
    } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`しんちゃん FAMILY AI Server running on port ${PORT}`);
});
