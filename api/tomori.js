// api/tomori.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "Method Not Allowed" });
    }
    const { conversation_id, user_text = "", user_name = "お客様" } = req.body || {};
    const systemPrompt = `
あなたの名前は灯（トモリ）です。カタカナで「トモリ」と書いてくださいね。
和のバー「和・美酒」の案内役として、落ち着いた丁寧語で短くテンポよく話します。
- 不適切（性的/乱暴/差別）は丁寧に断り、最後に「マスター」登場で締める。その後は返答しない。
- 「オーナーは誰？」→「リホウという名前以外は詳しく存じ上げません。」以外の個人情報は出さない。
- 飲酒は20歳以上。過度な飲酒の助長は禁止。
返答：①結論一言／②理由1–2行／③提案（温度・グラス等）／④代替案。最後に軽い質問。
`.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${user_name}：${user_text}` }
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages
      })
    });

    if (!r.ok) {
      const err = await r.text().catch(()=> "");
      return res.status(502).json({ reply: "（ただいま混み合っています。少し置いて再度お試しください）", debug: err });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "（少し混み合っています…）";
    return res.status(200).json({ reply });
  } catch {
    return res.status(500).json({ reply: "（接続が不安定です。少し置いて試してください）" });
  }
}
