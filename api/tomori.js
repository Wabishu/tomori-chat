<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>灯（トモリ）と乾杯♪</title>
<style>
  :root{
    --bg:#0f0f12; --panel:#141823; --ink:#e8ecf1; --muted:#9aa4b2; --border:#22293a; --acc:#e5bf5b;
    --tomori:#ff8a8a;   /* 灯：やわらか赤 */
    --hibiki:#69b7ff;   /* 響：落ち着き青 */
    --hitomi:#b98aff;   /* 瞳：やさしい紫 */
    --en:#67d6a5;       /* 縁：穏やか緑 */
    --ryuichi:#ffcc66;  /* 竜一：琥珀 */
  }
  html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}
  header{display:flex;align-items:center;gap:10px;padding:16px;border-bottom:1px solid var(--border)}
  .badge{font-size:12px;color:#cbd5e1;border:1px solid var(--border);border-radius:999px;padding:4px 10px}
  .wrap{max-width:980px;margin:0 auto;padding:16px}
  .gate{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:99}
  .panel{width:min(92vw,560px);background:#12151d;border:1px solid var(--border);border-radius:16px;padding:22px}
  .rowbtn{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
  .rowbtn button{flex:1;min-width:140px;padding:10px 14px;border-radius:10px;background:#2f3750;border:1px solid #445;cursor:pointer}
  .rowbtn .ok{background:#3b82f6;border-color:#447fff}
  .rowbtn .no{background:#2a2a2a;border-color:#444}
  .bye{display:none;margin-top:10px;color:#cbd5e1}
  .chat{height:72vh;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px;overflow:auto}
  .msg{max-width:72%;margin:10px 0;padding:10px 12px;border-radius:12px;line-height:1.7;white-space:pre-wrap}
  .me{margin-left:auto;background:#1f2937}
  .bot{background:#161c2b;border:1px solid #20263a}
  .from-tomori{border-left:3px solid var(--tomori)}
  .from-hibiki{border-left:3px solid var(--hibiki)}
  .from-hitomi{border-left:3px solid var(--hitomi)}
  .from-en{border-left:3px solid var(--en)}
  .from-ryuichi{border-left:3px solid var(--ryuichi)}
  .from-tomori b{color:var(--tomori)}
  .from-hibiki b{color:var(--hibiki)}
  .from-hitomi b{color:var(--hitomi)}
  .from-en b{color:var(--en)}
  .from-ryuichi b{color:var(--ryuichi)}
  form{display:flex;gap:8px;margin-top:12px}
  textarea{flex:1;min-height:56px;max-height:160px;resize:vertical;background:#0c0f18;color:var(--ink);border:1px solid var(--border);border-radius:10px;padding:12px}
  button.send{background:var(--acc);color:#222;border:0;border-radius:10px;padding:0 18px;font-weight:700}
  .hint{color:var(--muted);font-size:13px;margin:6px 0}
  a.reset{color:#8aa6ff;font-size:12px}
</style>
</head>
<body>
  <!-- 入室ゲート（30日記憶） -->
  <div id="gate" class="gate" role="dialog" aria-modal="true" style="display:none">
    <div class="panel">
      <h2>チャットバー「灯」 入室前の確認</h2>
      <div id="step1">
        <p>お酒は <b>20歳以上</b> のお客様のみご案内できます。20歳以上でいらっしゃいますか？</p>
        <div class="rowbtn">
          <button class="ok" id="yesAge">はい（20歳以上）</button>
          <button class="no" id="noAge">いいえ</button>
        </div>
      </div>
      <div id="step2" style="display:none">
        <p>当店は <b>反社会的勢力に関わる方</b> のご利用を固くお断りしております。該当されませんね？</p>
        <div class="rowbtn">
          <button class="ok" id="yesClean">はい（該当しません）</button>
          <button class="no" id="noClean">いいえ（該当します）</button>
        </div>
        <p style="margin-top:8px;"><label><input type="checkbox" id="remember"> 次回から省略（30日）</label></p>
      </div>
      <div id="bye" class="bye">申し訳ありません。ご入室はできません。またの機会にお待ちしております。</div>
    </div>
  </div>

  <header>
    <h1 style="margin:0;font-size:22px;">灯（トモリ）と乾杯♪</h1>
    <span id="badge" class="badge">ご案内前</span>
  </header>

  <div class="wrap">
    <div id="chat" class="chat" aria-live="polite"></div>
    <div class="hint">例：今日はどんな一日でした？ / ちょっと雑談してもいい？</div>
    <form id="form">
      <textarea id="input" placeholder="メッセージを入力…"></textarea>
      <button class="send" id="send" type="submit">送信</button>
    </form>
    <p class="hint"><a href="#" class="reset" id="resetGate">確認をリセットする</a></p>
  </div>

<script>
  // ====== 30日ゲート ======
  const KEY = "tomori_gate_until";
  const AGE = "tomori_age_ok";
  const CRI = "tomori_crime_ok";
  const DAYS = 30;

  const gate = document.getElementById('gate');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const bye = document.getElementById('bye');
  const badge = document.getElementById('badge');

  const yesAge = document.getElementById('yesAge');
  const noAge  = document.getElementById('noAge');
  const yesCln = document.getElementById('yesClean');
  const noCln  = document.getElementById('noClean');
  const remember = document.getElementById('remember');
  const resetGate = document.getElementById('resetGate');

  function show(el){ el.style.display=''; }
  function hide(el){ el.style.display='none'; }

  function openGate(){ gate.style.display='flex'; badge.textContent='ご案内前'; }
  function passGate(){
    gate.style.display='none'; badge.textContent='会話中';
    addBot('【灯】ありがとうございます。どうぞごゆっくり。雑談からでも大歓迎です。');
  }

  function setUntil(days){
    if (remember && remember.checked){
      const until = Date.now() + days*24*60*60*1000;
      localStorage.setItem(KEY, String(until));
    } else {
      localStorage.removeItem(KEY);
    }
  }
  function okSaved(){
    const until = Number(localStorage.getItem(KEY)||0);
    return until && until > Date.now() &&
           localStorage.getItem(AGE)==='1' &&
           localStorage.getItem(CRI)==='1';
  }

  (function initGate(){
    if (okSaved()) { passGate(); }
    else { openGate(); show(step1); }
  })();

  yesAge.onclick = ()=>{ localStorage.setItem(AGE,'1'); hide(step1); show(step2); };
  noAge.onclick  = ()=>{ localStorage.removeItem(AGE); hide(step1); show(bye); };

  yesCln.onclick = ()=>{ localStorage.setItem(CRI,'1'); setUntil(DAYS); hide(step2); passGate(); };
  noCln.onclick  = ()=>{ localStorage.removeItem(CRI); hide(step2); show(bye); };

  resetGate.onclick = (e)=>{ e.preventDefault(); localStorage.removeItem(KEY); localStorage.removeItem(AGE); localStorage.removeItem(CRI); location.reload(); };

  // ====== チャット本体 ======
  const chat = document.getElementById('chat');
  const form = document.getElementById('form');
  const input= document.getElementById('input');

  // キャラ別タイピング速度（cps = 1秒あたり文字数）
  const TYPE_SPEED = {
    "灯": 2.4,   // 柔らか・丁寧
    "響": 3.6,   // 落ち着き早め
    "瞳": 3.2,   // 明るくテンポ良く
    "縁": 2.8,   // 大人っぽくゆったり
    "竜一": 2.6  // 静かに丁寧
  };

  function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // --- タイプ出力（cps=速度）
  function typeOut(targetEl, fullText, cps = 3) {
    return new Promise((resolve) => {
      const chars = [...fullText];
      if (chars.length === 0) { resolve(); return; }
      let i = 0;
      const interval = Math.max(20, 1000 / cps);
      const tick = () => {
        targetEl.textContent += chars[i++];
        chat.scrollTop = chat.scrollHeight;
        if (i < chars.length) setTimeout(tick, interval);
        else resolve();
      };
      setTimeout(tick, interval);
    });
  }

  function bubble(role, text, cls){
    const div = document.createElement('div');
    div.className = 'msg ' + (role==='user'?'me':'bot') + (cls?(' '+cls):'');

    if (role !== 'user') {
      // 期待フォーマット: 【灯|響|瞳|縁|竜一】本文
      const m = text.match(/^【(灯|響|瞳|縁|竜一)】(.*)$/s);
      if (m) {
        const who = m[1];
        const body = (m[2] || '').trim();

        // 見出しだけ先に入れて、本文は後からタイプ
        div.innerHTML = `<b>【${who}】</b> `;
        const bodySpan = document.createElement('span');
        div.appendChild(bodySpan);

        // 色クラス
        div.classList.add(
          who==='灯'?'from-tomori':
          who==='響'?'from-hibiki':
          who==='瞳'?'from-hitomi':
          who==='縁'?'from-en'    :'from-ryuichi'
        );

        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;

        // タイプ表示（キャラ別スピード）
        const cps = TYPE_SPEED[who] ?? 3;
        typeOut(bodySpan, body, cps);
        return;
      }
    }

    // fallback（ユーザーやフォーマット外）
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }
  const addMe  = (t)=> bubble('user', t);
  const addBot = (t)=> bubble('assistant', t);

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (gate.style.display!=='none') { addBot('【灯】まずは入室前の確認をお願いいたします。'); return; }
    const text = input.value.trim(); if (!text) return;
    addMe(text); input.value='';
    try{
      const r = await fetch('/api/tomori', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ user_name:'お客様', user_text:text, stage:'main' })
      });
      const data = await r.json();
      addBot(data.reply || '【灯】（少し混み合っています…）');
    } catch {
      addBot('【灯】（接続が不安定です。少し置いてお試しください）');
    }
  });
</script>
</body>
</html>
