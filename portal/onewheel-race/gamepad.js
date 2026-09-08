(() => {
  "use strict";
  window.NovetGamepadBridge = function (game, onStatus) {
    let selected = null, signature = "", lastSent = 0, stopped = false;
    const neutral = {connected:false,axes:[],buttons:[]};
    function send(packet) {
      const value = JSON.stringify(packet), now = performance.now();
      if (value !== signature || now - lastSent > 250) {
        game.SendMessage("BrowserGamepadInput", "Receive", value);
        signature = value; lastSent = now;
      }
    }
    function release() { send(neutral); }
    function poll() {
      if (stopped) return;
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(p => p && p.connected && !/LED Controller|RGB Controller|Lighting Controller/i.test(p.id)) : [];
      const active = pads.find(p => p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .25));
      const pad = active || pads.find(p => p.index === selected) || pads[0];
      if (pad && !document.hidden && document.hasFocus()) {
        selected = pad.index;
        send({connected:true, axes:Array.from(pad.axes).slice(0,4), buttons:Array.from(pad.buttons).slice(0,16).map(b => typeof b === "number" ? b : b.value)});
        onStatus("ゲームパッド接続済み · " + pad.id);
      } else {
        release();
        onStatus(pad ? "ゲーム画面をクリックすると操作できます。" : "ゲームパッドを接続し、ボタンを1回押してください。");
      }
      requestAnimationFrame(poll);
    }
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", () => { if (document.hidden) release(); });
    requestAnimationFrame(poll);
    return () => { stopped = true; release(); window.removeEventListener("blur", release); };
  };
})();
