(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const canvas = el("unity-canvas"), frame = el("game-frame");
  let instance = null, loading = false, failed = false;
  function fail(message) {
    failed = true; el("loading").hidden = true; el("launch-screen").hidden = true;
    el("error").hidden = false; el("error-message").textContent = message;
    el("fullscreen").disabled = true; document.body.dataset.gameState = "error";
  }
  el("retry").addEventListener("click", () => location.reload());
  el("launch").addEventListener("click", () => {
    if (loading || instance) return;
    loading = true; el("launch-screen").hidden = true; el("loading").hidden = false;
    document.body.dataset.gameState = "loading";
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2");
    if (!context || typeof WebAssembly === "undefined") {
      fail("この環境ではゲームを起動できません。PCの最新版Chrome・Edgeで、グラフィックアクセラレーションを有効にしてお試しください。"); return;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();
    const build = window.novetRaceBuild;
    build.config.showBanner = (message, type) => {
      if (type === "error") { console.error(message); fail("ゲームの起動中に問題が発生しました。ページを再読み込みしてください。"); }
      else console.warn(message);
    };
    const script = document.createElement("script"); script.src = build.loaderUrl;
    script.onerror = () => fail("ゲームデータを読み込めませんでした。通信状態を確認して再読み込みしてください。");
    script.onload = () => {
      createUnityInstance(canvas, build.config, value => {
        const percent = Math.round(value * 100); el("progress").value = percent;
        el("load-status").textContent = percent >= 90 ? "ゲームを準備しています… " + percent + "%" : percent + "%";
      }).then(game => {
        instance = game;
        if (failed) return;
        el("loading").hidden = true; el("fullscreen").disabled = !document.fullscreenEnabled;
        document.body.dataset.gameState = "ready"; canvas.focus({preventScroll:true});
        frame.scrollIntoView({block:"start",behavior:"smooth"});
      }).catch(error => { console.error(error); fail("ゲームの起動に失敗しました。通信状態を確認し、ページを再読み込みしてください。"); });
    };
    document.body.appendChild(script);
  });
  el("fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen();
      canvas.focus({preventScroll:true});
    } catch { el("controller-status").textContent = "全画面にできませんでした。通常画面でも遊べます。"; }
  });
  document.addEventListener("fullscreenchange", () => { el("fullscreen").textContent = document.fullscreenElement ? "全画面を終了" : "全画面"; });
  canvas.addEventListener("pointerdown", () => canvas.focus({preventScroll:true}));
  canvas.addEventListener("keydown", e => { if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); });
  let connected = null;
  function updateController() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    const next = pads.some(pad => pad && pad.connected);
    if (next !== connected) {
      connected = next;
      el("controller-status").textContent = next ? "ゲームパッド接続済み · 操作は画面下で確認できます。" : "ゲームパッドを接続し、ボタンを1回押してください。";
    }
  }
  window.addEventListener("gamepadconnected",updateController);
  window.addEventListener("gamepaddisconnected",updateController);
  setInterval(updateController,1000); updateController();
})();
