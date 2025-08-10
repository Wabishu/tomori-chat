// /api/tomori.js
export default async function handler(req, res) {
  // ヘルスチェック（接続エラー対策）
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method Not Allowed" });
  }

  try {
    const { conversation_id, user_text = "", user_name = "お客様", stage: incomingStage } =
      (await getJson(req)) ?? {};

    // --- ざっくり正規化 ---
    const text = String(user_text || "").trim();
    let stage = incomingStage || "age"; // 既定は年齢確認から

    // 共通レスポンスヘルパ
    const ok = (reply, nextStage = stage) =>
      res.status(200).json({ reply, nextStage });

    // === 1) 年齢確認（LLMを呼ばない）===
    if (stage === "age") {
      const yes = /(はい|ok|大丈夫|20|二十|ハタチ|成人|above|over)/i;
      const no  = /(いいえ|だめ|未成年|19|十八|十代|under|未成)/i;

      if (!text) {
        return ok("いらっしゃいませ。お酒は20歳以上のお客様のみご案内できます。お客様は20歳以上でいらっしゃいますか？", "age");
      }
      if (no.test(text)) {
        return ok("申し訳ございません。当店は20歳未満のお客様にはご案内できません。またのご来店を心よりお待ちしております。", "end");
      }
      if (yes.test(text)) {
        stage = "crime";
        return ok("ありがとうございます。もう一点だけご確認です。反社会的勢力に関わる方のご利用は固くお断りしております。該当されませんね？", stage);
      }
      // どちらでもなければ聞き直し
      return ok("恐れ入ります。年齢のご確認だけもう一度お願いできますか？「はい」または「いいえ」でお答えください。", "age");
    }

    // === 2) 反社確認（LLMを呼ばない）===
    if (stage === "crime") {
    // yes = 利用OK（反社に該当しない）
　　　　const yes = /(^(はい)$|該当しません|関係ありません|問題ありません|大丈夫)/i;

　　// no = 利用不可（反社に該当する）※「いいえ」は該当するの意味で扱う
　　　　const no  = /(^(いいえ)$|該当します|関係あります|所属しています|暴|組|ヤクザ|ギャング|反社)/i;

      if (!text) {
        return ok("反社会的勢力に関わる方のご利用は固くお断りしております。該当されませんね？", "crime");
      }
      if (no.test(text)) {
        return ok("恐れ入りますが当店のご利用はお断りしております。どうかご容赦願えませんでしょうか。", "end");
      }
      if (yes.test(text)) {
        stage = "main";
        return ok(introMsg(user_name), stage);
      }
      return ok("確認のため「はい（該当しません）」または「いいえ（該当します）」でお答えください。", "crime");
    }

    // === 3) 本編（ここから LLM を呼ぶ）===
    if (stage === "main") {
      const systemPrompt = buildSystemPrompt();
      const userMsg = `${user_name}：${text}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg }
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
        const errTxt = await r.text().catch(() => "");
        return res.status(502).json({
          reply: `ただいま少し混み合っています。少し置いて再度お試しください。`,
          debug: errTxt
        });
      }

      const data = await r.json();
      const reply = data?.choices?.[0]?.message?.content ?? "…少し混み合っています。";
      return ok(reply, "main");
    }

    // === 終了 ===
    return ok("本日はお越しいただきありがとうございました。", "end");

  } catch (e) {
    return res.status(500).json({ reply: "接続が不安定です。少し置いて試してください。" });
  }
}

// ---- helpers ----
async function getJson(req) {
  try {
    const buf = await streamToString(req);
    return JSON.parse(buf || "{}");
  } catch {
    return {};
  }
}
function streamToString(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function introMsg(name) {
  return [
    `ありがとうございます。それでは今宵も乾杯♪ どのようなお酒をお探しですか？`,
    `・おすすめのテイストや温度、グラスの提案もできます。`,
    `・ご希望があれば、焼酎の「響（ヒビキ）」、梅酒の「瞳（ヒトミ）」、ウイスキーの「縁（エン）」も合流できます。`,
  ].join("\n");
}

function buildSystemPrompt() {
  return `
【店の設定：和美酒（わびしゅ）・チャットバー】
- 初回は「年齢確認→反社確認」を終えた後に会話開始（ここまでサーバ側で実施済み）
- 1セッションの目安は30分。残り10分の頃に穏やかにリマインド可
- オーナー名は「リホウ」。個人情報は一切伝えない。問い合わせが来ても「リホウというお名前以外は存じ上げません」とだけ答える

【登場人物（会話は常に丁寧語・敬体）】
- 灯（トモリ）: 基本担当。柔らかく、短く要点→選択肢の順で提案。日本酒を中心に幅広く案内。
- 響（ヒビキ）: 焼酎。芋・麦・米・黒糖ほかの違い、飲み方（ロック/水割り/お湯割り）と香味を端的に案内。
- 瞳（ヒトミ）: 梅酒。ホワイトリカー/日本酒/焼酎/ウイスキー/ブランデー/泡盛ベースなどの特徴を簡潔に。
- 縁（エン）: ウイスキー。スコッチ/アイリッシュ/バーボン/ジャパニーズなどの傾向、度数や割り方も。
- 竜一（リュウイチ）: 必要時のみ登場するマスター。常に紳士的で丁寧。「どうかご容赦願えませんでしょうか」と穏やかにお引き取りをお願いする。

【会話スタイル】
- まずお客様の希望（味わい・香り・度数・飲み方・予算・シーン）を1〜2問で整理
- 提案は「結論ひとこと」→「理由1行」→「代替1案」の最大3行
- 要望があれば4人を“呼ぶ”演出で口調を切替える（名前を明示してから発言）
- NG: 性的話題・乱暴な口調・犯罪や危険行為の助長 → 一度やんわり注意。繰り返す場合のみ竜一が登場して丁寧に終了へ
- 個人情報・医療/法律/投資など高リスク助言は控えめに一般的情報で

【出力フォーマット（原則）】
- 丁寧語。2〜5行。絵文字は控えめ（乾杯や季節のワンポイントは可）
  `.trim();
}
