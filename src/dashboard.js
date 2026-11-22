/* 底部五仪表盘：转速表 · 抖晃率 · 音频频谱 · 循迹力 · 唱片位置 */
(function (TT33) {
  var el = {};
  var ctxSpeed, ctxWf, ctxAudio, ctxGroove;
  var W = {}, H = {};
  var wfHist = [];
  var WF_MAX = 170;

  function mkCanvas(id, h) {
    var c = document.getElementById(id);
    var w = c.clientWidth || 200;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = h * dpr;
    c.style.height = h + "px";
    var ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    W[id] = w; H[id] = h;
    return ctx;
  }

  function buildDOM() {
    var dash = document.getElementById("dash");
    dash.innerHTML =
      '<section class="panel"><header><i class="dot gold"></i><b>SPEED</b><span class="meta">QUARTZ · ±0.1%</span></header>' +
      '<div class="body"><div class="big-row"><span class="v" id="sp-val">0.00 <small>RPM</small></span>' +
      '<span class="chip" id="sp-lock">LOCK</span></div><canvas id="c-speed"></canvas></div></section>' +

      '<section class="panel"><header><i class="dot teal"></i><b>WOW &amp; FLUTTER</b><span class="meta">±0.05% WRMS</span></header>' +
      '<div class="body"><div class="big-row"><span class="v" id="wf-val">0.000 <small>%</small></span>' +
      '<span class="chip" id="wf-chip">STABLE</span></div><canvas id="c-wf"></canvas></div></section>' +

      '<section class="panel"><header><i class="dot rust"></i><b>AUDIO · PHONO</b><span class="meta">MM · L/R</span></header>' +
      '<div class="body"><canvas id="c-audio"></canvas>' +
      '<div class="axis"><span id="au-l">L —∞ dB</span><span id="au-r">R —∞ dB</span></div></div></section>' +

      '<section class="panel"><header><i class="dot silver"></i><b>TRACKING FORCE</b><span class="meta">VTF</span></header>' +
      '<div class="body"><div class="big-row"><span class="v" id="tf-val">— <small>g</small></span>' +
      '<span class="chip" id="tf-cue">CUE</span></div>' +
      '<div class="tf-bar"><i id="tf-bar"></i></div>' +
      '<div class="tf-rows"><div class="r"><span>ANTI-SKATE</span><b id="tf-as">—</b></div>' +
      '<div class="r"><span>STYLUS</span><b id="tf-st">—</b></div></div></div></section>' +

      '<section class="panel"><header><i class="dot blue"></i><b>GROOVE POSITION</b><span class="meta">Ø 30 → 6 cm</span></header>' +
      '<div class="body"><canvas id="c-groove"></canvas>' +
      '<div class="gv-rows"><span class="v" id="gv-val">— <small>cm</small></span><span class="trk" id="gv-trk">TRACK —</span></div>' +
      '</div></section>';

    ctxSpeed = mkCanvas("c-speed", 72);
    ctxWf = mkCanvas("c-wf", 72);
    ctxAudio = mkCanvas("c-audio", 72);
    ctxGroove = mkCanvas("c-groove", 72);
  }

  /* ---- ① 转速表：0-50 圆盘指针 ---- */
  function drawSpeed(rpm, locked) {
    var ctx = ctxSpeed, w = W["c-speed"], h = H["c-speed"];
    var cx = w / 2, cy = h - 8, R = Math.min(w * 0.42, h - 14);
    ctx.fillStyle = "#16130e";
    ctx.fillRect(0, 0, w, h);
    var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;   // 270° 量程
    function ang(v) { return a0 + (v / 50) * (a1 - a0); }
    // 刻度
    for (var v = 0; v <= 50; v += 5) {
      var a = ang(v), major = v % 10 === 0;
      ctx.strokeStyle = major ? "rgba(234,228,214,0.8)" : "rgba(234,228,214,0.35)";
      ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.lineTo(cx + Math.cos(a) * (R - (major ? 7 : 4)), cy + Math.sin(a) * (R - (major ? 7 : 4)));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = "rgba(234,228,214,0.55)";
        ctx.font = "7.5px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(v), cx + Math.cos(a) * (R - 13), cy + Math.sin(a) * (R - 13) + 3);
      }
    }
    // 45 转区（橙）+ 33⅓ 目标标记
    ctx.strokeStyle = "rgba(196,80,46,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, ang(36), ang(45));
    ctx.stroke();
    var am = ang(33.333);
    ctx.fillStyle = "#a98a3d";
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(am) * (R + 1), cy + Math.sin(am) * (R + 1));
    ctx.lineTo(cx + Math.cos(am - 0.045) * (R - 6), cy + Math.sin(am - 0.045) * (R - 6));
    ctx.lineTo(cx + Math.cos(am + 0.045) * (R - 6), cy + Math.sin(am + 0.045) * (R - 6));
    ctx.fill();
    // 指针
    var av = ang(Math.max(0, Math.min(50, rpm)));
    ctx.strokeStyle = locked ? "#a98a3d" : "#d8d3c2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(av) * (R - 8), cy + Math.sin(av) * (R - 8));
    ctx.stroke();
    ctx.fillStyle = "#26231e";
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a98a3d"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(234,228,214,0.4)";
    ctx.font = "7.5px monospace";
    ctx.textAlign = "center";
    ctx.fillText("0 — 50 RPM", cx, h - 1);
  }

  /* ---- ② 抖晃率曲线 ±0.05% ---- */
  function drawWF() {
    var ctx = ctxWf, w = W["c-wf"], h = H["c-wf"];
    ctx.fillStyle = "#16130e";
    ctx.fillRect(0, 0, w, h);
    var mid = h / 2, amp = h * 0.36;
    ctx.fillStyle = "rgba(169,138,61,0.10)";
    ctx.fillRect(0, mid - amp, w, amp * 2);
    ctx.strokeStyle = "rgba(234,228,214,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, mid - amp); ctx.lineTo(w, mid - amp); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, mid + amp); ctx.lineTo(w, mid + amp); ctx.stroke();
    ctx.fillStyle = "rgba(234,228,214,0.35)";
    ctx.font = "7.5px monospace"; ctx.textAlign = "left";
    ctx.fillText("+0.05", 3, mid - amp - 2);
    ctx.fillText("−0.05", 3, mid + amp + 8);
    var n = wfHist.length;
    if (n > 1) {
      ctx.strokeStyle = "#a98a3d";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var x = (i / (WF_MAX - 1)) * w;
        var y = mid - Math.max(-1, Math.min(1, wfHist[i] / 0.05)) * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ---- ③ 音频频谱（双声道柱状，正弦叠加模拟器乐） ---- */
  function drawAudio(st) {
    var ctx = ctxAudio, w = W["c-audio"], h = H["c-audio"];
    ctx.fillStyle = "#16130e";
    ctx.fillRect(0, 0, w, h);
    var mid = h / 2, n = 26, bw = w / n;
    var t = st.t;
    for (var i = 0; i < n; i++) {
      var bass = i < 5 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 4.3)) : 1;
      var vl = st.audio * (0.14 + 0.86 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 0.66)) * (0.55 + 0.45 * Math.sin(t * 1.31 + i * 0.23))) * bass;
      var vr = st.audio * (0.14 + 0.86 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 0.83)) * (0.55 + 0.45 * Math.sin(t * 1.19 + i * 0.31))) * bass;
      vl = Math.max(0.015, Math.min(1, vl)); vr = Math.max(0.015, Math.min(1, vr));
      var x = i * bw + 1, b = bw - 2.5;
      ctx.fillStyle = "rgba(196,80,46,0.85)";
      ctx.fillRect(x, mid - 1.5 - vl * (mid - 8), b, vl * (mid - 8));
      ctx.fillStyle = "rgba(169,138,61,0.8)";
      ctx.fillRect(x, mid + 1.5, b, vr * (mid - 8));
    }
    ctx.strokeStyle = "rgba(234,228,214,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
  }

  /* ---- ⑤ 唱片位置：30 → 6 cm 弧线指示 ---- */
  function drawGroove(sCm, active) {
    var ctx = ctxGroove, w = W["c-groove"], h = H["c-groove"];
    ctx.fillStyle = "#16130e";
    ctx.fillRect(0, 0, w, h);
    var cx = w * 0.34, cy = h / 2, R = Math.min(h * 0.44, w * 0.2);
    // 盘面 / 纹区 / 标签
    ctx.fillStyle = "rgba(234,228,214,0.08)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(234,228,214,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(234,228,214,0.16)";
    for (var k = 1; k <= 3; k++) {
      ctx.beginPath(); ctx.arc(cx, cy, R * (0.32 + 0.17 * k), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(196,80,46,0.75)";
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.213, 0, Math.PI * 2); ctx.fill();
    // 针位弧线（从外圈扫到当前位置）
    var frac = Math.max(0.213, Math.min(1, sCm / 30));
    if (active) {
      ctx.strokeStyle = "rgba(169,138,61,0.9)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, R * frac, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 1.4);
      ctx.stroke();
    }
    // 针位标记
    var aa = -Math.PI * 0.5 + Math.PI * 1.4 * (active ? 1 : 0.62);
    ctx.fillStyle = active ? "#e8c464" : "rgba(234,228,214,0.45)";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(aa) * R * frac, cy + Math.sin(aa) * R * frac, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // 比例尺
    ctx.strokeStyle = "rgba(234,228,214,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h - 12); ctx.lineTo(w * 0.94, h - 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(234,228,214,0.5)";
    ctx.font = "7.5px monospace"; ctx.textAlign = "left";
    ctx.fillText("Ø30", w * 0.62, h - 15);
    ctx.textAlign = "right";
    ctx.fillText("Ø6", w * 0.94, h - 15);
  }

  function update(st, dt) {
    st.t = (st.t || 0) + dt;

    /* ① 转速 */
    document.getElementById("sp-val").innerHTML = st.rpm.toFixed(2) + " <small>RPM</small>";
    document.getElementById("sp-lock").className = "chip" + (st.locked ? " on" : "");
    drawSpeed(st.rpm, st.locked);

    /* ② 抖晃率 */
    wfHist.push(st.wf);
    if (wfHist.length > WF_MAX) wfHist.shift();
    document.getElementById("wf-val").innerHTML = st.wf.toFixed(3) + " <small>%</small>";
    document.getElementById("wf-chip").className = "chip" + (st.wf > 0.04 ? " hot" : (st.locked ? " on" : ""));
    document.getElementById("wf-chip").textContent = st.wf > 0.04 ? "SPIN-UP" : (st.locked ? "STABLE" : "IDLE");
    drawWF();

    /* ③ 音频频谱 */
    drawAudio(st);
    var lAvg = st.audio * 0.62, rAvg = st.audio * 0.58;
    var lDb = st.audio > 0.03 ? (20 * Math.log10(Math.max(0.003, lAvg))).toFixed(0) : "—∞";
    var rDb = st.audio > 0.03 ? (20 * Math.log10(Math.max(0.003, rAvg))).toFixed(0) : "—∞";
    document.getElementById("au-l").textContent = "L " + lDb + " dB";
    document.getElementById("au-r").textContent = "R " + rDb + " dB";

    /* ④ 循迹力 */
    document.getElementById("tf-val").innerHTML = (st.cartOn ? st.vtf.toFixed(1) : "—") + " <small>g</small>";
    document.getElementById("tf-bar").style.width = (st.cartOn ? (st.vtf / 2.5) * 100 : 0) + "%";
    document.getElementById("tf-as").textContent = st.cartOn ? "0.5 g" : "—";
    document.getElementById("tf-st").textContent = st.cartOn ? (st.stylusDown ? "DOWN · IN GROOVE" : "UP · CLEAR") : "—";
    document.getElementById("tf-cue").className = "chip" + (st.cueUp ? " on" : "");
    document.getElementById("tf-cue").textContent = st.cartOn ? (st.cueUp ? "CUE UP" : "CUE DOWN") : "CUE";

    /* ⑤ 唱片位置 */
    var active = st.stylusDown;
    document.getElementById("gv-val").innerHTML = (active || st.recordOn ? st.sCm.toFixed(1) : "—") + " <small>cm</small>";
    var trk = active ? ("TRACK 0" + Math.min(6, 1 + Math.floor(Math.max(0, (30 - st.sCm)) / 4))) : "TRACK —";
    document.getElementById("gv-trk").textContent = trk;
    drawGroove(st.sCm, active);
  }

  TT33.Dashboard = { build: buildDOM, update: update };
})(window.TT33 = window.TT33 || {});
