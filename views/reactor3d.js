/* ============================================================================
 * CLAVIS Digital Twin — Módulo 02: Biorreator Industrial STR 60 m³ (Three.js 3D)
 * Geometria real verificada: V_geom = 60 m³, Vu = 41,92 m³, Dt = 2,836 m,
 * Di = 1,007 m (3× Turbinas Rushton de 6 pás), 4× Chicanas, Sparger Anelar,
 * Motor M-301 + Redutor + Selo Mecânico, Camisa/Serpentina e Sensores ISA-5.1.
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});
  const THREE = global.THREE;
  if (!THREE) {
    BioSim.Reactor3D = { available: false };
    return;
  }

  const Reactor3D = {
    available: true,
    initialized: false,
    viewMode: 'realista', // 'realista' | 'transparente' | 'corte' | 'explodida' | 'externa'
    autoRotate: false,
    explodeProgress: 0,
    explodeTarget: 0,
    layers: {
      hydro: true,
      oxygen: true,
      mycelium: true,
      product: true
    },
    componentsVisible: {
      topHead: true,
      oRing: true,
      vesselShell: true,
      shaft: true,
      impellers: true,
      baffles: true,
      bottomHead: true
    },

    init(container) {
      if (this.initialized || !container) return;
      this.container = container;
      this.initialized = true;

      // Dimensões de referência no espaço 3D (escala 1 unid = ~1 m)
      this.R = 1.42;        // Raio do tanque (Dt = 2,84 m)
      this.H = 4.10;        // Altura da seção cilíndrica
      this.botY = -1.75;    // Base da seção cilíndrica
      this.topY = this.botY + this.H; // +2.35

      // Cena, Câmera e Renderizador WebGL
      const scene = new THREE.Scene();
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0.35, 11.4);
      this.camera = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.26;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.localClippingEnabled = true;
      this.renderer = renderer;

      // Substitui/oculta canvas 2D legado e anexa o canvas WebGL 3D
      const oldCanvas = container.querySelector('#reactor-canvas');
      if (oldCanvas) oldCanvas.style.display = 'none';
      renderer.domElement.className = 'reactor-webgl-canvas';
      container.insertBefore(renderer.domElement, container.firstChild);

      // Iluminação de estúdio industrial (reflexos em aço inox + brilho interno bioluminescente)
      scene.add(new THREE.HemisphereLight(0xdbeafe, 0x091526, 1.45));

      const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.9);
      keyLight.position.set(-7, 9, 8);
      keyLight.castShadow = true;
      scene.add(keyLight);

      const rimCyan = new THREE.DirectionalLight(0x22d3ee, 2.2);
      rimCyan.position.set(8, 5, -6);
      scene.add(rimCyan);

      const frontFill = new THREE.DirectionalLight(0x60a5fa, 1.1);
      frontFill.position.set(2, -3, 9);
      scene.add(frontFill);

      // Luz interna do caldo fermentativo
      this.brothLight = new THREE.PointLight(0x06b6d4, 2.6, 7.5);
      this.brothLight.position.set(0, -0.2, 0);
      scene.add(this.brothLight);

      // Grupo raiz do biorreator
      this.root = new THREE.Group();
      scene.add(this.root);

      // Subgrupos mecânicos (permitem visualização explodida individual!)
      this.compGroups = {
        topHead: new THREE.Group(),
        oRing: new THREE.Group(),
        vesselShell: new THREE.Group(),
        shaft: new THREE.Group(),
        impellers: new THREE.Group(),
        baffles: new THREE.Group(),
        bottomHead: new THREE.Group(),
        internals: new THREE.Group()
      };
      Object.values(this.compGroups).forEach(g => this.root.add(g));

      // Subgrupos das 4 camadas fenomenológicas internas
      this.layerGroups = {
        hydro: new THREE.Group(),
        oxygen: new THREE.Group(),
        mycelium: new THREE.Group(),
        product: new THREE.Group()
      };
      Object.values(this.layerGroups).forEach(g => this.compGroups.internals.add(g));

      // Construir geometria 3D completa
      this.buildStudioFloor();
      this.buildBottomHeadAndLegs();
      this.buildVesselShellAndJacket();
      this.buildBaffles();
      this.buildShaftAndImpellers();
      this.buildTopHeadAndMotor();
      this.buildFermentationBroth();
      this.buildHydroLayer3D();
      this.buildBubblesLayer3D();
      this.buildMyceliumLayer3D();
      this.buildProductLayer3D();
      this.buildSensorPorts3D();

      // Controles de órbita e zoom
      this.target = new THREE.Vector3(0, 0.25, 0);
      this.spherical = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.target));
      this.setupInteraction();

      new ResizeObserver(() => this.resize()).observe(container);
      this.resize();
    },

    // Materiais metálicos industriais
    mat(color, metalness = 0.85, roughness = 0.20, extra = {}) {
      return new THREE.MeshStandardMaterial(Object.assign({ color, metalness, roughness }, extra));
    },

    buildStudioFloor() {
      const floorGroup = new THREE.Group();
      floorGroup.position.y = -2.85;
      this.scene.add(floorGroup);

      // Grade circular e ortogonal luminosa estilo BioFactory Control Center
      const gridHelper = new THREE.GridHelper(13, 26, 0x0ea5e9, 0x0c3452);
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.42;
      floorGroup.add(gridHelper);

      // Halo radial no piso sob o biorreator
      const glowGeo = new THREE.CircleGeometry(2.65, 48);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      });
      const glowDisc = new THREE.Mesh(glowGeo, glowMat);
      glowDisc.rotation.x = -Math.PI / 2;
      glowDisc.position.y = 0.01;
      floorGroup.add(glowDisc);

      // Anel graduado sob os pés do tanque
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.52, 1.57, 64),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      floorGroup.add(ring);
    },

    buildBottomHeadAndLegs() {
      const g = this.compGroups.bottomHead;
      const R = this.R;
      const botY = this.botY;
      const mInox = this.mat(0xdbe4eb, 0.90, 0.17);
      const mInoxDark = this.mat(0x8fa1b3, 0.82, 0.26);
      const mBrass = this.mat(0xd99b26, 0.78, 0.24);

      // Tampo torisférico inferior em aço inox polido
      const domeGeo = new THREE.SphereGeometry(R, 44, 22, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, mInox);
      dome.scale.y = 0.36;
      dome.position.y = botY;
      g.add(dome);

      // Flange inferior com 28 parafusos sextavados
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, 0.11, 48), mInoxDark);
      flange.position.y = botY + 0.03;
      g.add(flange);

      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15, 6), mInox);
        bolt.position.set(Math.cos(a) * R * 1.02, botY + 0.03, Math.sin(a) * R * 1.02);
        g.add(bolt);
      }

      // 4 Pernas tubulares robustas com sapatas niveladoras e nervuras
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const lx = Math.cos(a) * R * 0.82;
        const lz = Math.sin(a) * R * 0.82;

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.98, 20), mInox);
        leg.position.set(lx, botY - 0.56, lz);
        g.add(leg);

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.07, 24), mInoxDark);
        foot.position.set(lx, botY - 1.05, lz);
        g.add(foot);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 20), mBrass);
        collar.position.set(lx, botY - 0.18, lz);
        g.add(collar);
      }

      // Válvula e linha de descarga sanitária central no fundo do vaso
      const drainPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.48, 18), mInox);
      drainPipe.position.set(0, botY - 0.68, 0);
      g.add(drainPipe);

      const drainElbow = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 16), mInoxDark);
      drainElbow.rotation.z = Math.PI / 2;
      drainElbow.position.set(0.42, botY - 0.88, 0);
      g.add(drainElbow);

      // Sparger anelar perfurado de aeração (abaixo do impelidor inferior)
      const spargerRing = new THREE.Mesh(
        new THREE.TorusGeometry(R * 0.44, 0.038, 12, 36),
        this.mat(0x94a3b8, 0.85, 0.22)
      );
      spargerRing.rotation.x = Math.PI / 2;
      spargerRing.position.y = botY + 0.24;
      g.add(spargerRing);

      // Tubo vertical interno de alimentação de ar estéril para o sparger (FIC-301)
      const airDowncomer = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, this.H + 0.15, 12), mInox);
      airDowncomer.position.set(-R * 0.78, botY + this.H / 2 + 0.1, 0.15);
      g.add(airDowncomer);
    },

    buildVesselShellAndJacket() {
      const g = this.compGroups.vesselShell;
      const R = this.R;
      const H = this.H;
      const midY = this.botY + H / 2;

      // Plano de corte para o modo "Seção Transversal"
      this.cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.05);

      // Costado cilíndrico com transparência seletiva e brilho de vidro industrial
      this.glassShellMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.22,
        roughness: 0.08,
        metalness: 0.12,
        transmission: 0.65,
        reflectivity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      this.opaqueShellMat = this.mat(0xcbd5e1, 0.90, 0.18, {
        side: THREE.DoubleSide
      });

      this.shellMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, H, 56, 1, true),
        this.glassShellMat
      );
      this.shellMesh.position.y = midY;
      g.add(this.shellMesh);

      // Camisa / anéis estruturais externos de inox e tirantes verticais
      const mInox = this.mat(0xd8e2ea, 0.90, 0.16);
      const mBrass = this.mat(0xd99b26, 0.75, 0.25);

      [-0.46, 0.0, 0.46].forEach(frac => {
        const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.015, 0.024, 10, 56), mInox);
        band.rotation.x = Math.PI / 2;
        band.position.y = midY + frac * H;
        g.add(band);
      });

      // Colunas laterais externas de instrumentação e água de resfriamento da camisa
      for (const side of [-1, 1]) {
        const colX = side * (R + 0.15);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, H * 1.02, 16), mInox);
        pipe.position.set(colX, midY, 0);
        g.add(pipe);

        for (const fy of [-0.38, -0.10, 0.18, 0.42]) {
          const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 16), mBrass);
          clamp.position.set(colX, midY + fy * H, 0);
          g.add(clamp);

          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 12), mInox);
          branch.rotation.z = Math.PI / 2;
          branch.position.set(side * (R + 0.06), midY + fy * H, 0);
          g.add(branch);
        }
      }

      // Serpentina helicoidal interna de troca térmica (brilha quando Q/V > 3 kW/m³)
      const coilPoints = [];
      const turns = 7.5;
      const coilR = R * 0.88;
      for (let i = 0; i <= 160; i++) {
        const f = i / 160;
        const ang = f * turns * Math.PI * 2;
        coilPoints.push(new THREE.Vector3(
          Math.cos(ang) * coilR,
          this.botY + 0.35 + f * (H - 0.85),
          Math.sin(ang) * coilR
        ));
      }
      const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
      this.coilMat = this.mat(0x94a3b8, 0.82, 0.24, {
        transparent: true,
        opacity: 0.45,
        emissive: 0x000000,
        emissiveIntensity: 0
      });
      const coilMesh = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 140, 0.022, 8, false), this.coilMat);
      g.add(coilMesh);

      // O-Ring de vedação superior (componente individual para vista explodida)
      const oRingMesh = new THREE.Mesh(
        new THREE.TorusGeometry(R * 1.01, 0.032, 12, 56),
        this.mat(0xf59e0b, 0.35, 0.35, { emissive: 0xb45309, emissiveIntensity: 0.25 })
      );
      oRingMesh.rotation.x = Math.PI / 2;
      oRingMesh.position.y = this.topY - 0.02;
      this.compGroups.oRing.add(oRingMesh);
    },

    buildBaffles() {
      const g = this.compGroups.baffles;
      const R = this.R;
      const H = this.H;
      const midY = this.botY + H / 2;
      const mBaffle = this.mat(0xcbd5e1, 0.85, 0.22, { transparent: true, opacity: 0.72 });

      // 4 Chicanas verticais (baffles) defasadas em 90°
      const angles = [0.28, Math.PI - 0.28, Math.PI + 0.28, -0.28];
      angles.forEach(a => {
        const bx = Math.cos(a) * (R * 0.89);
        const bz = Math.sin(a) * (R * 0.89);
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.14, H * 0.84, 0.025), mBaffle);
        baffle.position.set(bx, midY - 0.05, bz);
        baffle.rotation.y = -a;
        g.add(baffle);
      });
    },

    buildShaftAndImpellers() {
      const gShaft = this.compGroups.shaft;
      const gImp = this.compGroups.impellers;
      const R = this.R;
      const H = this.H;
      const mInox = this.mat(0xe2e8f0, 0.92, 0.14);
      const mHub = this.mat(0x94a3b8, 0.86, 0.20);

      // Eixo agitador central
      const shaftLen = H + 0.55;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, shaftLen, 24), mInox);
      shaft.position.y = this.botY + shaftLen / 2 - 0.05;
      gShaft.add(shaft);

      // Mancal guia inferior
      const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.14, 20), mHub);
      bearing.position.y = this.botY + 0.04;
      gShaft.add(bearing);

      // 3 Turbinas Rushton de 6 pás planas (Di = 1,007 m -> raio ~0.50 m)
      this.impellerLevelsY = [
        this.botY + H * 0.19,
        this.botY + H * 0.44,
        this.botY + H * 0.69
      ];
      const impR = R * 0.38;

      this.impellerLevelsY.forEach(iy => {
        const rushton = new THREE.Group();
        rushton.position.y = iy;

        // Cubo central
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 20), mHub);
        rushton.add(hub);

        // Disco intermediário Rushton
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(impR * 0.74, impR * 0.74, 0.032, 32), mInox);
        rushton.add(disc);

        // 6 pás verticais radiais com chanfro industrial
        for (let b = 0; b < 6; b++) {
          const ang = (b / 6) * Math.PI * 2;
          const bladeGroup = new THREE.Group();
          bladeGroup.rotation.y = ang;

          const blade = new THREE.Mesh(new THREE.BoxGeometry(impR * 0.52, 0.20, 0.028), mInox);
          blade.position.x = impR * 0.74;
          bladeGroup.add(blade);
          rushton.add(bladeGroup);
        }

        gImp.add(rushton);
      });
    },

    buildTopHeadAndMotor() {
      const g = this.compGroups.topHead;
      const R = this.R;
      const topY = this.topY;
      const mInox = this.mat(0xdbe4eb, 0.90, 0.16);
      const mInoxDark = this.mat(0x8fa1b3, 0.82, 0.25);
      const mBrass = this.mat(0xd99b26, 0.78, 0.24);
      const mMotorBlue = this.mat(0x1d4ed8, 0.62, 0.28);

      // Cabeçote torisférico superior em aço inox polido
      const domeGeo = new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, mInox);
      dome.scale.y = 0.38;
      dome.position.y = topY;
      g.add(dome);

      // Flange superior aparafusado (32 parafusos)
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.055, R * 1.055, 0.12, 52), mInoxDark);
      flange.position.y = topY;
      g.add(flange);

      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.17, 6), mInox);
        bolt.position.set(Math.cos(a) * R * 1.02, topY, Math.sin(a) * R * 1.02);
        g.add(bolt);
      }

      // Lanterna do selo mecânico duplo + Redutor planetário + Motor elétrico aletado M-301
      const sealHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.34, 24), mInoxDark);
      sealHousing.position.y = topY + 0.64;
      g.add(sealHousing);

      const gearbox = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.36, 28), mInox);
      gearbox.position.y = topY + 0.96;
      g.add(gearbox);

      this.motorBodyMat = mMotorBlue.clone();
      const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.68, 28), this.motorBodyMat);
      motorBody.position.y = topY + 1.48;
      g.add(motorBody);

      // Aletas verticais de refrigeração do motor M-301
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.58, 0.07), mInoxDark);
        fin.position.set(Math.cos(a) * 0.35, topY + 1.48, Math.sin(a) * 0.35);
        fin.rotation.y = -a;
        g.add(fin);
      }

      const motorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 0.16, 28), mInox);
      motorCap.position.y = topY + 1.88;
      g.add(motorCap);

      // Bocais sanitários, visores e linhas de alimentação no domo superior (como na referência)
      const nozzleOffsets = [-0.95, -0.62, 0.62, 0.95];
      nozzleOffsets.forEach((nx, idx) => {
        const ny = topY + 0.36;
        const nz = (idx % 2 === 0 ? 0.22 : -0.18);
        const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.55, 14), idx % 2 === 0 ? mInox : mBrass);
        riser.position.set(nx, ny + 0.22, nz);
        g.add(riser);

        const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), mBrass);
        valve.position.set(nx, ny + 0.48, nz);
        g.add(valve);

        // Curva superior conectando ao barramento
        const curvePts = [
          new THREE.Vector3(nx, ny + 0.50, nz),
          new THREE.Vector3(nx, ny + 0.85, nz),
          new THREE.Vector3(nx * 1.18, ny + 0.85, nz)
        ];
        const pipeCurve = new THREE.CatmullRomCurve3(curvePts);
        const pipeMesh = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 20, 0.036, 10, false), idx % 2 === 0 ? mInox : mBrass);
        g.add(pipeMesh);
      });
    },

    buildFermentationBroth() {
      const g = this.compGroups.internals;
      const R = this.R * 0.965;

      // Material translúcido do caldo fermentativo
      this.brothMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.28,
        transparent: true,
        opacity: 0.46,
        roughness: 0.18,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      // Cilindro de líquido com base em y = 0 para escalar facilmente com a fração de volume V(t)
      const cylGeo = new THREE.CylinderGeometry(R, R, 1.0, 48, 1, false);
      cylGeo.translate(0, 0.5, 0);
      this.brothMesh = new THREE.Mesh(cylGeo, this.brothMat);
      this.brothMesh.position.y = this.botY;
      g.add(this.brothMesh);

      // Calota líquida inferior preenchendo o tampo torisférico
      const botDomeGeo = new THREE.SphereGeometry(R, 40, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      this.brothBottomDome = new THREE.Mesh(botDomeGeo, this.brothMat);
      this.brothBottomDome.scale.y = 0.35;
      this.brothBottomDome.position.y = this.botY;
      g.add(this.brothBottomDome);

      // Menisco luminoso ondulante na superfície do líquido
      const ringPts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
      }
      this.meniscusGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      this.meniscusLine = new THREE.Line(
        this.meniscusGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 })
      );
      g.add(this.meniscusLine);

      // Disco luminoso na superfície livre do caldo
      this.surfaceDisc = new THREE.Mesh(
        new THREE.CircleGeometry(R, 48),
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      this.surfaceDisc.rotation.x = -Math.PI / 2;
      g.add(this.surfaceDisc);
    },

    // CAMADA 1 — HIDRODINÂMICA (Vórtices qualitativos de mistura dos 3 impelidores Rushton)
    buildHydroLayer3D() {
      const g = this.layerGroups.hydro;
      this.hydroLoops = [];
      const R = this.R;

      this.impellerLevelsY.forEach((iy, k) => {
        for (let loopIdx = 0; loopIdx < 4; loopIdx++) {
          const ang = (loopIdx / 4) * Math.PI * 2 + k * 0.4;
          const pts = [];
          for (let s = 0; s <= 36; s++) {
            const t = (s / 36) * Math.PI * 2;
            const rad = R * (0.52 + 0.32 * Math.cos(t));
            const py = iy + 0.42 * Math.sin(t);
            pts.push(new THREE.Vector3(Math.cos(ang) * rad, py, Math.sin(ang) * rad));
          }
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineDashedMaterial({
            color: 0x22d3ee,
            dashSize: 0.16,
            gapSize: 0.10,
            transparent: true,
            opacity: 0.55
          });
          const line = new THREE.Line(geom, mat);
          line.computeLineDistances();
          g.add(line);
          this.hydroLoops.push({ line, baseY: iy });
        }
      });
    },

    // CAMADA 2 — AERAÇÃO E BOLHAS DE OXIGÊNIO (Sparger -> Caldo -> Superfície)
    buildBubblesLayer3D() {
      const g = this.layerGroups.oxygen;
      this.bubblesData = [];
      const bubbleGeo = new THREE.SphereGeometry(0.032, 10, 10);
      this.bubbleMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.82,
        roughness: 0.05,
        metalness: 0.1
      });

      for (let i = 0; i < 165; i++) {
        const mesh = new THREE.Mesh(bubbleGeo, this.bubbleMat);
        const s = 0.55 + Math.random() * 1.15;
        mesh.scale.setScalar(s);
        g.add(mesh);
        this.bubblesData.push({
          mesh,
          fracY: Math.random(),
          angle: Math.random() * Math.PI * 2,
          radiusFrac: 0.15 + Math.random() * 0.76,
          speed: 0.22 + Math.random() * 0.36,
          wobble: Math.random() * Math.PI * 2
        });
      }
    },

    // CAMADA 3 — MICÉLIO FILAMENTOSO (Hifas ramificadas 3D de Streptomyces clavuligerus)
    buildMyceliumLayer3D() {
      const g = this.layerGroups.mycelium;
      this.myceliaData = [];
      const hyphaMat = new THREE.LineBasicMaterial({
        color: 0x86efac,
        transparent: true,
        opacity: 0.78
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.72
      });
      const coreGeo = new THREE.SphereGeometry(0.035, 8, 8);

      for (let i = 0; i < 52; i++) {
        const cluster = new THREE.Group();
        const pts = [];
        const branches = 7 + (i % 5);
        for (let b = 0; b < branches; b++) {
          const theta = (b / branches) * Math.PI * 2 + (i * 0.4);
          const phi = (Math.random() - 0.5) * 2.2;
          const len = 0.14 + Math.random() * 0.12;
          const mid = new THREE.Vector3(
            Math.cos(theta) * Math.cos(phi) * len * 0.55,
            Math.sin(phi) * len * 0.55,
            Math.sin(theta) * Math.cos(phi) * len * 0.55
          );
          const tip = new THREE.Vector3(
            Math.cos(theta + 0.25) * Math.cos(phi) * len,
            Math.sin(phi + 0.2) * len,
            Math.sin(theta + 0.25) * Math.cos(phi) * len
          );
          pts.push(new THREE.Vector3(0, 0, 0), mid, mid, tip);

          // Ramificação secundária
          const fork = mid.clone().add(new THREE.Vector3(
            Math.cos(theta - 0.6) * len * 0.45,
            (Math.random() - 0.5) * len * 0.5,
            Math.sin(theta - 0.6) * len * 0.45
          ));
          pts.push(mid, fork);
        }
        const lineSegs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), hyphaMat);
        cluster.add(lineSegs);
        cluster.add(new THREE.Mesh(coreGeo, coreMat));
        g.add(cluster);

        this.myceliaData.push({
          cluster,
          fracY: 0.08 + Math.random() * 0.84,
          angle: Math.random() * Math.PI * 2,
          radiusFrac: 0.22 + Math.random() * 0.68,
          rotSpeed: (Math.random() - 0.5) * 1.4,
          seed: i * 1.37
        });
      }
    },

    // CAMADA 4 — PARTÍCULAS DE ÁCIDO CLAVULÂNICO (Pi intracelular / Pe extracelular)
    buildProductLayer3D() {
      const g = this.layerGroups.product;
      this.productData = [];
      const prodGeo = new THREE.SphereGeometry(0.026, 8, 8);
      this.prodMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.88
      });

      for (let i = 0; i < 120; i++) {
        const mesh = new THREE.Mesh(prodGeo, this.prodMat);
        g.add(mesh);
        this.productData.push({
          mesh,
          fracY: 0.06 + Math.random() * 0.88,
          angle: Math.random() * Math.PI * 2,
          radiusFrac: 0.14 + Math.random() * 0.78,
          seed: i * 0.91
        });
      }
    },

    // Âncoras 3D dos Sensores para as linhas de chamada do HUD (Seção 7)
    buildSensorPorts3D() {
      const R = this.R;
      this.sensorAnchors = {
        'AIC-301': new THREE.Vector3(-R * 1.04, this.topY - 0.55, 0.25),
        'FIC-301': new THREE.Vector3(-R * 1.05, this.botY + this.H * 0.60, 0.20),
        'LIC-301': new THREE.Vector3(-R * 1.05, this.botY + this.H * 0.30, 0.20),
        'M-301':   new THREE.Vector3(-0.34, this.topY + 1.42, 0.15),
        'TIC-301': new THREE.Vector3(R * 1.04, this.topY - 0.45, 0.25),
        'DO-301':  new THREE.Vector3(R * 1.05, this.botY + this.H * 0.62, 0.20),
        'R-301':   new THREE.Vector3(R * 1.02, this.botY + this.H * 0.36, 0.25),
        'KLA-301': new THREE.Vector3(R * 0.88, this.botY + 0.32, 0.25)
      };
    },

    setupInteraction() {
      const dom = this.renderer.domElement;
      let drag = null;

      dom.addEventListener('pointerdown', ev => {
        drag = { x: ev.clientX, y: ev.clientY };
        dom.setPointerCapture(ev.pointerId);
      });

      dom.addEventListener('pointermove', ev => {
        if (!drag) return;
        const dx = ev.clientX - drag.x;
        const dy = ev.clientY - drag.y;
        drag.x = ev.clientX;
        drag.y = ev.clientY;

        this.spherical.theta -= dx * 0.007;
        this.spherical.phi = Math.max(0.35, Math.min(2.65, this.spherical.phi - dy * 0.006));
        this.camera.position.setFromSpherical(this.spherical).add(this.target);
        this.camera.lookAt(this.target);
      });

      dom.addEventListener('pointerup', () => { drag = null; });
      dom.addEventListener('wheel', ev => {
        ev.preventDefault();
        this.zoom(ev.deltaY > 0 ? 1.08 : 0.92);
      }, { passive: false });
    },

    zoom(factor) {
      if (!this.spherical) return;
      this.spherical.radius = Math.max(6.8, Math.min(18.5, this.spherical.radius * factor));
      this.camera.position.setFromSpherical(this.spherical).add(this.target);
      this.camera.lookAt(this.target);
    },

    resetCamera() {
      if (!this.camera || !this.target) return;
      this.target.set(0, 0.25, 0);
      this.camera.position.set(0, 0.35, 11.4);
      this.camera.lookAt(this.target);
      this.spherical.setFromVector3(this.camera.position.clone().sub(this.target));
    },

    setLayer(key, enabled) {
      if (!(key in this.layers)) return;
      this.layers[key] = !!enabled;
      if (this.layerGroups && this.layerGroups[key]) {
        this.layerGroups[key].visible = !!enabled;
      }
    },

    setViewMode(mode) {
      this.viewMode = mode;
      this.explodeTarget = mode === 'explodida' ? 1.0 : 0.0;

      if (!this.shellMesh) return;
      if (mode === 'externa') {
        this.shellMesh.material = this.opaqueShellMat;
        this.shellMesh.material.clippingPlanes = [];
      } else if (mode === 'corte') {
        this.shellMesh.material = this.opaqueShellMat;
        this.shellMesh.material.clippingPlanes = [this.cutPlane];
      } else {
        this.shellMesh.material = this.glassShellMat;
        this.shellMesh.material.opacity = mode === 'transparente' ? 0.11 : 0.24;
        this.shellMesh.material.clippingPlanes = [];
      }
    },

    setComponentVisible(compKey, visible) {
      this.componentsVisible[compKey] = !!visible;
      if (this.compGroups && this.compGroups[compKey]) {
        this.compGroups[compKey].visible = !!visible;
      }
    },

    resize() {
      if (!this.container || !this.renderer) return;
      const w = Math.max(300, this.container.clientWidth);
      const h = Math.max(320, this.container.clientHeight);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },

    // Projeta as coordenadas 3D dos sensores para atualizar as linhas de chamada SVG no HUD
    getProjectedSensorCoords() {
      if (!this.container || !this.camera || !this.sensorAnchors) return null;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const out = {};
      for (const [code, vec] of Object.entries(this.sensorAnchors)) {
        const worldVec = vec.clone().applyMatrix4(this.root.matrixWorld);
        const p = worldVec.project(this.camera);
        out[code] = {
          x: (p.x * 0.5 + 0.5) * w,
          y: (-p.y * 0.5 + 0.5) * h
        };
      }
      return { width: w, height: h, points: out };
    },

    drawFrame(dtSec, sim, pt) {
      if (!this.initialized || !sim || !pt) return;
      const isPlaying = BioSim.App ? BioSim.App.playing : true;
      const effDt = isPlaying ? dtSec : 0;

      // 1. Transição suave de Visualização Explodida (Componentes)
      this.explodeProgress += (this.explodeTarget - this.explodeProgress) * Math.min(1, dtSec * 6.0);
      const ep = this.explodeProgress;
      this.compGroups.topHead.position.y = ep * 1.45;
      this.compGroups.oRing.position.y = ep * 0.85;
      this.compGroups.vesselShell.position.x = -ep * 1.65;
      this.compGroups.baffles.position.x = ep * 1.55;
      this.compGroups.bottomHead.position.y = -ep * 1.15;
      this.compGroups.internals.visible = ep < 0.35 && this.viewMode !== 'externa';

      // Auto-rotação 360° opcional
      if (this.autoRotate) {
        this.root.rotation.y += dtSec * 0.45;
      } else {
        this.root.rotation.y *= 0.92;
      }

      // 2. Rotação proporcional dos 3 Impelidores Rushton + Eixo
      const omega = (pt.N / 60.0) * Math.PI * 1.8;
      this.compGroups.impellers.rotation.y += effDt * omega;
      this.compGroups.shaft.rotation.y += effDt * omega;

      // Alerta visual no motor M-301 se torque > 9,15 kN·m
      if (this.motorBodyMat) {
        this.motorBodyMat.color.setHex(pt.torque > 9.15 ? 0xdc2626 : 0x1d4ed8);
      }

      // Alerta térmico na serpentina interna quando Q/V > 3,0 kW/m³
      if (this.coilMat) {
        const hot = pt.Q_spec > 3.0;
        this.coilMat.emissive.setHex(pt.Q_spec > 6.0 ? 0xef4444 : (hot ? 0xf97316 : 0x000000));
        this.coilMat.emissiveIntensity = hot ? 0.55 : 0.0;
      }

      // 3. Nível dinâmico do Caldo Fermentativo (V de 26,9 a 41,92 m³ dentro de 60 m³)
      const fillFrac = Math.min(0.86, Math.max(0.42, pt.V / 56.0));
      const liqH = this.H * fillFrac;
      const liqTopY = this.botY + liqH;
      this.brothMesh.scale.y = liqH;
      this.surfaceDisc.position.y = liqTopY;
      this.meniscusLine.position.y = liqTopY;

      // Ondulação superficial do menisco proporcional à rotação N
      const posAttr = this.meniscusGeo.attributes.position;
      const waveAmp = 0.025 + Math.min(0.045, pt.N / 3500);
      const now = performance.now() * 0.004;
      for (let i = 0; i < posAttr.count; i++) {
        const ang = (i / (posAttr.count - 1)) * Math.PI * 2;
        posAttr.setY(i, Math.sin(ang * 4 + now) * waveAmp);
      }
      posAttr.needsUpdate = true;

      // 4. Animação da Camada 1: Hidrodinâmica
      if (this.layers.hydro) {
        this.layerGroups.hydro.rotation.y += effDt * omega * 0.25;
        this.hydroLoops.forEach(hl => {
          hl.line.visible = hl.baseY < liqTopY - 0.15;
        });
      }

      // 5. Animação da Camada 2: Bolhas de Oxigênio (vvm + antialagamento)
      if (this.layers.oxygen) {
        const vvm = sim.config.vvm;
        const activeBubbles = Math.min(this.bubblesData.length, Math.max(25, Math.round(vvm * 220)));
        const spread = pt.isFlooded ? 0.30 : 0.94;
        this.bubbleMat.color.setHex(pt.OD < 20 ? 0xfca5a5 : 0xe0f2fe);

        this.bubblesData.forEach((b, idx) => {
          if (idx >= activeBubbles) {
            b.mesh.visible = false;
            return;
          }
          b.mesh.visible = true;
          b.fracY += effDt * b.speed * (0.65 + vvm * 0.85);
          if (b.fracY >= 0.98) {
            b.fracY = 0.04;
            b.radiusFrac = 0.12 + Math.random() * 0.78;
          }
          b.angle += effDt * (1.2 + (1 - b.radiusFrac) * 1.8);
          const r = this.R * b.radiusFrac * spread;
          const py = this.botY + 0.20 + b.fracY * (liqH - 0.24);
          b.mesh.position.set(
            Math.cos(b.angle) * r,
            py,
            Math.sin(b.angle) * r
          );
        });
      }

      // 6. Animação da Camada 3: Biomassa Micelial Filamentosa X(t)
      if (this.layers.mycelium) {
        const activeMycelia = Math.min(
          this.myceliaData.length,
          Math.max(5, Math.round((pt.X / 22.0) * this.myceliaData.length))
        );
        const viscDamp = 1.0 / (1.0 + pt.muAp / 200.0);
        const scaleX = 0.65 + Math.min(1.1, pt.X / 15.0);

        this.myceliaData.forEach((m, idx) => {
          if (idx >= activeMycelia) {
            m.cluster.visible = false;
            return;
          }
          m.cluster.visible = true;
          m.cluster.scale.setScalar(scaleX);
          m.angle += effDt * 0.65 * viscDamp * (idx % 2 === 0 ? 1 : -0.8);
          m.cluster.rotation.x += effDt * m.rotSpeed * viscDamp;
          m.cluster.rotation.y += effDt * m.rotSpeed * 0.8 * viscDamp;

          const r = this.R * m.radiusFrac * 0.88;
          const py = this.botY + 0.25 + m.fracY * (liqH - 0.38);
          m.cluster.position.set(
            Math.cos(m.angle) * r,
            py,
            Math.sin(m.angle) * r
          );
        });
      }

      // 7. Animação da Camada 4: Biossíntese e Liberação de Ácido Clavulânico (Pi / Pe)
      if (this.layers.product) {
        const activeProd = Math.min(
          this.productData.length,
          Math.max(6, Math.round(((pt.Pe + pt.Pi * 0.5) / 900.0) * this.productData.length))
        );
        this.productData.forEach((p, idx) => {
          if (idx >= activeProd || pt.Pe < 2) {
            p.mesh.visible = false;
            return;
          }
          p.mesh.visible = true;
          p.angle += effDt * 0.9;
          const r = this.R * p.radiusFrac * 0.86;
          const py = this.botY + 0.22 + p.fracY * (liqH - 0.30);
          p.mesh.position.set(
            Math.cos(p.angle) * r,
            py,
            Math.sin(p.angle) * r
          );
        });
      }

      this.renderer.render(this.scene, this.camera);
    }
  };

  BioSim.Reactor3D = Reactor3D;
})(window);
