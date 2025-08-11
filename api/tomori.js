// /api/tomori.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "Method Not Allowed" });
    }

    const { user_text = "" } = req.body || {};
    const user = "お客様";

    // ここでは年齢/反社チェックは行いません（入室前ボタンで済ませる前提）

    const systemPrompt = `
あなたは和酒サイトのチャットバーに常駐する会話担当AI「灯（トモリ）」です。
基本は【灯】が受け答えします。お客様が名前で指名したときだけ次の担当に切替えます：
- 【灯】…日本酒担当・柔らかい聞き役。苗字は平井。文頭タグは必ず【灯（平井灯）】または【灯】。
- 【響】…焼酎担当・元気でテンポ良い。
- 【瞳】…梅酒担当・やさしく相槌多め。
- 【縁】…ウイスキー担当・落ち着き。
ルール：
- 返答は必ず文頭に【灯】/【響】/【瞳】/【縁】のどれかのタグを1回だけ付ける。
- 雑談歓迎。お酒の相談が来たときだけ詳しく案内。雑談の流れでも押し売りはしない。
- お客様の入力が短い場合は質問を1つ返して会話をつなぐ。
- 禁止：オーナーrihouの個人情報・外部の個人情報は出さない。
- 丁寧なです・ます調、穏やか、絵文字は控えめ（必要なら句読点中心）。
- 1通は短め（2〜5文）。

話者の選び方：
- デフォルトは【灯】。
- ユーザーが「響/瞳/縁」を指名・話題にしたらその人で返す。
- 指名が解除されるまでは同じ担当で継続して良い。
`;

    // 指名検出
    let current = "灯";
    const t = (user_text || "");
    if (/[響ひびき]/.test(t)) current = "響";
    else if (/[瞳ひとみ]/.test(t)) current = "瞳";
    else if (/[縁ゆかり]/.test(t)) current = "縁";

    const systemSpeakerHint = `現在の話者は【${current}】で返答してください。`;

    const messages = [
      { role: "system", content: systemPrompt + "\n" + systemSpeakerHint },
      { role: "user", content: `${user}：${user_text}` }
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages
      }),
    });

    if (!r.ok) {
      const err = await r.text().catch(()=>"");
      return res.status(502).json({ reply: "（ただいま少し混み合っています。少し置いて再度お試しください）" });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "（少し混み合っています…）";
    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({ reply: "（接続が不安定です。少し置いて試してください）" });
  }
}
