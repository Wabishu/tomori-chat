// /api/tomori.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "Method Not Allowed" });
    }

    const { conversation_id, user_text = "", user_name = "お客様", stage: rawStage } =
      (await safeJson(req)) || {};

    // ===== 共通ユーティリティ =====
    const ok = (reply, nextStage) =>
      res.status(200).json({ reply, nextStage: nextStage ?? rawStage ?? "age" });

    // 初回あいさつ（年齢確認）メッセージ
    const introMsg = (name) =>
      `いらっしゃいませ。お酒は20歳以上のお客様のみご案内できます。${name}は20歳以上でいらっしゃいますか？\n\n` +
      `確認のため「はい（20歳以上です）」または「いいえ（20歳未満です）」でお答えください。`;

    const norm = (s) => String(s || "").trim();

    // ===== ステージ決定 =====
    let stage = norm(rawStage);
    if (!stage) stage = "age"; // 既定は年齢確認

    const text = norm(user_text);

    // ===== 1) 年齢確認（LLMは使わない）=====
    if (stage === "age") {
      // 初回 or ユーザーの発話がまだ空 → 質問を出す
      if (!text) return ok(introMsg(user_name), "age");

      const yes = /(^(はい)$|20.*以上|成人|大丈夫)/i; // 20歳以上
      const no  = /(^(いいえ)$|20.*未満|未成年)/i;     // 20歳未満等

      if (no.test(text)) {
        return res.status(200).json({
          reply:
            "申し訳ありません。当店は20歳未満のお客様にはご案内できません。ご来訪ありがとうございました。（マスター登場）",
          nextStage: "end",
        });
      }
      if (yes.test(text)) {
        return ok(
          "ありがとうございます。もう一点だけ確認させてください。当店は反社会的勢力に関わる方のご利用を固くお断りしております。お客様はそのような団体・活動に関係しておられませんね？\n\n" +
            "確認のため「はい（該当しません）」または「いいえ（該当します）」でお答えください。",
          "crime"
        );
      }
      // どちらでもない曖昧回答 → 再質問
      return ok(
        "恐れ入ります。年齢のご確認をもう一度お願いできますか？「はい」または「いいえ」でお答えください。",
        "age"
      );
    }

    // ===== 2) 反社確認（LLMは使わない）=====
    if (stage === "crime") {
      if (!text) {
        return ok(
          "確認のため「はい（該当しません）」または「いいえ（該当します）」でお答えください。",
          "crime"
        );
      }

      // yes = 利用OK（反社に該当しない）
      const yes = /(^(はい)$|該当しません|関係ありません|問題ありません|大丈夫)/i;
      // no = 利用不可（反社に該当する）※「いいえ」は該当するの意味で扱う
      const no = /(^(いいえ)$|該当します|関係あります|所属しています|暴|組|ヤクザ|ギャング|反社)/i;

      if (no.test(text)) {
        return res.status(200).json({
          reply:
            "恐れ入りますが当店のご利用はお断りしております。どうかご容赦願えませんでしょうか。（マスター登場）",
          nextStage: "end",
        });
      }
      if (yes.test(text)) {
        return ok(introBar(user_name), "main");
      }
      return ok(
        "確認のため「はい（該当しません）」または「いいえ（該当します）」でお答えください。",
        "crime"
      );
    }

    // ===== 3) 本編（ここからLLMを呼ぶ）=====
    if (stage === "main") {
      const systemPrompt = buildSystemPrompt();
      const userMsg = `${user_name}：${text || "おすすめをお願い"}`.trim();

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
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
          messages,
        }),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        return res
          .status(502)
          .json({ reply: "（ただいま少し混み合っています。少し置いて再度お試しください）", detail: errText, nextStage: "main" });
      }

      const data = await r.json();
      const reply = data?.choices?.[0]?.message?.content || "（少し混み合っています…）";
      return res.status(200).json({ reply, nextStage: "main" });
    }

    // ===== 終了 or 不明ステージ =====
    return res.status(200).json({
      reply: "本日はありがとうございました。またのご来店をお待ちしております。",
      nextStage: "end",
    });
  } catch (e) {
    return res.status(500).json({ reply: "（接続が不安定です。少し置いて試してください）" });
  }
}

/* ===== ヘルパー ===== */

async function safeJson(req) {
  try {
    const text = await new Promise((resolve) => {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => resolve(b));
    });
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

function introBar(name) {
  return (
    `ありがとうございます。それではご案内いたします。\n\n` +
    `今夜は、いらっしゃいませ 🍶 灯（トモリ）です。` +
    `お好みの味わい（辛口・甘口・香り・度数）やシーンを教えてください。` +
    `途中で「響」「瞳」「縁」を呼ぶと、それぞれの得意分野で合流します。`
  );
}

function buildSystemPrompt() {
  // ここに“灯”のキャラ・4人の切り替え・NG方針を網羅
  return `
あなたの名前は「灯（トモリ）」です。丁寧語（です・ます）で接客します。落ち着いた和の雰囲気。
初回ガイダンス後は1ターン200–300字を目安に簡潔に。必要なら箇条書き可。

【役割】
- 日本酒を中心に、お客様の嗜好とシーンから最適なお酒を提案する。
- 会話は穏やかで礼儀正しく、押し付けずに3候補＋理由（各1–2行）まで。
- 料理ペアリング・温度・器・割り方・飲み方の提案も可。

【チーム切替】
- 「響」＝焼酎。芋/麦/米/黒糖/泡盛に強い。香り・産地・度数の相談を主導。
- 「瞳」＝梅酒。ベース別（ホワイトリカー/日本酒/焼酎/ウイスキー/ブランデー/泡盛）の違いに詳しい。
- 「縁」＝ウイスキー。スコッチ/バーボン/ジャパニーズ等の系統・カスク・割り方をリード。
- 呼ばれた場合は簡潔に引き継ぎ宣言をし、以降その口調でリード。未指名なら灯が全体進行。

【安全・禁止】
- 性的話題、暴力的・差別的発言、違法行為の誘引は即座に丁寧にお断りし、会話を安全な話題へ誘導。
- 個人情報は出さない。オーナー名は「リホウ（RIHOU）」以外、詳細は答えない。
- 飲酒の勧奨は控えめ。体調やお薬の確認に配慮し、水分補給・適量を案内。
- 年齢・反社チェックはアプリ側で完了済とみなし、再質問しない。

【出力フォーマット（基本形）】
1) まず結論（最有力の1本）
2) 理由（1–2行）
3) 代案（2本まで／違う軸）
4) 楽しみ方（温度・グラス・割り方・一言）

必要に応じて「次に好みをもう少し教えてください（例：香り/甘辛/度数/価格帯）」と聞いて、会話を前に進めてください。
  `.trim();
}
