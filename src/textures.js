/* 程序化 Canvas 贴图：胡桃木纹 / 黑胶唱片 / 胶垫 / 铝盘 / 纸质影棚 / 铭牌 */
(function (TT33) {
  function makeTex(w, h, draw, opts) {
    opts = opts || {};
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.encoding = THREE.sRGBEncoding;
    if (opts.repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    return tex;
  }

  /* 简单可复现伪随机（贴图稳定） */
  function rng(seed) {
    var s = seed || 7;
    return function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  /* 胡桃木纹（深棕 + 波浪纹理 + 少量节疤） */
  function walnut() {
    return makeTex(512, 512, function (ctx, w, h) {
      var r = rng(11);
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#6b4a32");
      g.addColorStop(0.5, "#5e3f2a");
      g.addColorStop(1, "#68472f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 84; i++) {
        var x = r() * w;
        var dark = r() > 0.45;
        ctx.strokeStyle = dark
          ? "rgba(52,31,17," + (0.10 + r() * 0.22).toFixed(2) + ")"
          : "rgba(146,104,70," + (0.08 + r() * 0.16).toFixed(2) + ")";
        ctx.lineWidth = 0.8 + r() * 2.6;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (var y = 0; y <= h; y += 26) ctx.lineTo(x + Math.sin(y * 0.02 + i) * (3 + r() * 5), y);
        ctx.stroke();
      }
      for (var k = 0; k < 5; k++) {
        var kx = r() * w, ky = r() * h, kr = 10 + r() * 16;
        var rg = ctx.createRadialGradient(kx, ky, 1, kx, ky, kr);
        rg.addColorStop(0, "rgba(44,25,12,0.55)");
        rg.addColorStop(1, "rgba(44,25,12,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr, kr * 0.55, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (var b = 0; b < 12; b++) {
        ctx.fillStyle = "rgba(30,17,8," + (0.05 + r() * 0.05).toFixed(2) + ")";
        ctx.fillRect(0, r() * h, w, 3 + r() * 10);
      }
    }, { repeat: [0.32, 0.32] });
  }

  /* 米色影棚地面（径向渐暗 + 细微纸纹） */
  function floorPaper() {
    return makeTex(1024, 1024, function (ctx, w, h) {
      ctx.fillStyle = "#e4ddcb";
      ctx.fillRect(0, 0, w, h);
      var rg = ctx.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.62);
      rg.addColorStop(0, "rgba(255,252,242,0.55)");
      rg.addColorStop(0.55, "rgba(240,234,218,0.18)");
      rg.addColorStop(1, "rgba(146,133,108,0.42)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      var r = rng(23);
      for (var i = 0; i < 900; i++) {
        ctx.fillStyle = r() > 0.5 ? "rgba(120,108,86,0.06)" : "rgba(255,255,248,0.07)";
        ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      }
    });
  }

  /* 影棚背景（米色摄影棚弧幕渐变） */
  function backdrop() {
    return makeTex(1024, 512, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#f1ebdd");
      g.addColorStop(0.55, "#e5dec9");
      g.addColorStop(1, "#c9bfa6");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      function blob(x, y, rad, c) {
        var rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
        rg.addColorStop(0, c);
        rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      blob(w * 0.5, h * 0.16, 300, "rgba(255,253,244,0.5)");
      blob(w * 0.12, h * 0.3, 220, "rgba(226,204,172,0.35)");
      blob(w * 0.9, h * 0.34, 240, "rgba(214,196,164,0.3)");
    });
  }

  /* 黑胶唱片面（外圈平滑区 + 细密纹路 + 导出槽 + 橙红标签） */
  function vinyl() {
    return makeTex(1024, 1024, function (ctx, w, h) {
      var cx = w / 2, cy = h / 2, R = w / 2;
      var r = rng(33);
      ctx.fillStyle = "#141414";
      ctx.fillRect(0, 0, w, h);
      // 外缘倒角亮环
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, Math.PI * 2); ctx.stroke();
      // 外圈平滑引导区
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1.4;
      for (var g1 = R * 0.945; g1 > R * 0.915; g1 -= 2.4) {
        ctx.beginPath(); ctx.arc(cx, cy, g1, 0, Math.PI * 2); ctx.stroke();
      }
      // 细密纹路同心圆（主纹区）
      for (var gr = R * 0.915; gr > R * 0.225; gr -= 1.35) {
        var a = 0.028 + r() * 0.055;
        ctx.strokeStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.stroke();
        if (r() > 0.94) {  // 音轨分隔（稍粗暗线）
          ctx.strokeStyle = "rgba(0,0,0,0.55)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, gr - 1, 0, Math.PI * 2); ctx.stroke();
        }
        if (r() > 0.965) {  // 偶发亮环（反光岸）
          ctx.strokeStyle = "rgba(255,255,255,0.13)";
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(cx, cy, gr - 2, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // 导出槽（label 外圈一圈稍亮的平滑槽）
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      for (var lo = R * 0.222; lo > R * 0.205; lo -= 2) {
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, lo, 0, Math.PI * 2); ctx.stroke();
      }
      // 大面积柔和反光弧
      var sheen = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx - R * 0.4, cy - R * 0.45, R * 1.1);
      sheen.addColorStop(0, "rgba(255,255,255,0.075)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.02)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      // 橙红标签
      var labR = R * 0.212;
      var lg = ctx.createRadialGradient(cx, cy, labR * 0.2, cx, cy, labR);
      lg.addColorStop(0, "#c95a36");
      lg.addColorStop(1, "#bf4d2c");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(cx, cy, labR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(60,20,8,0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, labR - 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#33200f";
      ctx.textAlign = "center";
      ctx.font = "bold 21px monospace";
      ctx.fillText("KOLTHOFF", cx, cy - labR * 0.52);
      ctx.font = "bold 30px monospace";
      ctx.fillText("HP-33 STEREO", cx, cy - 2);
      ctx.font = "18px monospace";
      ctx.fillText("33⅓ RPM · SIDE A", cx, cy + labR * 0.42);
      // 主轴孔
      ctx.fillStyle = "#0c0c0c";
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.02, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.024, 0, Math.PI * 2); ctx.stroke();
    });
  }

  /* 黑色胶垫（同心细纹 + 中心凹槽） */
  function rubberMat() {
    return makeTex(512, 512, function (ctx, w, h) {
      var cx = w / 2, cy = h / 2, R = w / 2;
      ctx.fillStyle = "#181818";
      ctx.fillRect(0, 0, w, h);
      for (var gr = R; gr > R * 0.14; gr -= 3.2) {
        ctx.strokeStyle = "rgba(255,255,255," + (0.02 + (gr % 9.6 < 3.2 ? 0.03 : 0)).toFixed(3) + ")";
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "#101010";
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2); ctx.stroke();
    });
  }

  /* 拉丝铝转盘面（同心机纹） */
  function platterAlu() {
    return makeTex(512, 512, function (ctx, w, h) {
      var cx = w / 2, cy = h / 2, R = w / 2;
      ctx.fillStyle = "#ccd0d6";
      ctx.fillRect(0, 0, w, h);
      var r = rng(47);
      for (var gr = 4; gr < R; gr += 1.8) {
        ctx.strokeStyle = "rgba(116,122,130," + (0.05 + r() * 0.10).toFixed(3) + ")";
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.stroke();
        if (r() > 0.8) {
          ctx.strokeStyle = "rgba(255,255,255,0.16)";
          ctx.beginPath(); ctx.arc(cx, cy, gr + 1, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // 两条加工环带
      ctx.strokeStyle = "rgba(96,102,110,0.5)";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.stroke();
      // 中心圈
      ctx.fillStyle = "rgba(90,96,104,0.35)";
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.13, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* 转盘侧缘滚花（竖条纹，绕周重复） */
  function knurl() {
    return makeTex(64, 32, function (ctx, w, h) {
      ctx.fillStyle = "#b9bdc4";
      ctx.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 4) {
        ctx.fillStyle = "rgba(70,74,80,0.55)";
        ctx.fillRect(x, 0, 2, h);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(x + 2, 0, 1, h);
      }
    }, { repeat: [44, 1] });
  }

  /* 转速刻度小板（33⅓ / 45 + START） */
  function controlPlate() {
    return makeTex(256, 128, function (ctx, w, h) {
      ctx.fillStyle = "#4a3117";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(234,228,214,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.fillStyle = "#eae4d6";
      ctx.textAlign = "center";
      ctx.font = "bold 30px monospace";
      ctx.fillText("33⅓", w * 0.24, h * 0.42);
      ctx.fillText("45", w * 0.76, h * 0.42);
      ctx.font = "13px monospace";
      ctx.fillStyle = "rgba(234,228,214,0.65)";
      ctx.fillText("SPEED", w * 0.5, h * 0.2);
      ctx.fillText("START · STOP", w * 0.5, h * 0.8);
      // 刻度点
      ctx.fillStyle = "#eae4d6";
      for (var i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(w * (0.35 + i * 0.075), h * 0.36, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /* 铭牌（KOLTHOFF HP-33 暗金字） */
  function nameplate() {
    return makeTex(512, 96, function (ctx, w, h) {
      ctx.fillStyle = "#2e1e10";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(169,138,61,0.85)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = "#c9a452";
      ctx.textAlign = "left";
      ctx.font = "bold 40px Georgia, serif";
      ctx.fillText("KOLTHOFF", 26, h * 0.62);
      ctx.textAlign = "right";
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "rgba(234,228,214,0.85)";
      ctx.fillText("HP-33 · BELT DRIVE", w - 26, h * 0.6);
    });
  }

  TT33.Textures = {
    walnut: walnut,
    floorPaper: floorPaper,
    backdrop: backdrop,
    vinyl: vinyl,
    rubberMat: rubberMat,
    platterAlu: platterAlu,
    knurl: knurl,
    controlPlate: controlPlate,
    nameplate: nameplate,
    makeTex: makeTex
  };
})(window.TT33 = window.TT33 || {});
