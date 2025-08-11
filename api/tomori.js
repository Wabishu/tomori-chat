<!-- === Chat Bar Tomori | Single-Paste Block for WordPress === -->
<style>
  :root{
    --chat-max: 1200px;          /* チャットの最大幅 */
    --radius: 14px;
    --shadow: 0 8px 28px rgba(0,0,0,.08);
    --tomori: #e60033;           /* 灯（赤） */
    --hibiki: #0ea5e9;           /* 響（青） */
    --hitomi: #10b981;           /* 瞳（緑） */
    --en:     #f59e0b;           /* 縁（橙） */
    --user:   #374151;           /* お客さま（濃グレー） */
    --bg: #fff;                  /* 背景：白 */
  }
  /* コンテナ（テーマの余白に左右されても最大限広げる） */
  .cbt-wrap{
    position: relative;
    max-width: min(100vw, var(--chat-max));
    margin-inline: auto;
    padding: clamp(8px, 2vw, 14px);
    background: var(--bg);
    border: 1px solid #eee;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  /* オプション：薄い背景画像（設定でONの場合のみ適用） */
  .cbt-wrap.has-bg::before{
    content:"";
    position:absolute; inset:0;
    background-size: cover; background-position: 50% 50%;
    opacity: .08; pointer-events: none;
    filter: saturate(0.8) brightness(1.05);
  }

  .cbt-head{
    display:flex; align-items:center; justify-content:space-between;
    gap:10px; padding:6px 4px 10px;
    border-bottom:1px dashed #e5e7eb;
  }
  .cbt-title{ font-weight:700; font-size: clamp(18px,2.2vw,22px); }
  .cbt-reset{ font-size:12px; color:#6b7280; text-decoration:underline; cursor:pointer; }

  .cbt-log{
    min-height: min(60vh, 600px);
    max-height: 70vh;
    overflow: auto;
    padding: 10px 6px;
    scroll-behavior: smooth;
  }
  .msg{ display:flex; gap:10px; align-items:flex-start; margin:8px 4px; }
  .badge{
    flex: 0 0 auto;
    font-weight:700; font-size:12px; line-height:1;
    padding:6px 8px; border-radius: 999px; color:#fff;
  }
  .bubble{
    background:#f8fafc; border:1px solid #eef2f7; color:#111827;
    padding:10px 12px; border-radius: 12px;
    max-width: 100%; white-space: pre-wrap; word-break: break-word;
  }
  .from-tomori .badge{ background: var(--tomori); }
  .from-hibiki .badge{ background: var(--hibiki); }
  .from-hitomi .badge{ background: var(--hitomi); }
  .from-en     .badge{ background: var(--en); }
  .from-user   .badge{ background: var(--user); color:#fff; }
  .from-user .bubble{ background:#111827; color:#fff; border-color:#111827; }

  .cbt-form{
    display:flex; gap:8px; margin-top:10px; align-items:flex-end; flex-wrap:wrap;
  }
  .cbt-name{ flex:0 0 180px; display:flex; flex-direction:column; gap:4px; }
  .cbt-name input{
    width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;
  }
  .cbt-ta{ flex:1 1 260px; }
  .cbt-ta textarea{
    width:100%; height:80px; padding:12px; border:1px solid #d1d5db; border-radius:12px;
    resize:vertical; font-family:inherit;
  }
  .cbt-send{
    flex:0 0 auto;
    padding:12px 18px; border-radius:10px; border:0; cursor:pointer; color:#fff; background:#111827;
  }
  .hint{ font-size:12px; color:#6b7280; margin-top:4px; }

  /* === ゲート（年齢・反社） === */
  .gate{
    position: fixed; inset: 0;
    background: rgba(255,255,255,.96);
    backdrop-filter: blur(2px);
    display:flex; align-items:center; justify-content:center;
    z-index: 9999;
  }
  .gate-card{
    width: min(680px, 92vw);
    background:#fff; border:1px solid #eee; border-radius: 14px;
    padding: 20px 22px; box-shadow: var(--shadow); color:#222; line-height:1.7;
  }
  .q{ margin-top: 18px; }
  .q-title{ font-weight:600; margin-bottom:8px; }
  .btn-row{ display:flex; gap:10px; flex-wrap:wrap; }
  .btn{
    appearance:none; border:0; border-radius:8px; padding:10px 18px; font-size:16px; cursor:pointer;
  }
  .btn.yes{ background: var(--tomori); color:#fff; }
  .btn.no { background:#eee; color:#333; }
  .note,.reset{ font-size:13px; color:#666; margin-top:10px; display:inline-block; }
  .hidden{ display:none !important; }

  /* モバイル微調整 */
  @media (max-width: 600px){
    .cbt-name{ flex-basis: 100%; }
    .cbt-send{ width:100%; }
    .cbt-log{ max-height: 58vh; }
  }
</style>

<div id="chatbar" class="cbt-wrap">
  <div class="cbt-head">
    <div class="cbt-title">チャットバー灯</div>
    <a class="cbt-reset" id="chat-reset" title="保存情報をリセット">保存情報をリセット</a>
  </div>

  <div id="cbt-log" class="cbt-log" aria-live="polite">
    <!-- 初回メッセージはJSで投入 -->
  </div>

  <form class="cbt-form" id="cbt-form">
    <div class="cbt-name">
      <label for="cbt-name-input">名前（任意）</label>
      <input id="cbt-name-input" placeholder="匿名でもOK">
    </div>
    <div class="cbt-ta">
      <textarea id="cbt-text" placeholder="メッセージを入力…（Enterで送信 / 改行は Shift+Enter）"></textarea>
      <div class="hint">Enterで送信、Shift+Enterで改行。雑談だけでも大歓迎です。</div>
    </div>
    <button type="submit" class="cbt-send">送信</button>
  </form>
</div>

<!-- 年齢・反社ゲート -->
<div id="gate" class="gate">
  <div class="gate-card">
    <h3>年齢・反社会的勢力に関する確認</h3>
    <p>お酒の販売に関する規定により、次の確認をお願いします。</p>

    <div class="q">
      <div class="q-title">① あなたは20歳以上ですか？</div>
      <div class="btn-row">
        <button class="btn yes" data-q="age" data-val="yes">はい</button>
        <button class="btn no"  data-q="age" data-val="no">いいえ</button>
      </div>
    </div>

    <div class="q">
      <div class="q-title">② あなたは反社会的勢力に関与していませんか？</div>
      <div class="btn-row">
        <button class="btn yes" data-q="crime" data-val="yes">はい</button>
        <button class="btn no"  data-q="crime" data-val="no">いいえ</button>
      </div>
    </div>

    <p class="note">※「はい」を選ぶと次に進みます。</p>
    <a href="#" id="gate-reset" class="reset">確認をリセット</a>
  </div>
</div>

<script>
(() => {
  /* ========= 設定（必要に応じて変更） ========= */
  const API_ENDPOINT = 'https://tomori-chat.vercel.app/api/tomori'; // ← あなたのAPIに変更可
  const USE_BG_IMAGE = false;                                        // 背景画像を敷くなら true
  const BG_IMAGE_URL = 'https://example.com/path/to/bar.jpg';        // 画像URLを入れる
  /* ============================================ */

  const wrap = document.getElementById('chatbar');
  if (USE_BG_IMAGE) {
    wrap.classList.add('has-bg');
    wrap.style.setProperty('--bg','rgba(255,255,255,0.92)');
    wrap.style.setProperty('background','rgba(255,255,255,0.92)');
    // 背景適用
    wrap.style.setProperty('--bg-url', `url("${BG_IMAGE_URL}")`);
    wrap.querySelector(':scope').style; // noop
    wrap.style.setProperty('--dummy','0'); // force style flush
    wrap.style.backgroundClip = 'padding-box';
    wrap.style.position = 'relative';
    wrap.style.setProperty('--x','0'); // no-op
    wrap.style.setProperty('--y','0');
    wrap.style.setProperty('--z','0');
    // ::before にURLを入れるため
    const css = document.createElement('style');
    css.innerHTML = `.cbt-wrap.has-bg::before{ background-image: url("${BG_IMAGE_URL}"); }`;
    document.head.appendChild(css);
  }

  const log = document.getElementById('cbt-log');
  const form = document.getElementById('cbt-form');
  const ta = document.getElementById('cbt-text');
  const nameInput = document.getElementById('cbt-name-input');

  const gate = document.getElementById('gate');
  const gateReset = document.getElementById('gate-reset');

  // 既に合格済みならゲートを非表示
  const okAge   = localStorage.getItem('ageOk')   === '1';
  const okCrime = localStorage.getItem('crimeOk') === '1';
  if (okAge && okCrime) gate.classList.add('hidden');

  // ゲートボタン
  function handleGate(q, val){
    if (q === 'age') {
      if (val === 'yes') localStorage.setItem('ageOk','1');
      else { alert('20歳未満の方はご利用いただけません。'); return; }
    }
    if (q === 'crime') {
      if (val === 'yes') localStorage.setItem('crimeOk','1');
      else { alert('恐れ入りますが当店のご利用はお断りしております。'); return; }
    }
    const a = localStorage.getItem('ageOk') === '1';
    const c = localStorage.getItem('crimeOk') === '1';
    if (a && c) {
      gate.classList.add('hidden');
      setTimeout(()=>window.scrollTo(0,1),10);
    }
    disableWhileGate();
  }
  document.querySelectorAll('#gate .btn').forEach(btn=>{
    const q = btn.getAttribute('data-q');
    const val = btn.getAttribute('data-val');
    btn.addEventListener('click', ()=>handleGate(q,val));
    btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); handleGate(q,val); }, {passive:false});
  });
  gateReset.addEventListener('click', (e)=>{
    e.preventDefault();
    localStorage.removeItem('ageOk');
    localStorage.removeItem('crimeOk');
    gate.classList.remove('hidden');
    disableWhileGate();
  });

  function disableWhileGate(){
    const disabled = !gate.classList.contains('hidden');
    ta.disabled = disabled;
  }
  disableWhileGate();

  // 保存情報をリセット（名前・会話履歴・ゲート）
  document.getElementById('chat-reset').addEventListener('click', ()=>{
    if (!confirm('保存情報（年齢/反社フラグ・お名前・会話ログ）をリセットします。よろしいですか？')) return;
    localStorage.removeItem('ageOk');
    localStorage.removeItem('crimeOk');
    localStorage.removeItem('cbt-name');
    localStorage.removeItem('cbt-log');
    nameInput.value = '';
    log.innerHTML = '';
    gate.classList.remove('hidden');
    disableWhileGate();
    firstMessage();
  });

  // 初回メッセージ
  function addMessage(from, text){
    const div = document.createElement('div');
    div.className = `msg from-${from}`;
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = from === 'user' ? '匿名' : (from==='tomori'?'灯':'');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    div.appendChild(badge); div.appendChild(bubble);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  function firstMessage(){
    if (log.childElementCount === 0) {
      addMessage('tomori','いらっしゃいませ。どうぞごゆっくり。雑談からでも大歓迎です。');
    }
  }
  firstMessage();

  // 送信
  nameInput.value = localStorage.getItem('cbt-name') || '';
  nameInput.addEventListener('change', ()=> localStorage.setItem('cbt-name', nameInput.value.trim()));

  // Enter送信 / Shift+Enterで改行
  ta.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (ta.disabled) return;
    const text = ta.value.trim();
    if (!text) return;

    const userName = (nameInput.value.trim() || '匿名');
    addMessage('user', text);
    ta.value = '';

    // API呼び出し
    try{
      const r = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          user_text: text,
          conversation_id: 'wp-'+location.pathname
        })
      });
      if (!r.ok){
        const err = await r.text().catch(()=> '');
        addMessage('tomori', '（接続が不安定です。少し置いてお試しください）');
        console.error('API error', err || r.status);
        return;
      }
      const data = await r.json();
      const reply = (data && (data.reply || data.choices?.[0]?.message?.content)) || '…';
      addMessage('tomori', reply);
    }catch(ex){
      console.error(ex);
      addMessage('tomori', '（接続が不安定です。少し置いてお試しください）');
    }
  });
})();
</script>
<!-- === /Chat Bar Tomori === -->
