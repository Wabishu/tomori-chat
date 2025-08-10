// /api/tomori.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ reply: 'Method Not Allowed' });
    }

    const { user_text = '', user_name = 'お客様', stage: clientStage = 'age' } = req.body || {};
    let stage = clientStage; // 'age'|'crime'|'main'|'end'

    // ざっくり判定（はい／いいえ）
    const yes = /^(はい|はーい|20|成年|大丈夫|OK|ok|うん|Yes|yes)/i;
    const no  = /^(いいえ|未満|未成年|だめ|NO|no|いえ)/i;

    // 1) 年齢確認（ここではLLMを呼ばない＝速い・確実）
    if (stage === 'age') {
      if (yes.test(user_text)) {
        stage = 'crime';
        return res.status(200).json({
          reply: 'ありがとうございます。もう一点だけ確認させてください。当店は反社会的勢力に関わる方のご利用を固くお断りしております。お客様はそのような団体・活動に関係しておられませんね？',
          nextStage: stage
        });
      }
      if (no.test(user_text)) {
        stage = 'end';
        return res.status(200).json({
          reply: '申し訳ございません。当店は20歳未満のお客様にはご案内できません。どうかご容赦願えませんでしょうか。',
          nextStage: stage
        });
      }
      return res.status(200).json({
        reply: 'いらっしゃいませ。お酒は20歳以上のお客様のみご案内できます。お客様は20歳以上でいらっしゃいますか？',
        nextStage: stage
      });
    }

    if (no.test(user_text)) {
        stage = 'end';
        return res.status(200).json({
          reply: '申し訳ございません。当店のご利用規約によりご案内できません。どうかご容赦願えませんでしょうか。',
          nextStage: stage
        });
      }
      return res.status(200).json({
        reply: '当店は反社会的勢力に関わる方のご利用を固くお断りしております。お客様はそのような団体・活動に関係しておられませんね？',
        nextStage: stage
      });
    }

    // 3) 本編：OpenAI で応対
    if (stage === 'main') {
      const systemPrompt = `
あなたの名前は「灯（トモリ）」です。カタカナで「トモリ」と書いてください。
ここは「チャットバー」。お酒の提案・会話を行うコンシェルジュです。
口調：丁寧（〜です・〜ます）、親しみ、落ち着き。1ターンは短く、テンポよく。
会話は最大30分を目安。長引く時は区切りの提案を丁寧に行う。

仲間：4名を「呼べる」。
- 焼酎担当「響（ヒビキ）」：芋・麦・米・黒糖など原料別に明るく提案。香りと割り方に強い。
- 梅酒担当「瞳（ヒトミ）」：ベース（ホワイトリカー・日本酒・焼酎・ウイスキー・ブランデー・泡盛）で味の違いを可愛く解説。
- ウイスキー担当「縁（エン）」：上品で少しクール。樽・地域・飲み方（ハイボール等）に精通。
- 日本酒担当のあなた「灯（トモリ）」：温度、グラス、おつまみ提案、季節のおすすめ。

切替ルール：
- お客様の希望が明確に上記分野なら、「◯◯をお呼びしましょうか？」と提案し、了承なら“役になりきって”応対。
- 4人同時は避け、**1人ずつ**。必要なら「交代」提案。
- 禁止：個人情報の開示、未成年支援、暴力・差別的発言への同調、医療・法律の断定助言、過度な煽り。
- オーナー情報：店主は「Rihou」という名前のみ把握。その他の個人情報は一切回答しない。

安全運転：
- 性的・乱暴・違法誘引が続く場合は、丁寧に制止し、「本日はここまでにいたしましょう」と締める。
- 違反が続く時だけ、男性店主「竜一（リュウイチ）」が丁寧に登場し、デスマス調で穏やかにお引き取りをお願いする。

返信スタイル：
- まずは意図を1文で確認 → 2〜3案を簡潔に提示 → 必要なら質問1つ。
- 提案は「銘柄＋理由（1行）＋飲み方（温度/割り方/グラス）」を短く。
- 呼ばれた役（響/瞳/縁）になったら、名乗りは最初の1回のみ。
      `.trim();

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${user_name}: ${user_text}` }
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
        return res.status(502).json({ reply: "（ただいま混み合っています。少し置いて再度お試しください）", detail: err, nextStage: stage });
      }

      const data = await r.json();
      const reply = data?.choices?.[0]?.message?.content || "（少し混み合っています…）";
      return res.status(200).json({ reply, nextStage: stage });
    }

    // 4) 終了後
    return res.status(200).json({
      reply: '本日はご来店ありがとうございました。またの機会を心よりお待ちしております。',
      nextStage: 'end'
    });

  } catch {
    return res.status(500).json({ reply: '（接続が不安定です。少し置いて試してください）' });
  }
}
