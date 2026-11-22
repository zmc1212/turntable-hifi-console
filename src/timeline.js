/* 时间线：底座 → 轴承 → 转盘 → 电机皮带 → 音臂 → 唱头 → 唱片 → 放唱（44s 循环） */
(function (TT33) {
  var phases = [
    { id: "plinth", name: "PLINTH · WALNUT BOX", dur: 4, dot: "gold",
      camA: { theta: -0.55, phi: 0.92, r: 7.4, target: [0, 0.35, 0] },
      camB: { theta: -1.15, phi: 1.06, r: 3.6, target: [-0.5, 0.33, 0.35] }, drift: 0.03 },
    { id: "bearing", name: "BEARING · BRASS + STEEL", dur: 5, dot: "silver",
      camA: { theta: -0.35, phi: 0.52, r: 3.0, target: [0, 0.36, 0.02] },
      camB: { theta: -1.0, phi: 1.1, r: 2.2, target: [0, 0.4, 0.02] }, drift: 0.012 },
    { id: "platter", name: "PLATTER + RUBBER MAT", dur: 5, dot: "silver",
      camA: { theta: -0.75, phi: 0.62, r: 4.8, target: [0, 0.4, 0.02] },
      camB: { theta: -1.5, phi: 1.12, r: 3.6, target: [0.3, 0.42, 0.4] }, drift: 0.02 },
    { id: "motor", name: "MOTOR + BELT · 33⅓", dur: 6, dot: "teal",
      camA: { theta: -0.3, phi: 0.4, r: 3.4, target: [-0.6, 0.36, -0.45] },
      camB: { theta: -1.05, phi: 0.95, r: 2.9, target: [-0.45, 0.4, -0.3] }, drift: 0.015 },
    { id: "arm", name: "TONEARM · BALANCE", dur: 6, dot: "blue",
      camA: { theta: -2.45, phi: 0.8, r: 5.0, target: [0.6, 0.5, -0.45] },
      camB: { theta: -2.95, phi: 1.0, r: 2.7, target: [0.85, 0.55, -0.6] }, drift: 0.015 },
    { id: "cartridge", name: "HEADSHELL + STYLUS", dur: 5, dot: "rust",
      camA: { theta: -2.2, phi: 1.0, r: 2.6, target: [0.04, 0.53, -0.92] },
      camB: { theta: -2.7, phi: 1.15, r: 1.7, target: [0.04, 0.52, -0.92] }, drift: 0.01 },
    { id: "record", name: "LP + CLAMP · SPIN-UP", dur: 6, dot: "green",
      camA: { theta: -0.5, phi: 0.38, r: 4.0, target: [0, 0.48, 0.02] },
      camB: { theta: -1.25, phi: 0.88, r: 3.3, target: [0, 0.48, 0.02] }, drift: 0.02 },
    { id: "play", name: "PLAY · STYLUS DOWN", dur: 7, dot: "gold",
      camA: { theta: -0.85, phi: 0.9, r: 6.0, target: [0, 0.44, 0.05] },
      camB: { theta: -1.7, phi: 0.98, r: 3.7, target: [-0.1, 0.48, -0.25] }, drift: 0.02 }
  ];

  var PARK_S = TT33.Parts.CONST.PARK_S;
  var LEAD_S = TT33.Parts.CONST.LEAD_S;

  var PINNED = {
    plinth: function () {
      return [{ id: "pin-plinth", obj: TT33.Parts.group("plinth"), text: "WALNUT PLINTH · 8.2 KG", sub: "4 ISOLATION FEET" }];
    },
    motor: function () {
      return [
        { id: "pin-motor", obj: TT33.Parts.group("motor"), text: "SYNC MOTOR · 16 POLE" },
        { id: "pin-belt", obj: TT33.Parts.group("belt"), text: "FLAT BELT · ≈930 MM", tone: "white" }
      ];
    },
    play: function () {
      return [
        { id: "pin-arm", obj: TT33.Parts.group("arm"), text: "TRACKING · 1.8 g", sub: "ANTI-SKATE 0.5 g" },
        { id: "pin-rec", obj: TT33.Parts.group("record"), text: "33⅓ RPM · SIDE A", tone: "white" }
      ];
    }
  };

  var idx = -1, pt = 0, paused = false;
  var st = {};
  var dom = {};

  function resetState() {
    st = {
      time: 0, rpm: 0, s: PARK_S, cue: 0, audio: 0, wf: 0.006,
      parts: 0, mode: "BUILD", stylusDown: false, recordOn: false,
      cartOn: false, sCm: 30, cueUp: false, locked: false, vtf: 1.8
    };
  }

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    dom = {
      mode: $("st-mode"), rpm: $("st-rpm"), stylus: $("st-stylus"), parts: $("st-parts"),
      pill: $("phase-text"), dot: $("phase-dot")
    };
  }

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function enterPhase(i) {
    idx = i; pt = 0;
    var ph = phases[i];
    TT33.Parts.beginPhase();
    if (ph.id === "play") st.rpm = 33.333;    // 放唱阶段转速已在位（跳阶段也成立）
    var pins = PINNED[ph.id];
    TT33.Labels.setPinned(pins ? pins() : []);
  }

  function restartCycle() {
    TT33.Parts.reset();
    TT33.Labels.clearAnnounce();
    resetState();
    enterPhase(0);
  }

  /* ---- 各阶段状态推进 ---- */
  function computeState() {
    st.parts = TT33.Parts.seatedCount;
    st.cartOn = idx > 5 || (idx === 5 && pt > 3.35);
    st.recordOn = idx > 6 || (idx === 6 && pt > 2.4);
    st.sCm = (st.s / LEAD_S) * 30;             // 引入槽外圈记作 Ø30cm
    st.cueUp = st.cue > 0.5;
    st.locked = st.rpm > 32.6 && Math.abs(st.rpm - 33.333) < 0.25;

    /* 转速：唱片阶段按下 START 后爬升，放唱阶段稳速微抖 */
    if (idx === 6) {
      var u = Math.min(1, Math.max(0, (pt - 3.7) / 2.0));
      st.rpm = 33.333 * smooth(u) + 1.4 * Math.sin(Math.min(1, u) * Math.PI) * (1 - u);
    } else if (idx === 7) {
      st.rpm = 33.333 + (st.stylusDown ? 0.02 * Math.sin(st.time * 3.1) + 0.014 * Math.sin(st.time * 7.3) : 0);
    } else {
      st.rpm = 0;
    }

    /* 抖晃率：起步 transient + 放唱后的细纹摆动 */
    var spinUp = st.rpm > 1 ? Math.max(0, 1 - st.rpm / 33.333) : 0;
    st.wf = 0.005
      + 0.05 * spinUp
      + st.audio * (0.012 + 0.008 * Math.sin(st.time * 2.3) + 0.006 * Math.sin(st.time * 5.7) + 0.004 * Math.sin(st.time * 11));

    /* MODE */
    st.mode = idx < 6 ? "BUILD" : (idx === 6 ? "START" : "PLAYING");
  }

  function update(dt) {
    if (paused) return;
    dt = Math.min(dt, 0.05);
    st.time += dt;
    pt += dt;

    var ph = phases[idx];
    if (pt >= ph.dur) {
      if (idx >= phases.length - 1) { restartCycle(); }
      else { enterPhase(idx + 1); }
      ph = phases[idx];
    }

    /* 针尖半径 / 升降杆目标 */
    if (idx === 7) {
      if (pt < 0.6) { st.s = PARK_S; st.cue = 1; }
      else if (pt < 2.0) { st.s = PARK_S + (LEAD_S - PARK_S) * smooth((pt - 0.6) / 1.4); st.cue = 1; }
      else if (pt < 2.6) { st.s = LEAD_S; st.cue = 1 - smooth((pt - 2.0) / 0.6); }
      else {
        st.s = LEAD_S - 0.085 * Math.min(1, (pt - 2.6) / 4.4);   // 极慢内移（循迹）
        st.cue = 0;
      }
      st.stylusDown = pt > 2.6;
      st.audio = st.stylusDown ? smooth((pt - 2.6) / 1.3) : 0;
    } else {
      st.s = PARK_S;
      st.cue = (idx === 5 && pt > 3.5 && pt < 4.7) ? 1 : 0;       // 升降杆起落演示
      st.stylusDown = false;
      st.audio = 0;
    }

    computeState();
    TT33.Parts.update(ph.id, pt, dt, { s: st.s, cue: st.cue, rpm: st.rpm });

    /* 相机：阶段内 A → B 推镜 + 缓慢环绕 */
    var c = Math.min(1, pt / (ph.dur * 0.85));
    var k = smooth(c);
    var A = ph.camA, B = ph.camB;
    TT33.orbitCtl.flyTo({
      theta: A.theta + (B.theta - A.theta) * k,
      phi: A.phi + (B.phi - A.phi) * k,
      r: A.r + (B.r - A.r) * k,
      target: [
        A.target[0] + (B.target[0] - A.target[0]) * k,
        A.target[1] + (B.target[1] - A.target[1]) * k,
        A.target[2] + (B.target[2] - A.target[2]) * k
      ]
    });
    TT33.orbitCtl.autoDrift = ph.drift;

    /* DOM 状态卡 / 阶段胶囊 / 仪表盘 */
    dom.mode.textContent = st.mode;
    dom.mode.className = "mode" + (st.mode === "PLAYING" ? " playing" : "");
    dom.rpm.textContent = st.rpm.toFixed(2);
    dom.stylus.textContent = st.cartOn ? (st.stylusDown ? "DOWN" : "UP") : "—";
    dom.parts.textContent = st.parts + " / 10";
    dom.pill.textContent = ph.name;
    dom.dot.className = ph.dot;
    TT33.Dashboard.update(st, dt);
  }

  TT33.Timeline = {
    init: function () {
      resetState();
      cacheDom();
    },
    start: function () {
      enterPhase(0);
    },
    restart: restartCycle,
    /* 跳转到指定阶段（调试 / 键盘 1-8） */
    seek: function (id) {
      var i = -1;
      for (var k = 0; k < phases.length; k++) if (phases[k].id === id) i = k;
      if (i < 0) return;
      TT33.Parts.reset();
      TT33.Labels.clearAnnounce();
      resetState();
      if (i >= 1) TT33.Parts.sealUpTo(i);
      enterPhase(i);
    },
    update: update,
    togglePause: function () { paused = !paused; return paused; },
    get paused() { return paused; },
    get phaseId() { return phases[idx] ? phases[idx].id : ""; }
  };
})(window.TT33 = window.TT33 || {});
