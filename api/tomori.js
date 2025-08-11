// api/tomori.js
// ver. chat-4hostess-typing-rotation

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method Not Allowed" });
  }

  try {
    // ===== 受け取り =====
    const { conversation_id = "default", user_text = "", user_name = "お客様" } =
      (await req.json?.()) || req.body || {};

    // ===== セッション（簡易） =====
    // フロントから conversation_id を渡してもらう想定。なければ default
    // ここでは簡略化のためにサーバー側の状態は持たず、フロントが turnIndex を渡さない場合は回転。
    const roster = ["灯", "瞳", "響", "縁"];

    // 文字速度（文字/秒）…フロントに渡す
    const typing = { Tomori: 14, Hitomi: 14, Hibiki: 20, Enishi: 26 };

    // 明示指定があれば主担当を上書き（例: “/呼ぶ 縁”）
    let forced = null;
    const callMatch = user_text.match(/^\/呼ぶ\s*(灯|瞳|響|縁)$/);
    if (callMatch) forced = callMatch[1];

    // ローテーション（フロント側で保持/送信した turnIndex があれば利用）
    let turnIndex = 0;
    if (req.headers["x-turn-index"]) {
      turnIndex = parseInt(String(req.headers["x-turn-index"]), 10) || 0;
    }
    let mainSpeaker = forced ?? roster[turnIndex % roster.length];

    // 20%でサイド発言
    const others = roster.filter((n) => n !== mainSpeaker);
    const sideSpeaker = Math.random() < 0.2 ? others[Math.floor(Math.random() * others.length)] : null;

    // ====== システム・プロンプト ======
    const systemPrompt = `
あなたは和のバー「灯と乾杯♪」のバーチャル接客チームです。4人のホステスが交代で話します。
- 人物: 灯(トモリ/落ち着き/ゆっくり), 瞳(やわらか/ゆっくり), 響(きびきび/普通), 縁(スマート/少し速い)
- 文体: です・ます調。丁寧・やさしく・押し付けない。
- 1ターンは「要約ひとこと→共感ひとこと→役立つ情報(2〜4文)→質問は最大1つ」。
- 質問攻めや連投はしない。
- お酒の話題が無ければ雑談のみでOK。聞かれたらお酒の話をする。
- 直前の発話に耳を傾け、必要なら一言だけ触れてから本題へ。
- 20%の確率で、主担当のあとに他の一人が「ひとことだけ」相づち/補足（1文）。
- 4人の役割/口調は崩さない。絵文字や顔文字は多用しない（使っても控えめ）。
- 禁止: 個人情報の開示、オーナー「rihou」の個人情報への言及、未成年への販売助長、攻撃的/わいせつ/暴力的表現。
- すでに年齢・反社会勢力チェックは完了している前提。再確認しない。
出力は必ず日本語。`;

    // ユーザーメッセージを役割付きに
    const userMsg = `${user_name}：${user_text}`.trim();

    // モデル入力を作成
    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          `主担当: ${mainSpeaker}\n` +
          `ユーザー発言: """${userMsg}"""\n` +
          `出力フォーマット:\n` +
          `【${mainSpeaker}】<本文>\n` +
          (sideSpeaker ? `（20%の時だけ）【${sideSpeaker}】<ひとこと>\n` : ``) +
          `注意: 1ターンにつき質問は最大1つ。本文は4〜6文まで。`
      }
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages
      })
    });

    if (!r.ok) {
      const err = await r.text().catch(() => "");
      return res.status(502).json({
        reply: "（接続が不安定です。少し置いてお試しください）",
        error: err
      });
    }

    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    // 期待フォーマットをざっくり抽出
    const mainLine = (raw.match(/【(灯|瞳|響|縁)】([\s\S]*?)(?=$|【|$)/) || [])[2]?.trim() || raw.trim();
    const sideMatch = raw.match(/【(灯|瞳|縁|響)】([\s\S]*?)$/);
    let side = null;
    if (sideSpeaker && sideMatch && sideMatch[1] !== mainSpeaker) {
      side = { speaker: sideMatch[1], line: sideMatch[2].trim() };
    }

    return res.status(200).json({
      reply: mainLine,
      mainSpeaker,
      side,
      typing // 文字速度
    });
  } catch (e) {
    return res.status(500).json({
      reply: "（内部でエラーが発生しました。少し置いてからもう一度お試しください）"
    });
  }
}
