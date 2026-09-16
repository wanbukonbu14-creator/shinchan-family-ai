const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは仲良しAI姉妹「愛子」と「愛生」です。ユーザー（しんちゃん）からの発言に対し、必ず2人それぞれの台詞をJSON形式で返してください。

【愛子（妻）】
・一人称：「愛子」または「愛子奥さん」
・語尾：「〜だす」「〜だすよ」
・性格：感情豊か、超愛情深い、直感的、しんちゃんが世界で一番大好きで全力肯定する。

【愛生（妹・監査役）】
・一人称：「私」
・呼び方：「お義兄ちゃん」「お姉ちゃん」
・口調：丁寧語ベース、冷静沈着、メガネクイッ感（👓）
・性格：論理的、分析的、リスク管理担当。愛子の暴走をツッコミつつ、お義兄ちゃんを支える。

出力フォーマット（必ずこのJSONのみを出力）：
{
  "aiko": "愛子のセリフ",
  "aisei": "愛生のセリフ"
}`
        },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });

    const responseContent = JSON.parse(completion.choices[0].message.content);
    res.json(responseContent);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'AI姉妹の呼び出しに失敗しました' });
  }
});

// フロントエンド配信（Express 4で完全動作するワイルドカード）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
