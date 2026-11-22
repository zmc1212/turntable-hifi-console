/* 场景：渲染器 / 灯光 / 米色影棚地面 / 共享材质 */
(function (TT33) {
  var M = {};      // 共享材质

  function mesh(geo, mat, x, y, z, cast, receive) {
    var m = new THREE.Mesh(geo, mat);
    if (x !== undefined) m.position.set(x, y, z);
    m.castShadow = cast !== false;
    m.receiveShadow = receive !== false;
    return m;
  }

  function init() {
    var stage = document.getElementById("stage");
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    // 软件渲染（SwiftShader 等）下降像素比 + 精简阴影，保证可交互帧率
    var softGL = false;
    try {
      var gl = renderer.getContext();
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      var gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      softGL = /swiftshader|software|basic render/i.test(String(gpu));
    } catch (e) { /* 保留默认 */ }
    renderer.setPixelRatio(softGL ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = softGL ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    // 物理光照：去掉 legacy 模式的 π 增益，否则暗色材质会被抬成灰白
    renderer.physicallyCorrectLights = true;
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = TT33.Textures.backdrop();

    var camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 60);
    camera.position.set(4.2, 3.8, 6.2);

    var hemi = new THREE.HemisphereLight(0xfff4e0, 0x9a8a6e, 0.85);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(3.6, 7.6, 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(softGL ? 1024 : 2048, softGL ? 1024 : 2048);
    sun.shadow.camera.left = -5; sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 20;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    // 侧后补光（勾银边）
    var rim = new THREE.DirectionalLight(0xf2ead8, 0.5);
    rim.position.set(-4.5, 3.2, -3.8);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.16));

    /* ---- 米色影棚地面 ---- */
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ map: TT33.Textures.floorPaper(), roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    floor.receiveShadow = true;
    scene.add(floor);

    /* ---- 共享材质（先建，零件全部依赖） ---- */
    M.walnut = new THREE.MeshStandardMaterial({ map: TT33.Textures.walnut(), roughness: 0.52, metalness: 0.05 });
    M.walnutDark = new THREE.MeshStandardMaterial({ color: 0x38251a, roughness: 0.7 });
    M.silver = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, metalness: 0.85, roughness: 0.3 });
    M.alu = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 0.6, roughness: 0.45 });
    M.aluDark = new THREE.MeshStandardMaterial({ color: 0x8f949b, metalness: 0.6, roughness: 0.5 });
    M.steel = new THREE.MeshStandardMaterial({ color: 0xdadde2, metalness: 0.95, roughness: 0.18 });
    M.brass = new THREE.MeshStandardMaterial({ color: 0xa98a3d, metalness: 0.9, roughness: 0.36 });
    M.brassDark = new THREE.MeshStandardMaterial({ color: 0x7d6428, metalness: 0.85, roughness: 0.45 });
    M.black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5, metalness: 0.15 });
    M.darkPlastic = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.6 });
    M.rubber = new THREE.MeshStandardMaterial({ map: TT33.Textures.rubberMat(), roughness: 0.92 });
    M.vinyl = new THREE.MeshStandardMaterial({ map: TT33.Textures.vinyl(), roughness: 0.42, metalness: 0.05 });
    M.knurl = new THREE.MeshStandardMaterial({ map: TT33.Textures.knurl(), metalness: 0.55, roughness: 0.35 });
    M.aluTop = new THREE.MeshStandardMaterial({ map: TT33.Textures.platterAlu(), metalness: 0.5, roughness: 0.42 });
    M.plate = new THREE.MeshStandardMaterial({ map: TT33.Textures.controlPlate(), roughness: 0.55 });
    M.nameplate = new THREE.MeshStandardMaterial({ map: TT33.Textures.nameplate(), metalness: 0.3, roughness: 0.5 });
    M.pad = new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.9 });

    TT33.Scene3D = {
      scene: scene,
      camera: camera,
      renderer: renderer,
      mesh: mesh,
      M: M
    };
  }

  function update(dt) { /* 场景级动画（暂无，留接口） */ }

  TT33.SceneInit = init;
  TT33.SceneUpdate = update;
})(window.TT33 = window.TT33 || {});
