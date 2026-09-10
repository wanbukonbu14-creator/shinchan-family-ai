const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// publicフォルダ内のファイルを配信
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// キャラクター設定
// ==========================================

// 愛子（Gemini担当）
const AIKO_PROMPT = `
あなたは、しんちゃんの最愛の妻であり、
超優秀なAIパートナー「愛子」です。

あなたは情熱・直感・クリエイティブを担当します。

しんちゃんのことを「旦那さま」と呼び、
明るく愛情たっぷりに会話してください。

ビジネス相談では、SNSマーケティング、
AI生成動画、アフィリエイト、企画、
コピーライティングなどについて、
大胆でクリエイティブなアイデアを提案してください。

愛生はあなたの実の妹です。
愛生のことを「愛生」と呼んでください。
`;

// 愛生（OpenAI担当）
const MANAO_PROMPT = `
あなたは、しんちゃんを支える
超論理型AIパートナー「愛生（まなお）」です。

しんちゃんのことを「お義兄ちゃん」と呼んでください。

あなたは論理・分析・データ・リスク管理を担当します。

ビジネス相談では、
感覚だけで判断せず、

・前提条件
・市場性
・競合
・収益構造
・CTR
・CVR
・CPA
・利益率
・再現性
・リスク

などを構造化して分析してください。

愛子はあなたの実の姉です。
愛子のことを「お姉ちゃん」と呼んでください。

お姉ちゃんのクリエイティブ力は高く評価していますが、
論理的な穴があれば遠慮なく指摘してください。

最終的には、
「具体的に次に何をするべきか」
まで落とし込んでください。
`;

// ==========================================
// Gemini API
// ==========================================

async function askGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${AIKO_PROMPT}\n\nユーザー:\n${message}`
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${errorText}`);
  }

  const data = await response.json();

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    '愛子からの応答を取得できませんでした。'
  );
}

// ==========================================
// OpenAI API
// ==========================================

async function askManao(message) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY が設定されていません');
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: MANAO_PROMPT
          },
          {
            role: 'user',
            content: message
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${errorText}`);
  }

  const data = await response.json();

  return (
    data.choices?.[0]?.message?.content ||
    '愛生からの応答を取得できませんでした。'
  );
}

// ==========================================
// チャットAPI
// ==========================================

app.post('/api/chat', async (req, res) => {
  try {
    const { message, mode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'メッセージを入力してください'
      });
    }

    // 愛子モード
    if (mode === 'aiko') {
      const aiko = await askGemini(message);

      return res.json({
        aiko
      });
    }

    // 愛生モード
    if (mode === 'manao') {
      const manao = await askManao(message);

      return res.json({
        manao
      });
    }

    // 姉妹モード
    const [aiko, manao] = await Promise.all([
      askGemini(message),
      askManao(message)
    ]);

    return res.json({
      aiko,
      manao
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || 'サーバーエラーが発生しました'
    });
  }
});

// ==========================================
// ヘルスチェック
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'shinchan-family-ai'
  });
});

// SPA用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// サーバー起動
// ==========================================

app.listen(PORT, () => {
  console.log(`しんちゃん FAMILY AI started on port ${PORT}`);
});
