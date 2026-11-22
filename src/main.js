/* 入口：初始化各模块、主循环、交互（拖拽/点击零件/空格暂停/R 重播/数字键跳阶段） */
(function (TT33) {
  var lastT = performance.now();
  var raycaster = null, mouse = new THREE.Vector2();
  var downX = 0, downY = 0;
  var PHASE_KEYS = ["plinth", "bearing", "platter", "motor", "arm", "cartridge", "record", "play"];

  function boot() {
    TT33.SceneInit();
    var S3 = TT33.Scene3D;

    TT33.orbitCtl = new TT33.Orbit(S3.camera, S3.renderer.domElement);
    TT33.Labels.init();
    TT33.Parts.init();
    TT33.Dashboard.build();
    TT33.Timeline.init();
    TT33.Timeline.start();

    raycaster = new THREE.Raycaster();
    bindInteractions(S3);

    window.addEventListener("resize", function () {
      var stage = document.getElementById("stage");
      S3.camera.aspect = stage.clientWidth / stage.clientHeight;
      S3.camera.updateProjectionMatrix();
      S3.renderer.setSize(stage.clientWidth, stage.clientHeight);
    });

    window.addEventListener("keydown", function (e) {
      if (e.code === "Space") {
        e.preventDefault();
        var p = TT33.Timeline.togglePause();
        document.getElementById("phase-text").style.opacity = p ? "0.5" : "1";
      } else if (e.code === "KeyR") {
        TT33.Timeline.restart();
        document.getElementById("phase-text").style.opacity = "1";
      } else if (/^Digit[1-8]$/.test(e.code)) {
        TT33.Timeline.seek(PHASE_KEYS[Number(e.code.slice(5)) - 1]);
        document.getElementById("phase-text").style.opacity = "1";
      }
    });

    loop();
  }

  function bindInteractions(S3) {
    var dom = S3.renderer.domElement;
    dom.style.touchAction = "none";
    dom.addEventListener("pointerdown", function (e) { downX = e.clientX; downY = e.clientY; });
    dom.addEventListener("pointerup", function (e) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;  // 拖拽不算点击
      var rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, S3.camera);
      var groups = [];
      TT33.Parts.list().forEach(function (p) {
        if (p.group.visible && p.group.parent) groups.push(p.group);
      });
      var hits = raycaster.intersectObjects(groups, true);
      if (hits.length) {
        var g = hits[0].object;
        while (g && !g.userData.partId) g = g.parent;
        if (g) {
          var meta = null;
          TT33.Parts.list().forEach(function (p) { if (p.group === g) meta = p; });
          if (meta) TT33.Labels.announce("click-" + meta.id, g, meta.name, meta.sub, performance.now(), 2200);
        }
      }
    });
    dom.addEventListener("pointermove", function (e) {
      var rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, S3.camera);
      var groups = [];
      TT33.Parts.list().forEach(function (p) {
        if (p.group.visible && p.group.parent) groups.push(p.group);
      });
      dom.style.cursor = raycaster.intersectObjects(groups, true).length ? "pointer" : "";
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    var now = performance.now();
    var dt = Math.min((now - lastT) / 1000, 0.12);
    lastT = now;

    TT33.Timeline.update(dt);          // 内部判断暂停
    TT33.orbitCtl.update(dt);
    TT33.SceneUpdate(dt);
    TT33.Labels.update();
    TT33.Scene3D.renderer.render(TT33.Scene3D.scene, TT33.Scene3D.camera);
    if (!window.TT33_BOOTED) window.TT33_BOOTED = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.TT33 = window.TT33 || {});
