(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const canvas = el('unity-canvas'), dialog = el('recording-prompt');
  const yes = el('recording-yes'), no = el('recording-no'), message = el('recording-message');
  const status = el('recording-status'), stopButton = el('recording-stop');
  const Audio = window.AudioContext || window.webkitAudioContext;
  const contexts = new Map();
  const clips = [];
  const maxBytes = 128 * 1024 * 1024;
  let game, pending = false, starting = false, recorder = null, session = null;
  let heldBytes = 0, startedAt = 0, tick = null, selected = false;

  // Observe only connections to the game's speaker output. Keep the audible
  // graph unchanged and mirror its final (volume-adjusted) nodes while recording.
  const connect = window.AudioNode?.prototype.connect;
  const disconnect = window.AudioNode?.prototype.disconnect;
  function entry(context) {
    if (!contexts.has(context)) contexts.set(context, {outputs: new Map(), bus: null});
    return contexts.get(context);
  }
  function mirror(node, output, data) {
    if (data.bus) connect.call(node, data.bus, output, 0);
  }
  if (connect && disconnect) {
    AudioNode.prototype.connect = function(target, output = 0, input = 0) {
      const result = connect.apply(this, arguments);
      if (target === this.context.destination) {
        const data = entry(this.context);
        if (!data.outputs.has(this)) data.outputs.set(this, new Set());
        if (!data.outputs.get(this).has(output)) {
          data.outputs.get(this).add(output);
          try { mirror(this, output, data); } catch (error) { console.warn('Recording audio connection:', error); }
        }
      }
      return result;
    };
    AudioNode.prototype.disconnect = function(target, output) {
      const result = disconnect.apply(this, arguments);
      const data = contexts.get(this.context), outputs = data?.outputs.get(this);
      if (outputs && (!arguments.length || typeof target === 'number' || target === this.context.destination)) {
        const only = typeof target === 'number' ? target : output;
        for (const port of [...outputs]) if (only === undefined || only === port) {
          if (data.bus) { try { disconnect.call(this, data.bus, port, 0); } catch {} }
          outputs.delete(port);
        }
        if (!outputs.size) data.outputs.delete(this);
      }
      return result;
    };
  }
  function supportError() {
    if (!window.MediaRecorder || !canvas.captureStream || !Audio || !Audio.prototype.createMediaStreamDestination)
      return 'このブラウザでは音声付き録画を利用できません。NOでゲームを始められます。';
    if (heldBytes >= maxBytes)
      return '録画の一時保存容量がいっぱいです。動画を端末へ保存してから、ページを開き直してください。NOで続けられます。';
    return '';
  }
  function cleanup(s) {
    if (!s) return;
    clearInterval(tick); tick = null;
    for (const data of contexts.values()) if (data.bus) {
      for (const [node, outputs] of data.outputs) for (const output of outputs) {
        try { disconnect.call(node, data.bus, output, 0); } catch {}
      }
      data.bus.stream.getTracks().forEach(track => track.stop()); data.bus = null;
    }
    s.stream?.getTracks().forEach(track => track.stop());
    s.mix?.close().catch(() => {});
  }
  function proceed(choice) {
    if (!pending) return;
    pending = false; selected = true; dialog.hidden = true;
    game.SendMessage('BrowserRaceRecording', 'RecordingDecision', choice);
    canvas.focus({preventScroll: true});
  }
  function addDownload(blob, warning) {
    if (!blob.size) { status.textContent = '録画データを保存できませんでした。'; return; }
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const name = 'OneWheel-' + new Date().toISOString().replace(/[:.]/g, '-') + '.' + extension;
    const url = URL.createObjectURL(blob); clips.push({url, name});
    const link = document.createElement('a'); link.href = url; link.download = name;
    link.textContent = '動画 ' + clips.length + ' を保存 (' + (blob.size / 1048576).toFixed(1) + ' MB)';
    el('recording-downloads').appendChild(link);
    el('recording-files').hidden = false;
    status.textContent = warning || '録画完了。「動画を保存」から端末へ保存してください。';
  }
  function finish(reason = '') {
    if (!recorder || recorder.state === 'inactive') return;
    session.warning = reason;
    stopButton.disabled = true; status.textContent = '動画を準備しています…';
    recorder.stop();
  }
  async function start() {
    if (starting || !pending || session) return;
    const unsupported = supportError();
    if (unsupported) { message.textContent = unsupported; yes.disabled = true; return; }
    starting = true; yes.disabled = no.disabled = true; message.textContent = '音声付き録画を準備しています…';
    const s = {stream: null, mix: null, chunks: [], bytes: 0, warning: '', failed: false};
    session = s;
    try {
      const sources = [...contexts.entries()].filter(([context, data]) => context.state !== 'closed' && data.outputs.size);
      if (!sources.length) throw new Error('ゲーム音声を取得できませんでした。');
      // resume() is called directly from YES's click so mobile Safari receives
      // the required user gesture. No microphone or screen-sharing permission.
      s.mix = new Audio();
      const resumes = [s.mix.resume(), ...sources.map(([context]) => context.resume())];
      const output = s.mix.createMediaStreamDestination();
      for (const [context, data] of sources) {
        data.bus = context.createMediaStreamDestination();
        for (const [node, outputs] of data.outputs) for (const port of outputs) mirror(node, port, data);
        s.mix.createMediaStreamSource(data.bus.stream).connect(output);
      }
      let timeout;
      try {
        await Promise.race([Promise.all(resumes), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('音声を開始できませんでした。')), 5000); })]);
      } finally { clearTimeout(timeout); }
      if (s.mix.state !== 'running' || sources.some(([context]) => context.state !== 'running')) throw new Error('ゲーム音声を開始できませんでした。');
      s.stream = canvas.captureStream(30);
      output.stream.getAudioTracks().forEach(track => s.stream.addTrack(track));
      if (!s.stream.getVideoTracks().length || !s.stream.getAudioTracks().length) throw new Error('映像または音声を取得できませんでした。');
      const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const options = {videoBitsPerSecond: window.novetMobileMode ? 2000000 : 4000000, audioBitsPerSecond: 128000};
      if (mime) options.mimeType = mime;
      const r = new MediaRecorder(s.stream, options); recorder = r;
      r.ondataavailable = event => {
        if (event.data.size) { s.chunks.push(event.data); s.bytes += event.data.size; heldBytes += event.data.size; }
        if (heldBytes >= maxBytes) finish('一時保存容量の上限で録画を終了しました。動画を保存してください。');
      };
      r.onerror = () => {
        s.failed = true; s.warning = '録画中にエラーが発生しました。保存できた部分の動画を確認してください。';
        if (starting) return;
        status.textContent = s.warning;
        if (r.state !== 'inactive') finish(s.warning);
      };
      r.onstop = () => {
        cleanup(s); recorder = null; session = null; stopButton.hidden = true;
        addDownload(new Blob(s.chunks, {type: r.mimeType || s.chunks[0]?.type || 'video/webm'}), s.warning);
        s.chunks.length = 0;
        if (pending) { message.textContent = supportError(); yes.disabled = !!message.textContent; }
      };
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('録画の開始がタイムアウトしました。')), 5000);
        r.addEventListener('start', () => { clearTimeout(timeout); resolve(); }, {once: true});
        r.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('この端末で録画を開始できませんでした。')); }, {once: true});
        try { r.start(1000); } catch (error) { clearTimeout(timeout); reject(error); }
      });
      if (s.failed || r.state !== 'recording') throw new Error('録画を開始できませんでした。');
      startedAt = performance.now(); stopButton.hidden = false; stopButton.disabled = false;
      el('recording-tools').hidden = false;
      const update = () => {
        const seconds = Math.floor((performance.now() - startedAt) / 1000);
        status.textContent = '● 音声付き録画中 ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
        if (seconds >= 600) finish('10分に達したため録画を終了しました。動画を保存してください。');
      };
      update(); tick = setInterval(update, 1000);
      proceed('yes');
    } catch (error) {
      if (recorder) { recorder.onstop = recorder.ondataavailable = recorder.onerror = null; if (recorder.state !== 'inactive') recorder.stop(); }
      cleanup(s); recorder = null; session = null; heldBytes -= s.bytes;
      message.textContent = (error.message || '録画を開始できませんでした。') + ' NOでゲームを始められます。';
      yes.disabled = true;
    } finally { starting = false; no.disabled = false; }
  }
  yes.addEventListener('click', start);
  no.addEventListener('click', () => { if (!starting) proceed('no'); });
  stopButton.addEventListener('click', () => finish());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !starting) { event.preventDefault(); proceed('no'); }
    if (event.key === 'Tab') {
      const buttons = [...dialog.querySelectorAll('button:not(:disabled),a[href]')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
  });
  window.addEventListener('pagehide', () => { if (recorder?.state === 'recording') finish(); });
  window.addEventListener('beforeunload', event => {
    if (recorder || clips.length) { event.preventDefault(); event.returnValue = ''; }
  });
  window.NovetRaceRecording = {
    attach(instance) { game = instance; },
    ask() {
      pending = true; selected = false; dialog.hidden = false;
      message.textContent = session ? '前の録画を準備しています…' : supportError(); yes.disabled = !!message.textContent; no.disabled = false;
      el('recording-previous').replaceChildren();
      for (const clip of clips) {
        const link = document.createElement('a'); link.href = clip.url; link.download = clip.name;
        link.textContent = '前の録画を保存'; el('recording-previous').appendChild(link);
      }
      no.focus({preventScroll: true});
    },
    finish() { finish(); },
    // Read-only state also makes the real browser integration verifiable.
    get state() { return {pending, starting, selected, recording: recorder?.state === 'recording', audioTracks: session?.stream?.getAudioTracks().length || 0, videoTracks: session?.stream?.getVideoTracks().length || 0, clips: clips.length}; }
  };
})();
