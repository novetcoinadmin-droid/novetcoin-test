(() => {
  'use strict';
  const mobile=new URLSearchParams(location.search).get('mode')==='mobile';
  window.novetMobileMode=mobile;
  if(!mobile)return;
  document.documentElement.classList.add('mobile');
  const el=id=>document.getElementById(id);
  // Fullscreen must be requested from the user's tap, before async game loading.
  const fullscreenRoot=document.documentElement;
  const fullscreenRequest=fullscreenRoot.requestFullscreen || fullscreenRoot.webkitRequestFullscreen;
  const inFullscreen=()=>!!(document.fullscreenElement || document.webkitFullscreenElement || navigator.standalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches);
  function updateFullscreenButton(){
    const full=inFullscreen(),button=el('mobile-fullscreen');
    if(button)button.hidden=!fullscreenRequest || full;
    for(const help of document.querySelectorAll('[data-display-help]'))help.hidden=full;
  }
  function requestMobileFullscreen(){
    if(!fullscreenRequest || inFullscreen())return;
    try {
      const pending=fullscreenRequest.call(fullscreenRoot,{navigationUI:'hide'});
      Promise.resolve(pending).then(updateFullscreenButton).catch(updateFullscreenButton);
    } catch { updateFullscreenButton(); }
  }
  el('launch').addEventListener('click',requestMobileFullscreen);
  el('mobile-fullscreen')?.addEventListener('click',requestMobileFullscreen);
  document.addEventListener('fullscreenchange',updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange',updateFullscreenButton);
  updateFullscreenButton();
  // Keep browser zoom gestures separate from the game's two-thumb inputs.
  document.querySelector('meta[name="viewport"]').content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  const playing=()=>document.body.classList.contains('mobile-playing');
  const preventZoom=e=>{if(playing() && e.cancelable)e.preventDefault();};
  for(const name of ['gesturestart','gesturechange','gestureend','dblclick'])document.addEventListener(name,preventZoom,{passive:false});
  for(const name of ['touchstart','touchmove'])document.addEventListener(name,e=>{
    if(playing() && e.touches.length>1 && e.cancelable)e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',e=>{
    if(playing() && e.target.closest?.('.touch-pad') && e.cancelable)e.preventDefault();
  },{passive:false});

  document.querySelector('.heading .eyebrow').textContent='MOBILE BROWSER / PRACTICE';
  el('launch').textContent='スマホで遊ぶ';
  el('launch-screen').querySelector('p').innerHTML='横画面で、両親指を使って操作します。<br>読み込み後にシールドの色を選べます。';
  el('launch-screen').querySelector('.small').innerHTML='タッチ操作 · 音が出ます<br><a href="#display-guide" data-display-help>タブ・アドレスバーを隠して遊ぶには</a>';
  el('controller-status').textContent='スマホを横向きにして遊べます。';
  el('controls').innerHTML=`<div><span class="eyebrow">TOUCH TO RACE</span><h2>両親指で操作</h2><p>画面左側（上部カメラの下）の広い透明エリアで、触れた位置から指を少し左右に滑らせると曲がります。丸い表示の外でも操作できます。右の大きなアクセルを押しながら、親指を周囲へ滑らせて操作してください。</p><table><tbody><tr><th>左右へスライド</th><td>加速しながらアーム・ドリフト</td></tr><tr><th>上へスライド</th><td>加速しながらアームパンチ</td></tr><tr><th>下へスライド</th><td>減速してからバック</td></tr><tr><th>アクセルを2回タップ</th><td>ニトロ残量があれば発動。2回目はそのまま押し続けられます。</td></tr></tbody></table></div><div><h2>横画面でスタート</h2><p>カラーを横にスライドして選び、「配色決定」→「GameStart」。3、2、GOでレースが始まります。</p><p>指を離すと操作が解除されます。上部の3カメラはタップで切り替え。ゴール後はコンティニューで再挑戦できます。</p><p>iPhoneはSafari、AndroidはChromeで開いてください。アプリ内ブラウザで起動しない場合は、通常のブラウザで開いてください。</p><a href="?mode=pc">PC・ゲームパッドで遊ぶ →</a></div>`;
  updateFullscreenButton();
  window.NovetMobileControls=function(game) {
    const input=new window.NovetMobileInput();
    let state={phase:0,charge:0},menu=false,paused=null,signature='',lastSent=0;
    const controls=el('touch-controls'),frame=el('game-frame');
    game.SendMessage('BrowserGamepadInput','EnableMobile','1');
    function available(){return state.phase===1 && !paused && !document.hidden;}
    function send(packet,force=false){const value=JSON.stringify(packet),now=performance.now();if(force||value!==signature||now-lastSent>250){game.SendMessage('BrowserGamepadInput','Receive',value);signature=value;lastSent=now;}}
    function release(){input.reset();send({connected:false,axes:[],buttons:[]},true);paint();}
    function syncPause(){
      const portrait=frame.clientHeight>frame.clientWidth;
      el('rotate-phone').hidden=!portrait;
      el('mobile-menu').hidden=!menu || portrait;
      const next=portrait||menu||document.hidden;
      if(next!==paused){paused=next;release();game.SendMessage('BrowserGamepadInput','PauseMobile',paused?'1':'0');}
      controls.hidden=state.phase!==1 || paused;
      el('mobile-pause').hidden=state.phase===0 || paused;
      el('mobile-stats').hidden=state.phase!==1 || paused;
    }
    function paint(){
      const p=input.packet(performance.now());
      const thumb=el('steer-thumb');
      if(thumb){const pad=thumb.parentElement;const offset=input.left && (p.buttons[14] || p.buttons[15]) ? Math.max(-1,Math.min(1,input.left.x))*pad.clientWidth*.26 : 0;pad.style.setProperty('--steer-offset',offset+'px');}
      for(const [id,on] of Object.entries({'touch-left':p.buttons[14],'touch-right':p.buttons[15],'touch-gas':p.buttons[7],'touch-arm-left':p.axes[2]<0,'touch-arm-right':p.axes[2]>0,'touch-punch':p.buttons[3],'touch-brake':p.buttons[1]}))el(id).classList.toggle('pressed',!!on);
    }
    const pads=Object.fromEntries([...controls.querySelectorAll('[data-pad]')].map(pad=>[pad.dataset.pad,pad]));
    const originX={left:0,right:0};
    function point(side,contact){
      // Keep the existing relative steering and combined gas/arm zones.
      if(side==='left')return [(contact.clientX-originX.left)/64,0];
      const r=pads[side].getBoundingClientRect();
      return [(contact.clientX-r.left)/r.width*2-1,(contact.clientY-r.top)/r.height*2-1];
    }
    function sideOf(id){return ['left','right'].find(side=>input[side]?.id===id);}
    function beginContact(id,side,contact){
      if(!available()||input[side])return false;
      originX[side]=contact.clientX;
      return input.down(id,side,...point(side,contact),performance.now());
    }
    function endContact(id,cancel){
      if(!sideOf(id))return false;
      input.up(id,performance.now(),cancel);return true;
    }
    function flush(force=false){paint();send(input.packet(performance.now()),force);}
    function reconcileTouches(touches){
      const live=new Set(Array.from(touches,t=>'touch:'+t.identifier));
      let changed=false;
      for(const side of ['left','right']){
        const id=input[side]?.id;
        if(typeof id==='string'&&id.startsWith('touch:')&&!live.has(id))changed=endContact(id,true)||changed;
      }
      return changed;
    }
    // Touch identifiers are NOT PointerEvent.pointerId. Use the actual finger
    // lifecycle, globally, so release does not depend on pointer capture or on
    // the finger still being over its original button. Each event's live list
    // also clears a stale finger before accepting a new one.
    const nativeTouch='ontouchstart' in window;
    if(nativeTouch){
      window.addEventListener('touchstart',e=>{
        let changed=reconcileTouches(e.touches),handled=false;
        for(const touch of Array.from(e.changedTouches)){
          const id='touch:'+touch.identifier;
          // A fresh touchstart may reuse an identifier whose earlier touchend
          // was lost. It is a new contact, never a continuation of that owner.
          changed=endContact(id,true)||changed;
          const pad=touch.target.closest?.('[data-pad]');
          if(!pad||pads[pad.dataset.pad]!==pad)continue;
          if(beginContact(id,pad.dataset.pad,touch)){changed=true;handled=true;}
        }
        if(handled&&e.cancelable)e.preventDefault();
        if(changed)flush();
      },{capture:true,passive:false});
      window.addEventListener('touchmove',e=>{
        let changed=reconcileTouches(e.touches),handled=false;
        for(const touch of Array.from(e.changedTouches)){
          const id='touch:'+touch.identifier,side=sideOf(id);
          if(!side)continue;
          input.move(id,...point(side,touch));changed=true;handled=true;
        }
        if(handled&&e.cancelable)e.preventDefault();
        if(changed)flush();
      },{capture:true,passive:false});
      for(const type of ['touchend','touchcancel'])window.addEventListener(type,e=>{
        let changed=false;
        for(const touch of Array.from(e.changedTouches))changed=endContact('touch:'+touch.identifier,type==='touchcancel')||changed;
        changed=reconcileTouches(e.touches)||changed;
        // Send the remaining finger's state immediately; do not wait for rAF
        // or disconnect both fingers when only the accelerator finger lifts.
        if(changed)flush(true);
      },{capture:true,passive:true});
    }
    // Mouse/pen (and pointer-only touch environments) keep pointer controls.
    // A native touch must not also start a second, synthetic pointer gesture.
    const usePointer=e=>!(nativeTouch&&e.pointerType==='touch');
    for(const [side,pad] of Object.entries(pads)){
      pad.addEventListener('pointerdown',e=>{
        if(!usePointer(e)||!available())return;
        e.preventDefault();e.stopPropagation();
        const id='pointer:'+e.pointerId;
        if(!beginContact(id,side,e))return;
        try{pad.setPointerCapture(e.pointerId);}catch{endContact(id,true);}
        flush();
      });
      pad.addEventListener('contextmenu',e=>e.preventDefault());
    }
    window.addEventListener('pointermove',e=>{
      if(!usePointer(e))return;
      const id='pointer:'+e.pointerId,side=sideOf(id);
      if(!side)return;
      if(e.buttons===0)endContact(id,true);
      else input.move(id,...point(side,e));
      flush();
    },{capture:true,passive:true});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,e=>{
      if(usePointer(e)&&endContact('pointer:'+e.pointerId,type!=='pointerup'))flush(true);
    },{capture:true,passive:true});
    el('mobile-pause').onclick=()=>{menu=true;syncPause();};
    el('mobile-resume').onclick=()=>{menu=false;canvasFocus();syncPause();};
    function canvasFocus(){el('unity-canvas').focus({preventScroll:true});}
    window.NovetMobileState=next=>{
      if(state.phase!==next.phase)release();state=next;input.charge=next.charge;
      el('mobile-speed').textContent=Math.round(next.speed);
      el('mobile-gear').textContent=next.gear<0?'R':next.gear;
      el('mobile-nitro-fill').style.width=(next.charge*100)+'%';
      el('mobile-nitro-label').textContent=next.boosting?'NITRO 発動中':next.charge>0?'NITRO '+Math.floor(next.charge*100)+'% · Wタップ':'NITRO · 4速からチャージ';
      el('mobile-nitro').classList.toggle('ready',next.charge>0);
      const seconds=Math.max(0,next.seconds);el('mobile-time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+(seconds%60).toFixed(1).padStart(4,'0');
      syncPause();
    };
    document.addEventListener('visibilitychange',()=>{if(document.hidden)menu=true;syncPause();});
    window.addEventListener('blur',()=>{if(state.phase===1){menu=true;syncPause();}});
    window.addEventListener('resize',()=>{release();syncPause();});
    window.visualViewport?.addEventListener('resize',()=>{release();syncPause();});
    window.addEventListener('pagehide',release);
    document.body.classList.add('mobile-playing');
    syncPause();
    function tick(){if(available())send(input.packet(performance.now()));else send({connected:false,axes:[],buttons:[]});requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  };
})();
