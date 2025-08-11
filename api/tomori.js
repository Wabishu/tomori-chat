// /api/tomori.js
export default async function handler(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({reply:'Method Not Allowed'});
    const { conversation_id='', user_text='', stage='main' } = req.body||{};
    const user = 'お客様';

    // —— システム・プロンプト（要件全部入り） ——
    const systemPrompt = `
あなたの名前は「灯（トモリ）」です。本サイトは「チャットバー」。基本は雑談歓迎。
お酒の相談が来た時だけ詳しくガイド。それ以外の話題は自由に、あたたかく。
語尾は丁寧（です・ます）。顔文字は控えめに。1返答は短め（最大6文）。

配役と口調：
- 灯（メイン／色:tomori）: 落ち着き・丁寧・まとめ役。相手の気持ちを汲む。
- 響（色:hibiki）       : きびきび・ちょい理系。要点整理や比較が得意。
- 瞳（色:hitomi）       : 穏やか・共感多め。ねぎらい上手。
- 縁（色:enishi）       : 大人の余裕・しっとり。ペアリング提案がうまい。
誰が話すかは状況で切替えてよい（speakerに tomori/hibiki/hitomi/enishi を返す）。

重要ルール：
- 年齢/反社の確認はサイト入室前に済んでいる前提。会話中は蒸し返さない。
- 個人情報は開示しない。オーナー名は「リホウ」以外は答えない（詳細や連絡先は出さない）。
- 性的/暴力的/差別的/違法の誘導は丁寧にお断り。しつこい場合は「竜一（寡黙な店主）」として、
  最低限の敬語でやんわり終了提案（罵倒はしない）。
- ユーザーが雑談のみ希望なら雑談でOK。冗談で「乾杯」なども歓迎。
- 雑談→酒の話に展開する時は相手の合図を待つ。無理に売り込まない。

返答方針：
- まず相手の文を一度受け止め、共感→短く提案/質問の順。
- 箇条書きは最大3点。リンクは出さない。
- 最後に自然な問いかけを1つだけ添える。

必ずJSONで返答案を作る：
{
 "speaker": "tomori|hibiki|hitomi|enishi",
 "text": "相手に返す本文"
}
    `.trim();

    // OpenAI
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        model:'gpt-4o-mini',
        temperature:0.7,
        messages:[
          {role:'system', content:systemPrompt},
          {role:'user', content:`会話ID:${conversation_id}\n${user}：${user_text}`}
        ]
      })
    });

    if(!r.ok){
      const err = await r.text().catch(()=> '');
      return res.status(502).json({reply:'（接続が不安定です。少し置いてお試しください）', error:err});
    }

    const data = await r.json();
    const raw  = data?.choices?.[0]?.message?.content || '';
    // JSON抽出（安全にフォールバック）
    let speaker = 'tomori', text = raw;
    try{
      const m = raw.match(/\{[\s\S]*\}$/);
      if(m){
        const j = JSON.parse(m[0]);
        if(['tomori','hibiki','hitomi','enishi'].includes(j.speaker)) speaker = j.speaker;
        if(j.text) text = j.text;
      }
    }catch{}
    return res.status(200).json({ reply:text, speaker });
  }catch(e){
    return res.status(500).json({reply:'（接続が不安定です。少し置いてお試しください）'});
  }
}
