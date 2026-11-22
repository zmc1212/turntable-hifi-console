/* 零件建模 + 8 阶段装配编排（底座/轴承/转盘/电机皮带/音臂/唱头/唱片/播放） */
(function (TT33) {
  /* ---- 布局常量（与 timeline/dashboard 共享的几何约定） ---- */
  var TOP_Y = 0.34;                    // 底座顶面
  var C = { x: 0, z: 0.02 };           // 主轴/转盘中心 (xz)
  var U = { x: -0.79864, z: -0.60182 };// 电机方向（方位角 217°，指向左后）
  var PX = C.x + U.x * 0.82, PZ = C.z + U.z * 0.82;  // 电机轮中心
  var RB = 0.808, RP = 0.072;          // 皮带在转盘/电机轮上的回绕半径
  var BELT_Y = 0.385;                  // 皮带平面高度
  var PIVOT = { x: 1.02, z: -0.70 };   // 音臂支轴
  var ARM_L = 1.0089;                  // 支轴到针尖的有效臂长
  var PARK_S = 0.94, LEAD_S = 0.705;   // 停放/引入槽的针尖半径（距盘心）
  var D0 = Math.hypot(PIVOT.x - C.x, PIVOT.z - C.z);
  var AZ0 = Math.atan2(C.z - PIVOT.z, C.x - PIVOT.x);

  var M = null, mk = null;
  var list = [];          // {id,name,sub,group,appear}
  var refs = {};          // 动画子组引用
  var seatedCount = 0;
  var platterAngle = 0, platterHand = 0, pulleySpin = 0;
  var armAttachY = 0.26, armYawExtra = 0, armTilt = 0, cueSm = 0, bounceY = 0;
  var beltTotal = 0;
  var flags = {};

  /* ---- 小工具 ---- */
  function seg(pt, a, b) { return Math.max(0, Math.min(1, (pt - a) / (b - a))); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function backOut(t) { var c = 1.35; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function ann(key, obj, text, sub, tone) {
    if (flags[key]) return;
    flags[key] = true;
    TT33.Labels.announce(key, obj, text, sub, performance.now(), 2500, tone);
  }

  function setAnchor(obj, x, y, z) { obj.userData.tagAnchor = new THREE.Vector3(x, y, z); }

  /* 圆角矩形 Shape（world: x/z，shape 里 y = -z） */
  function roundedRect(w, d, r) {
    var s = new THREE.Shape();
    var x = w / 2, y = d / 2;
    s.moveTo(-x + r, -y);
    s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    return s;
  }

  /* 音臂偏航角：针尖距盘心 s 时臂的朝向（σ=+1 侧，停放在盘后方） */
  function yawFor(s) {
    var g = Math.acos(clamp((D0 * D0 + ARM_L * ARM_L - s * s) / (2 * D0 * ARM_L), -1, 1));
    var az = AZ0 + g;
    var sx = PIVOT.x + Math.cos(az) * ARM_L, sz = PIVOT.z + Math.sin(az) * ARM_L;
    return Math.atan2(-(sz - PIVOT.z), sx - PIVOT.x);
  }

  /* ============ 底座（胡桃木箱体 + 4 避震脚） ============ */
  function buildPlinth() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRect(2.7, 2.05, 0.16), { depth: 0.18, bevelEnabled: false, curveSegments: 48 }),
      M.walnut);
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0.10;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // 顶板：留出转盘井（圆孔）与电机仓（斜矩形孔）
    var top = roundedRect(2.7, 2.05, 0.16);
    var well = new THREE.Path();
    well.absarc(C.x, -C.z, 0.90, 0, Math.PI * 2, true);
    top.holes.push(well);
    var bayC = { x: C.x + U.x * 1.10, z: C.z + U.z * 1.10 };   // 电机仓中心（径向 1.10）
    var ux = U.x, uz = U.z, px = -uz, pz = ux;                  // 径向 / 切向
    var bay = new THREE.Path();
    function corner(da, db) {
      return { x: bayC.x + 0.16 * (ux * da + px * db), z: bayC.z + 0.16 * (uz * da + pz * db) };
    }
    var c1 = corner(1, 1), c2 = corner(1, -1), c3 = corner(-1, -1), c4 = corner(-1, 1);
    bay.moveTo(c1.x, -c1.z); bay.lineTo(c2.x, -c2.z);
    bay.lineTo(c3.x, -c3.z); bay.lineTo(c4.x, -c4.z); bay.closePath();
    top.holes.push(bay);
    var topPlate = new THREE.Mesh(
      new THREE.ExtrudeGeometry(top, { depth: 0.06, bevelEnabled: false, curveSegments: 64 }),
      M.walnut);
    topPlate.rotation.x = -Math.PI / 2;
    topPlate.position.y = 0.28;
    topPlate.castShadow = true; topPlate.receiveShadow = true;
    g.add(topPlate);

    // 电机仓底衬
    var liner = mk(new THREE.BoxGeometry(0.34, 0.008, 0.24), M.walnutDark, bayC.x, 0.284, bayC.z);
    liner.rotation.y = Math.atan2(-U.z, U.x);
    g.add(liner);

    // 4 只银色弹簧避震脚
    refs.feet = [];
    var fp = [[1.12, 0.80], [1.12, -0.80], [-1.12, 0.80], [-1.12, -0.80]];
    for (var i = 0; i < 4; i++) {
      var f = new THREE.Group();
      f.position.set(fp[i][0], 0, fp[i][1]);
      f.add(mk(new THREE.CylinderGeometry(0.10, 0.10, 0.018, 20), M.pad, 0, 0.009, 0));
      f.add(mk(new THREE.CylinderGeometry(0.072, 0.078, 0.055, 18), M.silver, 0, 0.0475, 0));
      f.add(mk(new THREE.TorusGeometry(0.047, 0.011, 8, 22), M.steel, 0, 0.084, 0).rotateX(Math.PI / 2));
      f.add(mk(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 12), M.alu, 0, 0.10, 0));
      setAnchor(f, 0, 0.12, 0);
      g.add(f);
      refs.feet.push(f);
    }

    // 前面铭牌 + 顶板角部铜螺丝
    var plate = mk(new THREE.PlaneGeometry(0.46, 0.086), M.nameplate, 0.42, 0.19, 1.027, false, false);
    g.add(plate);
    var sp = [[1.20, 0.88], [1.20, -0.88], [-1.20, 0.88], [-1.20, -0.88]];
    for (var k = 0; k < 4; k++) g.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.007, 10), M.brass, sp[k][0], 0.343, sp[k][1]));

    setAnchor(g, 0, 0.5, 0);
    return g;
  }

  /* ============ 主轴轴承（黄铜轴套 + 钢主轴 + 推力盘） ============ */
  function buildBearing() {
    var g = new THREE.Group();
    g.position.set(0, 0, C.z);

    var bush = new THREE.Group();
    bush.add(mk(new THREE.CylinderGeometry(0.105, 0.105, 0.022, 24), M.brass, 0, 0.011, 0));
    bush.add(mk(new THREE.CylinderGeometry(0.062, 0.062, 0.10, 22), M.brass, 0, 0.072, 0));
    bush.add(mk(new THREE.TorusGeometry(0.062, 0.005, 8, 24), M.brassDark, 0, 0.121, 0).rotateX(Math.PI / 2));
    bush.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 20), M.steel, 0, 0.119, 0));
    bush.position.y = 0.28;
    setAnchor(bush, 0, 0.14, 0);
    g.add(bush);
    refs.bush = bush;

    var spin = new THREE.Group();
    spin.add(mk(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 18), M.steel, 0, 0.15, 0));
    spin.add(mk(new THREE.BoxGeometry(0.05, 0.012, 0.018), M.aluDark, 0, 0.285, 0));
    spin.add(mk(new THREE.ConeGeometry(0.024, 0.028, 12), M.steel, 0, 0.006, 0).rotateX(Math.PI));
    spin.add(mk(new THREE.SphereGeometry(0.017, 12, 10), M.steel, 0, 0.002, 0));
    spin.position.y = 0.28;
    setAnchor(spin, 0, 0.26, 0);
    g.add(spin);
    refs.spindle = spin;

    setAnchor(g, 0, 0.34, 0);
    return g;
  }

  /* ============ 转盘（厚铝盘 + 胶垫 + 唱片 + 唱片镇，同轴旋转） ============ */
  function buildPlatter() {
    var g = new THREE.Group();
    var asm = new THREE.Group();
    asm.position.set(0, 0.36, C.z);
    refs.platterAsm = asm;

    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.80, 0.80, 0.10, 96),
      [M.knurl, M.aluTop, M.aluDark]);
    disc.position.y = 0.05;
    disc.castShadow = true; disc.receiveShadow = true;
    asm.add(disc);
    asm.add(mk(new THREE.TorusGeometry(0.082, 0.010, 8, 36), M.alu, 0, 0.102, 0).rotateX(Math.PI / 2));

    var mat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.014, 96),
      [M.black, M.rubber, M.black]);
    mat.position.y = 0.1095;
    mat.receiveShadow = true;
    mat.visible = false;
    setAnchor(mat, 0.5, 0.02, 0.2);
    asm.add(mat);
    refs.mat = mat;

    var rec = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 0.008, 96),
      [M.darkPlastic, M.vinyl, M.black]);
    rec.position.y = 0.122;
    rec.receiveShadow = true;
    rec.visible = false;
    setAnchor(rec, 0.45, 0.02, 0.1);
    asm.add(rec);
    refs.record = rec;

    var clamp = new THREE.Group();
    clamp.add(mk(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 28), M.silver, 0, 0.02, 0));
    clamp.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.026, 22), M.knurl, 0, 0.052, 0));
    clamp.add(mk(new THREE.BoxGeometry(0.10, 0.012, 0.018), M.aluDark, 0, 0.058, 0));
    clamp.position.y = 0.127;
    clamp.visible = false;
    setAnchor(clamp, 0, 0.08, 0);
    asm.add(clamp);
    refs.clamp = clamp;

    setAnchor(asm, 0.55, 0.12, 0.25);
    g.add(asm);
    setAnchor(g, 0, 0.5, 0.1);
    return g;
  }

  /* ============ 电机（罩壳圆柱 + 小皮带轮，卧式装进底座内腔） ============ */
  function buildMotor() {
    var g = new THREE.Group();
    var asm = new THREE.Group();
    asm.position.set(PX, BELT_Y, PZ);
    asm.rotation.y = Math.atan2(-U.z, U.x);   // 局部 +x 指向远离转盘的方向
    refs.motorAsm = asm;

    var spinner = new THREE.Group();
    spinner.add(mk(new THREE.CylinderGeometry(0.062, 0.062, 0.032, 24).rotateZ(Math.PI / 2), M.alu, 0, 0, 0));
    spinner.add(mk(new THREE.CylinderGeometry(0.072, 0.072, 0.006, 24).rotateZ(Math.PI / 2), M.aluDark, -0.019, 0, 0));
    spinner.add(mk(new THREE.CylinderGeometry(0.072, 0.072, 0.006, 24).rotateZ(Math.PI / 2), M.aluDark, 0.019, 0, 0));
    asm.add(spinner);
    refs.pulley = spinner;

    asm.add(mk(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10).rotateZ(Math.PI / 2), M.steel, 0.06, 0, 0));
    var body = mk(new THREE.CylinderGeometry(0.062, 0.062, 0.24, 24).rotateZ(Math.PI / 2), M.alu, 0.26, 0, 0);
    asm.add(body);
    for (var i = 0; i < 3; i++) {
      asm.add(mk(new THREE.TorusGeometry(0.062, 0.005, 6, 24).rotateY(Math.PI / 2), M.aluDark, 0.18 + i * 0.08, 0, 0));
    }
    asm.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 20).rotateZ(Math.PI / 2), M.brass, 0.385, 0, 0));
    asm.add(mk(new THREE.BoxGeometry(0.20, 0.043, 0.14), M.walnutDark, 0.26, -0.0835, 0));

    setAnchor(asm, 0.2, 0.12, 0);
    g.add(asm);
    setAnchor(g, 0, 0.5, 0);
    return g;
  }

  /* ============ 传动皮带（扁带 TubeGeometry，沿路径展开挂载） ============ */
  function mod2pi(a) { return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); }

  function beltPoints() {
    /* 转盘缘水平包角 + 电机轮竖直面包角(⊥ 轮轴,经轮底,避开两端法兰盘) */
    var d = 0.82;
    var ux = (PX - C.x) / d, uz = (PZ - C.z) / d;
    var k = (RP - RB) / d, s2 = Math.sqrt(Math.max(0, 1 - k * k));
    var n1 = { x: k * ux - s2 * uz, z: k * uz + s2 * ux };
    var n2 = { x: k * ux + s2 * uz, z: k * uz - s2 * ux };
    function tanPt(cx, cz, r, n) { return { x: cx - r * n.x, z: cz - r * n.z }; }
    var TB1 = tanPt(C.x, C.z, RB, n1), TB2 = tanPt(C.x, C.z, RB, n2);
    function ang(p, cx, cz) { return Math.atan2(p.z - cz, p.x - cx); }
    var aB1 = ang(TB1, C.x, C.z), aB2 = ang(TB2, C.x, C.z), aFB = Math.atan2(-uz, -ux);
    function sweep(a0, aVia, a1) {
      var dir = mod2pi(aVia - a0) < mod2pi(a1 - a0) ? 1 : -1;
      return { dir: dir, total: dir > 0 ? mod2pi(a1 - a0) : -mod2pi(a0 - a1) };
    }
    var swB = sweep(aB2, aFB, aB1);
    function arc(cx, cz, r, a0, sw, n) {
      var out = [];
      for (var i = 0; i <= n; i++) {
        var a = a0 + sw.dir * sw.total * (i / n);
        out.push(new THREE.Vector3(cx + Math.cos(a) * r, BELT_Y, cz + Math.sin(a) * r));
      }
      return out;
    }
    var vx = -uz, vz = ux;                       // 水平方向 ⊥ 电机轮轴 U
    var s2s = (TB2.x - PX) * vx + (TB2.z - PZ) * vz;
    var s1s = (TB1.x - PX) * vx + (TB1.z - PZ) * vz;
    var tX = s1s >= 0 ? 0 : Math.PI;             // 出口侧(TB1)
    var tE = s2s >= 0 ? 0 : Math.PI;             // 入口侧(TB2)
    var pts = [];
    var N = 18, i, tt;
    for (i = 0; i <= N; i++) {                   // 竖直包角:TB1 侧 → 轮底 → TB2 侧
      tt = (tX === Math.PI) ? Math.PI + (i / N) * Math.PI : -(i / N) * Math.PI;
      pts.push(new THREE.Vector3(
        PX + RP * Math.cos(tt) * vx,
        BELT_Y + RP * Math.sin(tt),
        PZ + RP * Math.cos(tt) * vz));
    }
    pts.push(new THREE.Vector3(TB2.x, BELT_Y, TB2.z));                    // 上盘缘
    pts = pts.concat(arc(C.x, C.z, RB, aB2, swB, 64));                    // ~308° 水平包角
    pts.push(new THREE.Vector3(TB1.x, BELT_Y, TB1.z));                    // 回到入口
    return pts;
  }

  function buildBelt(scene) {
    var g = new THREE.Group();
    var curve = new THREE.CatmullRomCurve3(beltPoints(), true, "catmullrom", 0.5);
    var geo = new THREE.TubeGeometry(curve, 260, 0.010, 10, true);
    beltTotal = geo.index.count;
    var m = new THREE.Mesh(geo, M.black);
    m.scale.y = 0.78;              // 挂载时松厚，套紧后压扁成扁带
    m.castShadow = true;
    m.visible = false;
    setAnchor(m, 0.62, BELT_Y, 0.48);
    g.add(m);
    refs.belt = m;
    scene.add(g);
    return g;
  }

  /* ============ 转速拨杆 + 启停按钮 ============ */
  function buildControls() {
    var g = new THREE.Group();
    g.position.set(0.72, TOP_Y, 0.78);
    var edge = M.walnutDark;
    var plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.012, 0.15),
      [edge, edge, M.plate, edge, edge, edge]);
    plate.position.y = 0.006;
    plate.castShadow = true;
    g.add(plate);

    var lever = new THREE.Group();
    lever.position.set(-0.075, 0.012, 0);
    lever.add(mk(new THREE.CylinderGeometry(0.016, 0.02, 0.045, 14), M.aluDark, 0, 0.0225, 0));
    var arm = new THREE.Group();
    arm.position.y = 0.045;
    arm.add(mk(new THREE.BoxGeometry(0.10, 0.014, 0.02), M.silver, 0.045, 0, 0));
    arm.add(mk(new THREE.SphereGeometry(0.017, 12, 10), M.black, 0.095, 0.008, 0));
    lever.add(arm);
    lever.rotation.y = -0.45;      // 出厂停在 45 档，装配后扳到 33⅓
    g.add(lever);
    refs.lever = lever;

    var btn = mk(new THREE.CylinderGeometry(0.033, 0.033, 0.018, 20), M.silver, 0.075, 0.02, 0);
    g.add(btn);
    g.add(mk(new THREE.TorusGeometry(0.038, 0.004, 6, 20), M.aluDark, 0.075, 0.014, 0).rotateX(Math.PI / 2));
    refs.button = btn;
    setAnchor(btn, 0, 0.05, 0);

    setAnchor(g, 0, 0.08, 0);
    return g;
  }

  /* ============ 音臂（支轴座 + 分段臂管 + 平衡锤 + 抗滑 + 升降杆） ============ */
  function buildArm() {
    var g = new THREE.Group();
    var base = new THREE.Group();
    base.position.set(PIVOT.x, TOP_Y, PIVOT.z);
    refs.armBase = base;

    base.add(mk(new THREE.CylinderGeometry(0.145, 0.155, 0.028, 28), M.alu, 0, 0.014, 0));
    var pillar = mk(new THREE.CylinderGeometry(0.05, 0.055, 0.17, 20), M.silver, 0, 0.113, 0);
    var up = new THREE.Vector3(0, 1, 0);
    var lean = new THREE.Vector3(-0.8174 * 0.30, 1, 0.5770 * 0.30).normalize();
    pillar.quaternion.setFromUnitVectors(up, lean);   // 支轴朝转盘方向斜置
    base.add(pillar);
    base.add(mk(new THREE.CylinderGeometry(0.044, 0.044, 0.075, 20), M.steel, 0, 0.225, 0));
    base.add(mk(new THREE.TorusGeometry(0.046, 0.008, 8, 24), M.aluDark, 0, 0.25, 0).rotateX(Math.PI / 2));

    // 臂架（停放托架）
    var rest = new THREE.Group();
    rest.position.set(-1.024, 0, -0.233);
    rest.add(mk(new THREE.CylinderGeometry(0.014, 0.018, 0.155, 12), M.alu, 0, 0.1055, 0));
    rest.add(mk(new THREE.BoxGeometry(0.05, 0.012, 0.024), M.pad, 0, 0.185, 0));
    var pin1 = mk(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8), M.steel, -0.02, 0.205, 0);
    pin1.rotation.z = 0.45;
    var pin2 = mk(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8), M.steel, 0.02, 0.205, 0);
    pin2.rotation.z = -0.45;
    rest.add(pin1); rest.add(pin2);
    base.add(rest);

    // 升降杆（cue lever）
    var cue = new THREE.Group();
    cue.position.set(0.17, 0.10, 0.14);
    cue.add(mk(new THREE.CylinderGeometry(0.012, 0.016, 0.075, 12), M.aluDark, 0, 0.0375, 0));
    var cueArm = new THREE.Group();
    cueArm.position.y = 0.078;
    cueArm.add(mk(new THREE.BoxGeometry(0.11, 0.01, 0.018), M.silver, 0.05, 0, 0));
    cueArm.add(mk(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 10), M.black, 0.10, 0.004, 0));
    cue.add(cueArm);
    base.add(cue);
    refs.cue = cueArm;

    // 抗滑配重（细线吊锤）
    var asg = new THREE.Group();
    asg.position.set(-0.12, 0.115, -0.16);
    var rod = mk(new THREE.CylinderGeometry(0.004, 0.004, 0.075, 8), M.steel, 0, 0.02, 0);
    rod.rotation.z = -0.4;
    asg.add(rod);
    var threadGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 6);
    threadGeo.translate(0, -0.025, 0);
    var thread = new THREE.Mesh(threadGeo, M.black);
    thread.position.set(-0.014, -0.005, 0);
    thread.scale.y = 0.2;
    asg.add(thread);
    var weight = mk(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 10), M.brass, -0.014, -0.012, 0);
    asg.add(weight);
    asg.visible = false;
    base.add(asg);
    refs.asg = asg;
    refs.asThread = thread;
    refs.asWeight = weight;

    // 臂管总成（绕支轴偏航 + 升降）
    var asm = new THREE.Group();
    asm.position.y = 0.26;
    refs.armAsm = asm;
    asm.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), M.steel, 0.02, -0.02, 0));
    asm.add(mk(new THREE.CylinderGeometry(0.021, 0.021, 0.70, 16).rotateZ(Math.PI / 2), M.alu, 0.37, 0, 0));
    asm.add(mk(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 16).rotateZ(Math.PI / 2), M.aluDark, 0.28, 0, 0));
    asm.add(mk(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 16).rotateZ(Math.PI / 2), M.aluDark, 0.52, 0, 0));
    asm.add(mk(new THREE.CylinderGeometry(0.017, 0.017, 0.30, 14).rotateZ(Math.PI / 2), M.alu, -0.17, 0, 0));

    var cw = new THREE.Group();
    cw.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.095, 22).rotateZ(Math.PI / 2), M.silver, 0, 0, 0));
    cw.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 0.018, 8), M.aluDark, 0, 0.052, 0));
    cw.position.x = -0.205;
    cw.visible = false;
    setAnchor(cw, 0, 0.07, 0);
    asm.add(cw);
    refs.cw = cw;

    // headshell（唱头支架，可插装）——本身作为独立点击零件
    var hs = new THREE.Group();
    hs.position.x = 0.72;
    hs.rotation.z = -0.11;
    hs.visible = false;
    hs.add(mk(new THREE.BoxGeometry(0.12, 0.05, 0.055), M.silver, 0.05, 0, 0));
    var finger = mk(new THREE.CylinderGeometry(0.005, 0.005, 0.085, 8), M.alu, 0.015, 0.02, 0.038);
    finger.rotation.z = 0.85;
    hs.add(finger);
    setAnchor(hs, 0.08, 0.02, 0);

    var cart = new THREE.Group();
    cart.position.set(0.17, -0.035, 0);
    cart.visible = false;
    cart.add(mk(new THREE.BoxGeometry(0.085, 0.042, 0.065), M.black, 0, 0, 0));
    cart.add(mk(new THREE.BoxGeometry(0.05, 0.008, 0.04), M.brass, 0, 0.026, 0));
    setAnchor(cart, 0, 0.03, 0);
    var sty = mk(new THREE.ConeGeometry(0.013, 0.034, 10).rotateX(Math.PI), M.steel, 0.13, -0.032, 0);
    sty.visible = false;
    setAnchor(sty, 0, -0.03, 0);
    cart.add(sty);
    refs.cart = cart;
    refs.stylus = sty;
    hs.add(cart);

    asm.add(hs);
    refs.hs = hs;
    base.add(asm);

    setAnchor(base, 0, 0.3, 0);
    setAnchor(asm, 0.45, 0.05, 0);
    g.add(base);
    setAnchor(g, 0, 0.4, 0);
    return g;
  }

  /* ============ 装配 ============ */
  function init() {
    M = TT33.Scene3D.M;
    mk = TT33.Scene3D.mesh;
    var scene = TT33.Scene3D.scene;
    var root = new THREE.Group();
    scene.add(root);

    function def(id, name, sub, appear, group) {
      group.userData.partId = id;
      root.add(group);
      list.push({ id: id, name: name, sub: sub, group: group, appear: appear });
    }

    def("plinth", "WALNUT PLINTH", "HP-33 · ISOLATED BASE", 0, buildPlinth());
    def("bearing", "MAIN BEARING", "BRASS BUSH · STEEL SPINDLE", 1, buildBearing());
    def("platter", "ALU PLATTER + MAT", "4.3 KG · KNURLED RIM", 2, buildPlatter());
    def("motor", "SYNC MOTOR", "16-POLE AC · 375 RPM", 3, buildMotor());
    def("belt", "FLAT DRIVE BELT", "≈930 MM · MOTOR PULLEY → RIM", 3, buildBelt(scene));
    def("controls", "SPEED + START", "33⅓ / 45 · START-STOP", 3, buildControls());
    def("arm", "TONEARM", "9.5 IN · GIMBAL PIVOT", 4, buildArm());

    // 唱头 headshell / 唱片 / 唱片镇挂在已有层级里，登记为可点击零件
    function regNested(id, name, sub, appear, group) {
      group.userData.partId = id;
      list.push({ id: id, name: name, sub: sub, group: group, appear: appear });
    }
    regNested("cartridge", "HEADSHELL + MM CART", "SPHERICAL STYLUS · 1.8 g", 5, refs.hs);
    regNested("record", "12-IN LP · SIDE A", "HP-33 STEREO · 33⅓", 6, refs.record);
    regNested("clamp", "RECORD CLAMP", "310 G · CENTERING", 6, refs.clamp);
  }

  /* ---- 复位 / 跳阶段落位 ---- */
  function resetPose(p) {
    var id = p.id, r = refs;
    if (id === "plinth") {
      p.group.position.set(0, 0, 0); p.group.rotation.y = 0;
      r.feet.forEach(function (f) { f.position.y = 0; });
    }
    if (id === "bearing") { r.bush.position.y = 0.28; r.bush.rotation.y = 0; r.spindle.position.y = 0.28; r.spindle.rotation.y = 0; }
    if (id === "platter") {
      r.platterAsm.position.y = 0.36; r.mat.position.y = 0.1095; r.mat.rotation.y = 0;
      r.record.position.y = 0.122; r.record.rotation.y = 0;
      r.clamp.position.y = 0.127; r.clamp.rotation.y = 0;
    }
    if (id === "motor") { r.motorAsm.position.y = BELT_Y; r.pulley.rotation.x = 0; }
    if (id === "belt") { r.belt.visible = false; r.belt.geometry.setDrawRange(0, 0); r.belt.scale.y = 0.78; }
    if (id === "controls") { p.group.position.y = TOP_Y; r.lever.rotation.y = -0.45; r.button.position.y = 0.02; }
    if (id === "arm") {
      r.armBase.position.y = TOP_Y; r.armAsm.position.y = 0.26;
      r.cw.visible = false; r.cw.position.x = -0.205;
      r.asg.visible = false; r.asThread.scale.y = 0.2; r.asWeight.position.y = -0.012;
    }
    if (id === "cartridge") { r.hs.position.x = 0.72; r.hs.rotation.y = 0; r.cart.position.y = -0.035; r.stylus.position.y = -0.032; }
    p.group.visible = false;
  }

  function reset() {
    list.forEach(resetPose);
    platterAngle = 0; platterHand = 0; pulleySpin = 0;
    armAttachY = 0.26; armYawExtra = 0; armTilt = 0; cueSm = 0; bounceY = 0;
    seatedCount = 0;
    flags = {};
  }

  /* 跳阶段用：把出现序号 <= i 的零件直接摆到装配完成位 */
  function sealUpTo(i) {
    reset();
    var n = 0;
    list.forEach(function (p) {
      if (p.appear <= i) {
        p.group.visible = true;
        n++;
        if (p.id === "belt") { rBeltFull(); }
        if (p.id === "controls") { refs.lever.rotation.y = 0.45; }
        if (p.id === "arm") {
          refs.cw.visible = true;
          refs.asg.visible = true;
          refs.asThread.scale.y = 1;
          refs.asWeight.position.y = -0.062;
        }
        if (p.id === "cartridge") { refs.cart.visible = true; refs.stylus.visible = true; }
        if (p.id === "platter") { refs.mat.visible = true; }
      }
    });
    seatedCount = n;
  }

  function rBeltFull() {
    refs.belt.visible = true;
    refs.belt.geometry.setDrawRange(0, beltTotal);
    refs.belt.scale.y = 0.5;
  }

  /* ============ 8 阶段编排 ============ */
  function beginPhase() {
    flags = {};
    platterHand = 0;
    bounceY = 0;
  }

  function choreography(phaseId, pt, dt) {
    var r = refs;
    if (phaseId === "plinth") {
      var t1 = seg(pt, 0.05, 1.7), e1 = easeInOut(t1);
      var s = new THREE.Vector3(-6.2, 2.6, 3.4), mid = new THREE.Vector3(-3.1, 3.0, 1.6), t = new THREE.Vector3(0, 0, 0);
      var a = (1 - e1) * (1 - e1), b = 2 * e1 * (1 - e1), c = e1 * e1;
      list[0].group.visible = t1 > 0;
      list[0].group.position.set(a * s.x + b * mid.x + c * t.x, a * s.y + b * mid.y + c * t.y, a * s.z + b * mid.z + c * t.z);
      list[0].group.rotation.y = 0.35 * (1 - e1);
      ann("plinth", list[0].group, "WALNUT PLINTH", "HP-33 · ISOLATED BASE");
      for (var i = 0; i < 4; i++) {
        var f = seg(pt, 2.2 + i * 0.24, 2.95 + i * 0.24);
        r.feet[i].position.y = -0.42 * (1 - backOut(f));
      }
      ann("feet", r.feet[0], "SPRING FEET ×4", "SILVER · DECOUPLE");
      if (pt > 1.75 && seatedCount < 1) seatedCount = 1;
    }

    if (phaseId === "bearing") {
      list[1].group.visible = true;
      var b1 = seg(pt, 0.1, 1.5), tw = seg(pt, 1.5, 2.5);
      r.bush.position.y = 0.28 + 0.85 * (1 - easeInOut(b1)) + 0.04 * (1 - easeInOut(tw));
      r.bush.rotation.y = 4.2 * easeInOut(tw);
      ann("bush", r.bush, "BRASS BUSHING", "OIL-IMPREGNATED · PUSH + TWIST");
      var s1 = seg(pt, 2.7, 3.45);
      r.spindle.position.y = 0.28 + 0.6 * (1 - easeOut(s1));
      ann("spindle", r.spindle, "STEEL SPINDLE", "THRUST BALL · 0.5 µm");
      if (pt > 3.8) r.spindle.rotation.y -= dt * 16 * Math.max(0, 1 - seg(pt, 3.8, 5.0));   // 手拨试转
      if (pt > 3.5 && seatedCount < 2) seatedCount = 2;
    }

    if (phaseId === "platter") {
      list[2].group.visible = true;
      var d1 = seg(pt, 0.1, 2.3);
      r.platterAsm.position.y = 0.36 + 1.5 * (1 - easeInOut(d1));
      platterHand = -0.9 * (1 - d1);
      ann("platter", list[2].group, "ALU PLATTER · 4.3 KG", "KNURLED RIM · DROPS ON SPINDLE");
      var m1 = seg(pt, 2.5, 4.0);
      r.mat.visible = m1 > 0;
      r.mat.position.y = 0.1095 + 0.7 * (1 - easeInOut(m1));
      r.mat.rotation.y = 0.5 * (1 - m1);
      ann("mat", r.mat, "RUBBER MAT", "CONCENTRIC · 1.5 MM");
      if (pt > 4.05 && seatedCount < 3) seatedCount = 3;
    }

    if (phaseId === "motor") {
      list[3].group.visible = true;
      var mm = seg(pt, 0.1, 1.2);
      r.motorAsm.position.y = BELT_Y + 0.85 * (1 - easeInOut(mm));
      ann("motor", list[3].group, "SYNC MOTOR", "16-POLE AC · INTO BAY");
      var cc = seg(pt, 0.3, 1.1);
      list[5].group.visible = cc > 0;
      list[5].group.position.y = TOP_Y + 0.5 * (1 - easeOut(cc));
      ann("controls", list[5].group, "SPEED + START", "33⅓ / 45 · START-STOP");
      var f = 0.34 * seg(pt, 1.35, 2.6) + 0.66 * seg(pt, 2.6, 4.7);
      r.belt.visible = f > 0.001;
      r.belt.geometry.setDrawRange(0, Math.floor(beltTotal * f / 6) * 6);
      r.belt.scale.y = 0.5 + 0.28 * (1 - easeOut(seg(pt, 4.7, 5.0)));
      ann("belt", r.belt, "FLAT DRIVE BELT", "PULLEY FIRST, THEN PLATTER RIM");
      r.lever.rotation.y = -0.45 + 0.9 * smooth(seg(pt, 5.0, 5.75));
      ann("speed", r.lever, "SPEED 33⅓", "BELT RATIO ENGAGED", "white");
      if (pt > 5.8) pulleySpin -= dt * 4 * Math.max(0, 1 - seg(pt, 5.8, 6.0));   // 试转抖动
      if (pt > 5.8 && seatedCount < 6) seatedCount = 6;
    }

    if (phaseId === "arm") {
      list[6].group.visible = true;
      var ab = seg(pt, 0.1, 1.3);
      r.armBase.position.y = TOP_Y + 0.8 * (1 - easeInOut(ab));
      ann("pivot", r.armBase, "PIVOT BASE", "GIMBAL BEARING · LEANED");
      var a1 = seg(pt, 1.5, 2.6);
      armAttachY = 0.26 + 0.45 * (1 - easeInOut(a1));
      armYawExtra = 0.5 * (1 - easeInOut(a1));
      ann("tube", r.armAsm, "ARM TUBE", "ALUMINIUM · 3 SEGMENTS");
      var w1 = seg(pt, 2.8, 3.7), w2 = seg(pt, 3.7, 4.6);
      r.cw.visible = w1 > 0;
      r.cw.position.x = -0.36 + 0.12 * easeInOut(w1) + 0.035 * (1 - w2);
      armTilt = -0.018 * (1 - w2);
      ann("cw", r.cw, "COUNTERWEIGHT", "SLIDE TO BALANCE");
      var as1 = seg(pt, 4.7, 5.4);
      r.asg.visible = as1 > 0;
      r.asThread.scale.y = 0.2 + 0.8 * easeOut(as1);
      r.asWeight.position.y = -0.012 - 0.05 * easeOut(as1);
      ann("as", r.asg, "ANTI-SKATE", "0.5 g · TOWARD CENTER");
      if (pt > 5.5 && seatedCount < 7) seatedCount = 7;
    }

    if (phaseId === "cartridge") {
      list[7].group.visible = true;
      var h1 = seg(pt, 0.1, 1.4);
      r.hs.position.x = 0.72 + 0.35 * (1 - easeInOut(h1));
      r.hs.rotation.y = 0.7 * (1 - easeInOut(h1));
      ann("hs", r.hs, "HEADSHELL", "SNAP-ON DOCK");
      var cd = seg(pt, 1.6, 2.6);
      r.cart.visible = cd > 0;
      r.cart.position.y = -0.035 + 0.22 * (1 - easeOut(cd));
      ann("cart", r.cart, "MM CARTRIDGE", "OUTPUT 4.5 mV");
      var sd = seg(pt, 2.7, 3.3);
      r.stylus.visible = sd > 0;
      r.stylus.position.y = -0.032 + 0.087 * (1 - easeOut(sd));
      ann("sty", r.stylus, "STYLUS · SPHERICAL", "TRACKING 1.8 g");
      if (pt > 3.35 && seatedCount < 8) seatedCount = 8;
    }

    if (phaseId === "record") {
      list[8].group.visible = true;
      var rd = seg(pt, 0.1, 2.4);
      r.record.visible = rd > 0;
      r.record.position.y = 0.122 + 1.15 * (1 - easeInOut(rd));
      r.record.rotation.y = -0.8 * (1 - rd);
      ann("rec", r.record, "12-IN LP · SIDE A", "HP-33 STEREO · 33⅓");
      var cl = seg(pt, 2.5, 3.6);
      list[9].group.visible = cl > 0;
      r.clamp.position.y = 0.127 + 0.5 * (1 - easeInOut(cl));
      r.clamp.rotation.y = -5.8 * (1 - easeInOut(cl));
      ann("clamp", r.clamp, "RECORD CLAMP", "310 G · SCREW DOWN");
      var bn = seg(pt, 3.7, 4.1);
      r.button.position.y = 0.02 - 0.009 * Math.sin(Math.min(1, bn) * Math.PI);
      ann("btn", r.button, "START", "MOTOR ENGAGED", "white");
      if (pt > 2.45 && seatedCount < 9) seatedCount = 9;
      if (pt > 3.65 && seatedCount < 10) seatedCount = 10;
    }

    if (phaseId === "play") {
      bounceY = -0.004 * Math.sin(Math.min(1, seg(pt, 2.55, 2.95)) * Math.PI);   // 落针轻弹
      ann("down", r.stylus, "STYLUS DOWN", "LEAD-IN GROOVE", "white");
    }
  }

  /* 每帧统一状态应用（转盘旋转 / 皮带轮 / 音臂偏航与升降） */
  function applyCommon(st, dt) {
    var r = refs;
    platterAngle -= (st.rpm / 60) * Math.PI * 2 * dt;      // 从顶视看顺时针
    r.platterAsm.rotation.y = platterAngle + platterHand;
    pulleySpin -= (st.rpm / 60) * Math.PI * 2 * dt * (RB / RP);
    r.pulley.rotation.x = pulleySpin;
    cueSm += (st.cue - cueSm) * Math.min(1, dt * 6);
    armAsmPose();
  }

  function armAsmPose() {
    var r = refs;
    r.armAsm.rotation.y = yawFor(st.s !== undefined ? st.s : PARK_S) + armYawExtra;
    r.armAsm.rotation.z = armTilt;
    r.armAsm.position.y = armAttachY + cueSm * 0.045 + bounceY;
    r.cue.rotation.x = 0.15 - 0.75 * cueSm;
  }

  var st = { s: PARK_S, cue: 0, rpm: 0 };

  function update(phaseId, pt, dt, ext) {
    st.s = ext.s; st.cue = ext.cue; st.rpm = ext.rpm;
    choreography(phaseId, pt, dt);
    applyCommon(ext, dt);
  }

  TT33.Parts = {
    init: init,
    update: update,
    reset: reset,
    beginPhase: beginPhase,
    sealUpTo: sealUpTo,
    get seatedCount() { return seatedCount; },
    list: function () { return list; },
    group: function (id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].group;
      return null;
    },
    CONST: { PARK_S: PARK_S, LEAD_S: LEAD_S, TOP_Y: TOP_Y }
  };
})(window.TT33 = window.TT33 || {});
