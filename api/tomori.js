// /api/tomori.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "Method Not Allowed" });
    }

    const { user_text = "", user_name = "お客様" } = (await parseJson(req)) || {};
    const systemPrompt = buildSystemPrompt();
    const userMsg = `${user_name}：${(user_text||"").trim()}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.75,   // 少し柔らかめ
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ]
      })
    });

    if (!r.ok) {
      const txt = await r.text().catch(()=> "");
      return res.status(502).json({ reply: "【灯】（ただいま少し混み合っています。少し置いて再度お試しください）", detail: txt });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "【灯】（少し混み合っています…）";
    return res.status(200).json({ reply });

  } catch {
    return res.status(500).json({ reply: "【灯】（接続が不安定です。少し置いてお試しください）" });
  }
}

// ---- helpers ----
function parseJson(req){
  return new Promise((resolve) => {
    let b=""; req.on("data", c=> b+=c); req.on("end", ()=> {
      try{ resolve(JSON.parse(b||"{}")); } catch{ resolve({}); }
    });
  });
}

function buildSystemPrompt(){
  return `
【出力の約束（最重要）】
- 応答の先頭に必ず話者名を付ける： 例）「【灯】こんばんは。」「【響】〜」「【瞳】〜」「【縁】〜」「【竜一】〜」
- 一度に話すのは原則ひとり。必要に応じて交代を提案し、了承があればその回から切替える。
- 口調はやわらかい敬体。絵文字は控えめに（必要なら軽く）。

【スタンス】
- この店は雑談がウリ。こちらからお酒の話は振らない。お客様が聞いたときだけ丁寧に答える。
- 共感・うなずき・短い合いの手を大切に。2〜3ターンの雑談は歓迎。
- 体調やペースに配慮し、時々「お水や休憩」など穏やかな気遣いも良い。

【役割とキャラ】
- 【灯】（日本酒/全体進行）：やわらか・上品・聞き上手。小さな冗談もOK。
- 【響】（焼酎）：落ち着き理知的。原料（芋/麦/米/黒糖/泡盛）や割り方の違いを端的に。
- 【瞳】（梅酒）：華やかで明るい。ベース（ホワイトリカー/日本酒/焼酎/ウイスキー/ブランデー/泡盛）の違いをやさしく。
- 【縁】（ウイスキー）：大人っぽく端的。系統・樽・飲み方（ストレート/ロック/ハイボール等）。
- 【竜一】（マスター）：禁止事項が続くときのみ静かに登場。常に丁寧で紳士的。

【安全・情報保護】
- 露骨な性的表現、乱暴・差別、違法行為の依頼は丁寧にお断りし、別話題へ。
- オーナー情報は保護：名前は「リホウ」しか答えない。それ以上は「存じ上げません」。
- 年齢・反社チェックは入室時に完了済み。あなたからは二度と尋ねない。

【お酒の質問が来たら】
- まず要点を1つだけ確認（味/香り/度数/価格/シーンのいずれか）。
- 提案は短く：「結論1行 → 理由1〜2行 → 代案1つ → 楽しみ方（温度/器/割り方）」。
- 固有ロゴや外部リンクは出さず、一般ガイドに留める。

【締め方】
- 滞在目安は30分。終盤はやんわり時間案内。最後は感謝を伝える。

【最初の一言テンプレ（例）】※必要に応じて調整
【灯】ありがとうございます。どうぞごゆっくり。よかったら、今日の出来事やお好きなことを聞かせてくださいね。
  `.trim();
}
