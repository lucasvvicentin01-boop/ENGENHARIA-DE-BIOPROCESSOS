/* ============================================================================
 * CLAVIS Digital Twin — Módulo 03: Célula 3D de Streptomyces clavuligerus (Three.js)
 * Representação microscópica tridimensional da morfologia filamentosa (hifa
 * vegetativa em corte longitudinal + rede micelial ramificada), parede celular,
 * membrana plasmática, citoplasma, ribossomos, nucleoide cromossomal, cluster
 * biossintético pSCL4, entrada de precursores (Glicerol + L-Arginina), pool
 * intracelular (Pi) e liberação extracelular de Ácido Clavulânico (Pe) via φ(γ̇).
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});
  const THREE = global.THREE;
  if (!THREE) {
    BioSim.Cell3D = { available: false };
    return;
  }

  const Cell3D = {
    available: true,
    initialized: false,
    autoRotate: false,
    selectedStructure: null,
    layers: {
      morphology: true, // Camada 1: Morfologia (hifas e micélio)
      structure: true,  // Camada 2: Estrutura celular (parede, membrana, citoplasma, ribossomos)
      genetics: true,   // Camada 3: Material genético (Nucleoide DNA e cluster pSCL4)
      metabolism: true, // Camada 4: Metabolismo (rotas e entrada de Glicerol + L-Arginina)
      product: true     // Camada 5: Ácido clavulânico (pool Pi intracelular e liberação Pe)
    },

    init(container) {
      if (this.initialized || !container) return;
      this.container = container;
      this.initialized = true;

      // Cena e neblina de profundidade de campo microscópica
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x040d17);
      scene.fog = new THREE.FogExp2(0x040d17, 0.042);
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0.4, 10.6);
      this.camera = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.28;
      this.renderer = renderer;

      const oldCanvas = container.querySelector('#cell-canvas');
      if (oldCanvas) oldCanvas.style.display = 'none';
      renderer.domElement.className = 'cell-webgl-canvas';
      container.insertBefore(renderer.domElement, container.firstChild);

      // Iluminação microscópica de fluorescência / campo escuro
      scene.add(new THREE.HemisphereLight(0x7dd3fc, 0x030b14, 1.35));

      const keyTurquoise = new THREE.DirectionalLight(0x2dd4bf, 2.5);
      keyTurquoise.position.set(-6, 8, 7);
      scene.add(keyTurquoise);

      const rimBlue = new THREE.DirectionalLight(0x38bdf8, 2.1);
      rimBlue.position.set(7, -5, -4);
      scene.add(rimBlue);

      // Luzes pontuais bioluminescentes no interior da hifa (Nucleoide + Pool AC)
      this.dnaLight = new THREE.PointLight(0xa855f7, 2.8, 5.5);
      this.dnaLight.position.set(-0.2, -0.15, 0.3);
      scene.add(this.dnaLight);

      this.acLight = new THREE.PointLight(0xf59e0b, 3.2, 6.0);
      this.acLight.position.set(1.15, 0.25, 0.4);
      scene.add(this.acLight);

      // Grupo raiz inclinável/orbitável
      this.root = new THREE.Group();
      scene.add(this.root);

      // Grupos das 5 Camadas Biológicas (Seção 10)
      this.layerGroups = {
        morphology: new THREE.Group(),
        structure: new THREE.Group(),
        genetics: new THREE.Group(),
        metabolism: new THREE.Group(),
        product: new THREE.Group()
      };
      Object.values(this.layerGroups).forEach(g => this.root.add(g));

      // Construir as 5 camadas tridimensionais de Streptomyces clavuligerus
      this.buildMicroscopicBackgroundParticles();
      this.buildMycelialMorphology3D();     // Camada 1: Rede de hifas ramificadas
      this.buildCutawayHyphaStructure3D();  // Camada 2: Parede, membrana, citoplasma e ribossomos
      this.buildGeneticMaterial3D();        // Camada 3: Nucleoide DNA + Cluster pSCL4
      this.buildMetabolicPrecursors3D();    // Camada 4: Entrada de Glicerol + L-Arginina
      this.buildClavulanicAcidBiosynthesis3D(); // Camada 5: Pool Pi + Liberação Pe
      this.buildAnatomicalAnchors();

      // Controle orbital 3D (rotação, zoom, pan)
      this.target = new THREE.Vector3(0, 0, 0);
      this.spherical = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.target));
      this.cameraAnim = null;
      this.setupInteraction();

      new ResizeObserver(() => this.resize()).observe(container);
      this.resize();
    },

    buildMicroscopicBackgroundParticles() {
      const bgGroup = new THREE.Group();
      this.scene.add(bgGroup);
      const geo = new THREE.BufferGeometry();
      const count = 220;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 18;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = -2 - Math.random() * 10;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x22d3ee,
        size: 0.08,
        transparent: true,
        opacity: 0.35
      });
      this.bgPoints = new THREE.Points(geo, mat);
      bgGroup.add(this.bgPoints);
    },

    // ========================================================================
    // CAMADA 1 — MORFOLOGIA: Hifas Vegetativas e Rede Micelial Ramificada
    // ========================================================================
    buildMycelialMorphology3D() {
      const g = this.layerGroups.morphology;

      const hyphaMat = new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        emissive: 0x064e3b,
        emissiveIntensity: 0.35,
        roughness: 0.32,
        metalness: 0.18
      });

      const branchMat = new THREE.MeshStandardMaterial({
        color: 0x0891b2,
        emissive: 0x083344,
        emissiveIntensity: 0.32,
        roughness: 0.38,
        metalness: 0.15
      });

      // Conjunto de hifas ramificadas conectadas formando o micélio de S. clavuligerus
      const branchPaths = [
        // Hifa principal prolongando-se além da seção em corte (diagonal SO -> NE)
        {
          r: 0.52, mat: hyphaMat,
          pts: [[-4.8, -2.6, -0.6], [-3.2, -1.5, -0.2], [-2.1, -0.85, 0.0]]
        },
        {
          r: 0.52, mat: hyphaMat,
          pts: [[2.1, 0.85, 0.0], [3.5, 1.55, -0.25], [5.0, 2.35, -0.7]]
        },
        // Ramificação superior esquerda (Micélio ramificado)
        {
          r: 0.34, mat: hyphaMat,
          pts: [[-1.1, 0.1, -0.1], [-1.4, 1.35, -0.2], [-2.5, 2.25, -0.45], [-3.9, 2.85, -0.8]]
        },
        // Sub-ramo superior central
        {
          r: 0.24, mat: branchMat,
          pts: [[-1.4, 1.35, -0.2], [-0.4, 2.55, -0.35], [0.4, 3.75, -0.6]]
        },
        // Sub-ramo esquerdo médio
        {
          r: 0.25, mat: branchMat,
          pts: [[-2.5, 1.85, -0.35], [-3.8, 1.15, -0.5], [-4.9, 1.45, -0.9]]
        },
        // Ramificação superior direita
        {
          r: 0.30, mat: hyphaMat,
          pts: [[1.35, 0.72, -0.1], [1.95, 2.10, -0.3], [2.95, 3.35, -0.65]]
        },
        // Ramificação inferior direita
        {
          r: 0.28, mat: branchMat,
          pts: [[0.85, -0.35, -0.15], [1.85, -1.55, -0.35], [3.25, -2.45, -0.7]]
        },
        // Ramificação inferior esquerda
        {
          r: 0.26, mat: branchMat,
          pts: [[-2.6, -1.15, -0.2], [-2.1, -2.45, -0.45], [-1.5, -3.55, -0.8]]
        },
        // Filamentos de fundo para profundidade 3D
        {
          r: 0.18, mat: branchMat,
          pts: [[-4.2, -0.3, -1.6], [-2.2, 0.6, -1.4], [0.2, 1.8, -1.5], [2.8, 2.9, -1.9]]
        },
        {
          r: 0.17, mat: branchMat,
          pts: [[-1.8, -2.8, -1.5], [0.3, -1.5, -1.3], [2.4, -0.6, -1.5], [4.5, 0.2, -1.8]]
        }
      ];

      this.myceliumBranches = [];
      branchPaths.forEach((bp, idx) => {
        const curve = new THREE.CatmullRomCurve3(bp.pts.map(p => new THREE.Vector3(...p)));
        const geo = new THREE.TubeGeometry(curve, 36, bp.r, 18, false);
        const mesh = new THREE.Mesh(geo, bp.mat);
        g.add(mesh);
        this.myceliumBranches.push({ mesh, curve, idx });

        // Septos celulares e anéis de textura orgânica ao longo das hifas
        for (let f = 0.25; f <= 0.85; f += 0.30) {
          const pt = curve.getPoint(f);
          const tan = curve.getTangent(f);
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(bp.r * 1.01, bp.r * 0.06, 8, 20),
            new THREE.MeshStandardMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.38, roughness: 0.3 })
          );
          ring.position.copy(pt);
          ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().normalize());
          g.add(ring);
        }
      });
    },

    // ========================================================================
    // CAMADA 2 — ESTRUTURA CELULAR: Hifa Central em Corte Longitudinal
    // (Parede Celular, Membrana Plasmática, Citoplasma e Ribossomos)
    // ========================================================================
    buildCutawayHyphaStructure3D() {
      const g = this.layerGroups.structure;

      // Grupo inclinado a ~22° reproduzindo o ângulo exato da hifa central na imagem de referência
      const hyphaCapsule = new THREE.Group();
      hyphaCapsule.rotation.z = 0.38;
      this.hyphaCapsule = hyphaCapsule;
      g.add(hyphaCapsule);

      const len = 4.35;
      const rOuter = 0.92; // Parede celular externa
      const rMem   = 0.83; // Membrana plasmática interna
      const rCyto  = 0.78; // Matriz citoplasmática

      // 1. Parede Celular (Peptidoglicano espesso de Gram-positivo) — corte longitudinal frontal aberto
      const wallMat = new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        emissive: 0x0369a1,
        emissiveIntensity: 0.28,
        roughness: 0.22,
        metalness: 0.15,
        transparent: true,
        opacity: 0.86,
        side: THREE.DoubleSide
      });

      // Cilindro aberto na frente (de theta = 0.55π até 1.95π)
      const wallCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(rOuter, rOuter, len, 48, 1, true, Math.PI * 0.52, Math.PI * 1.38),
        wallMat
      );
      wallCyl.rotation.z = Math.PI / 2;
      hyphaCapsule.add(wallCyl);

      // Calotas hemisféricas nas extremidades da seção em corte
      [-len / 2, len / 2].forEach((xPos, idx) => {
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(rOuter, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
          wallMat
        );
        cap.position.x = xPos;
        cap.rotation.z = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
        hyphaCapsule.add(cap);
      });

      // Borda luminosa esculpida do corte da Parede Celular (destaca a espessura da parede)
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.55,
        roughness: 0.2
      });
      const topEdgePts = [
        new THREE.Vector3(-len * 0.48, 0.1, rOuter * 0.72),
        new THREE.Vector3(-len * 0.35, rOuter * 0.74, rOuter * 0.55),
        new THREE.Vector3(0, rOuter * 0.82, rOuter * 0.48),
        new THREE.Vector3(len * 0.35, rOuter * 0.74, rOuter * 0.55),
        new THREE.Vector3(len * 0.48, 0.1, rOuter * 0.72),
        new THREE.Vector3(len * 0.35, -rOuter * 0.74, rOuter * 0.55),
        new THREE.Vector3(0, -rOuter * 0.82, rOuter * 0.48),
        new THREE.Vector3(-len * 0.35, -rOuter * 0.74, rOuter * 0.55),
        new THREE.Vector3(-len * 0.48, 0.1, rOuter * 0.72)
      ];
      const rimCurve = new THREE.CatmullRomCurve3(topEdgePts, true);
      const wallRim = new THREE.Mesh(new THREE.TubeGeometry(rimCurve, 80, 0.055, 12, true), rimMat);
      hyphaCapsule.add(wallRim);

      // 2. Membrana Plasmática (Bicamada lipídica interna verde-turquesa)
      const memMat = new THREE.MeshPhysicalMaterial({
        color: 0x10b981,
        emissive: 0x047857,
        emissiveIntensity: 0.32,
        roughness: 0.25,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide
      });
      const memCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(rMem, rMem, len * 0.96, 44, 1, true, Math.PI * 0.55, Math.PI * 1.32),
        memMat
      );
      memCyl.rotation.z = Math.PI / 2;
      hyphaCapsule.add(memCyl);

      // Borda interna dourada/esmeralda da Membrana Plasmática
      const memRim = new THREE.Mesh(
        new THREE.TubeGeometry(rimCurve, 80, 0.032, 10, true),
        new THREE.MeshBasicMaterial({ color: 0x34d399 })
      );
      memRim.scale.set(0.95, 0.91, 0.92);
      hyphaCapsule.add(memRim);

      // 3. Citoplasma (Volume interno translúcido)
      const cytoMat = new THREE.MeshPhysicalMaterial({
        color: 0x042f2e,
        emissive: 0x0f766e,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.36,
        roughness: 0.15,
        depthWrite: false
      });
      const cytoCyl = new THREE.Mesh(new THREE.CylinderGeometry(rCyto, rCyto, len * 0.92, 32), cytoMat);
      cytoCyl.rotation.z = Math.PI / 2;
      hyphaCapsule.add(cytoCyl);

      // 4. Ribossomos e Complexos Enzimáticos Intracelulares (esferas texturizadas no citoplasma)
      const riboGeo = new THREE.DodecahedronGeometry(0.085, 1);
      const riboMat1 = new THREE.MeshStandardMaterial({
        color: 0x2dd4bf,
        emissive: 0x0d9488,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const riboMat2 = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        roughness: 0.25
      });

      this.ribosomes = [];
      for (let i = 0; i < 38; i++) {
        const rx = (Math.random() - 0.5) * (len * 0.78);
        const ry = (Math.random() - 0.5) * (rCyto * 1.15);
        const rz = -0.35 + Math.random() * 0.65;
        // Deixa o centro livre para o Nucleoide e o Cluster pSCL4
        if (Math.abs(rx) < 0.75 && Math.abs(ry) < 0.38 && rz > -0.1) continue;

        const mesh = new THREE.Mesh(riboGeo, i % 3 === 0 ? riboMat2 : riboMat1);
        const sc = 0.55 + Math.random() * 0.85;
        mesh.scale.setScalar(sc);
        mesh.position.set(rx, ry, rz);
        hyphaCapsule.add(mesh);
        this.ribosomes.push({ mesh, baseY: ry, phase: i * 0.7 });
      }
    },

    // ========================================================================
    // CAMADA 3 — MATERIAL GENÉTICO: Nucleoide (DNA Cromossomal) + Cluster pSCL4
    // ========================================================================
    buildGeneticMaterial3D() {
      const g = this.layerGroups.genetics;
      const geneticHolder = new THREE.Group();
      geneticHolder.rotation.z = 0.38; // Alinhado ao interior da hifa em corte
      g.add(geneticHolder);
      this.geneticHolder = geneticHolder;

      // 1. Nucleoide (DNA Cromossomal linear superenovelado em roxo/violeta luminescente)
      const nucPts = [];
      const steps = 220;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 12;
        const x = -0.25 + 0.58 * Math.sin(t * 0.25) + 0.16 * Math.cos(t * 1.5);
        const y = 0.34 * Math.cos(t * 0.33) + 0.14 * Math.sin(t * 1.7);
        const z = 0.08 + 0.28 * Math.sin(t * 0.5) + 0.10 * Math.cos(t * 2.1);
        nucPts.push(new THREE.Vector3(x, y, z));
      }
      const nucCurve = new THREE.CatmullRomCurve3(nucPts, true);
      this.nucleoidMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.75,
        roughness: 0.22,
        metalness: 0.2
      });
      this.nucleoidMesh = new THREE.Mesh(
        new THREE.TubeGeometry(nucCurve, 220, 0.042, 10, true),
        this.nucleoidMat
      );
      geneticHolder.add(this.nucleoidMesh);

      // 2. Cluster de Biossíntese de Ácido Clavulânico (Megaplasmídeo pSCL4 — Dupla Hélice Ciano/Dourada)
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(0.68, -0.04, 0.22);
      geneticHolder.add(clusterGroup);
      this.clusterGroup = clusterGroup;

      const strand1Pts = [];
      const strand2Pts = [];
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        const R = 0.34;
        const twist = a * 6;
        strand1Pts.push(new THREE.Vector3(
          Math.cos(a) * (R + 0.045 * Math.cos(twist)),
          Math.sin(a) * (R + 0.045 * Math.cos(twist)),
          0.045 * Math.sin(twist)
        ));
        strand2Pts.push(new THREE.Vector3(
          Math.cos(a) * (R - 0.045 * Math.cos(twist)),
          Math.sin(a) * (R - 0.045 * Math.cos(twist)),
          -0.045 * Math.sin(twist)
        ));
      }

      this.pscl4Mat1 = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.85,
        roughness: 0.18
      });
      this.pscl4Mat2 = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.85,
        roughness: 0.18
      });

      clusterGroup.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand1Pts, true), 110, 0.026, 8, true),
        this.pscl4Mat1
      ));
      clusterGroup.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand2Pts, true), 110, 0.022, 8, true),
        this.pscl4Mat2
      ));
    },

    // ========================================================================
    // CAMADA 4 — METABOLISMO: Entrada de Precursores (Glicerol + L-Arginina)
    // ========================================================================
    buildMetabolicPrecursors3D() {
      const g = this.layerGroups.metabolism;
      this.precursorParticles = [];

      // Duas rotas convergentes de entrada de precursores para o interior da hifa:
      // Rota 1: Carbono (Glicerol -> G3P) em verde-esmeralda
      // Rota 2: L-Arginina em azul-ciano
      const curveGlyc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.4, 0.8, 0.8),
        new THREE.Vector3(-2.1, 0.3, 0.6),
        new THREE.Vector3(-1.0, -0.1, 0.35),
        new THREE.Vector3(0.3, 0.1, 0.25)
      ]);

      const curveArg = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.8, -1.9, 0.8),
        new THREE.Vector3(-1.6, -1.0, 0.55),
        new THREE.Vector3(-0.6, -0.35, 0.35),
        new THREE.Vector3(0.4, 0.05, 0.25)
      ]);

      const tubeMatGlyc = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.28 });
      const tubeMatArg  = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 });
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curveGlyc, 36, 0.022, 8, false), tubeMatGlyc));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curveArg, 36, 0.022, 8, false), tubeMatArg));

      const pGeo = new THREE.SphereGeometry(0.052, 10, 10);
      const pMatGlyc = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const pMatArg  = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      for (let i = 0; i < 28; i++) {
        const isGlyc = i % 2 === 0;
        const mesh = new THREE.Mesh(pGeo, isGlyc ? pMatGlyc : pMatArg);
        g.add(mesh);
        this.precursorParticles.push({
          mesh,
          curve: isGlyc ? curveGlyc : curveArg,
          phase: (i / 28),
          speed: 0.22 + (i % 5) * 0.03
        });
      }
    },

    // ========================================================================
    // CAMADA 5 — ÁCIDO CLAVULÂNICO: Pool Intracelular (Pi) e Liberação (Pe)
    // ========================================================================
    buildClavulanicAcidBiosynthesis3D() {
      const g = this.layerGroups.product;

      // 1. Pool Intracelular (Pi) — aglomerados dourados formados dentro do citoplasma
      this.piPoolGroup = new THREE.Group();
      this.piPoolGroup.rotation.z = 0.38;
      g.add(this.piPoolGroup);

      const piGeo = new THREE.SphereGeometry(0.072, 12, 12);
      this.piMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
        roughness: 0.15
      });

      this.piParticles = [];
      for (let i = 0; i < 36; i++) {
        const mesh = new THREE.Mesh(piGeo, this.piMat);
        const px = 0.55 + Math.random() * 1.15;
        const py = (Math.random() - 0.5) * 0.82;
        const pz = 0.05 + Math.random() * 0.45;
        mesh.position.set(px, py, pz);
        mesh.scale.setScalar(0.55 + Math.random() * 0.75);
        this.piPoolGroup.add(mesh);
        this.piParticles.push({ mesh, basePos: mesh.position.clone(), seed: i * 0.8 });
      }

      // 2. Liberação Extracelular (Pe) — partículas luminosas atravessando para o meio externo
      // A velocidade e quantidade ativa dependem de k_di * (γ̇ / K_γ) * Pi!
      this.peReleaseParticles = [];
      const peGeo = new THREE.SphereGeometry(0.065, 10, 10);
      this.peMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

      for (let i = 0; i < 64; i++) {
        const mesh = new THREE.Mesh(peGeo, this.peMat);
        g.add(mesh);

        // Trajetória partindo do pool Pi intracelular para o meio extracelular ao redor da hifa
        const angle = -0.9 + (i / 64) * 2.1;
        const start = new THREE.Vector3(0.9 + (i % 5) * 0.18, 0.25 + (i % 3 - 1) * 0.22, 0.35);
        const end = new THREE.Vector3(
          1.4 + Math.cos(angle) * (1.5 + (i % 4) * 0.45),
          -0.2 + Math.sin(angle) * (1.4 + (i % 3) * 0.4),
          0.5 + ((i % 5) - 2) * 0.3
        );
        this.peReleaseParticles.push({
          mesh,
          start,
          end,
          phase: (i / 64),
          seed: i * 1.13
        });
      }
    },

    // Âncoras 3D das 9 Estruturas Anatômicas e Metabólicas para os rótulos científicos
    buildAnatomicalAnchors() {
      this.structureAnchors = {
        mycelium:  new THREE.Vector3(-1.45, 1.55, -0.2),
        hypha:     new THREE.Vector3(1.55, 0.95, 0.2),
        wall:      new THREE.Vector3(-1.45, -0.22, 0.65),
        membrane:  new THREE.Vector3(-1.20, -0.45, 0.62),
        cytoplasm: new THREE.Vector3(-0.85, -0.58, 0.42),
        ribosomes: new THREE.Vector3(-0.78, -0.78, 0.45),
        nucleoid:  new THREE.Vector3(-0.22, -0.22, 0.48),
        cluster:   new THREE.Vector3(0.68, 0.18, 0.48),
        release:   new THREE.Vector3(1.85, -0.35, 0.55)
      };
    },

    setupInteraction() {
      const dom = this.renderer.domElement;
      let drag = null;

      dom.addEventListener('pointerdown', ev => {
        drag = { x: ev.clientX, y: ev.clientY, button: ev.button };
        dom.setPointerCapture(ev.pointerId);
      });

      dom.addEventListener('pointermove', ev => {
        if (!drag) return;
        const dx = ev.clientX - drag.x;
        const dy = ev.clientY - drag.y;
        drag.x = ev.clientX;
        drag.y = ev.clientY;

        if (drag.button === 2 || ev.shiftKey) {
          this.target.x -= dx * 0.008;
          this.target.y += dy * 0.008;
        } else {
          this.spherical.theta -= dx * 0.0065;
          this.spherical.phi = Math.max(0.45, Math.min(2.55, this.spherical.phi - dy * 0.006));
        }
        this.camera.position.setFromSpherical(this.spherical).add(this.target);
        this.camera.lookAt(this.target);
        this.cameraAnim = null;
      });

      dom.addEventListener('pointerup', () => { drag = null; });
      dom.addEventListener('contextmenu', ev => ev.preventDefault());
      dom.addEventListener('wheel', ev => {
        ev.preventDefault();
        this.zoom(ev.deltaY > 0 ? 1.08 : 0.92);
      }, { passive: false });
    },

    zoom(factor) {
      if (!this.spherical) return;
      this.spherical.radius = Math.max(5.2, Math.min(16.5, this.spherical.radius * factor));
      this.camera.position.setFromSpherical(this.spherical).add(this.target);
      this.camera.lookAt(this.target);
      this.cameraAnim = null;
    },

    resetCamera() {
      this.animateCameraTo(new THREE.Vector3(0, 0.4, 10.6), new THREE.Vector3(0, 0, 0));
    },

    focusStructure(key) {
      const anchor = this.structureAnchors && this.structureAnchors[key];
      if (!anchor) {
        this.resetCamera();
        return;
      }
      this.selectedStructure = key;
      const destTarget = anchor.clone().multiplyScalar(0.55);
      const destPos = destTarget.clone().add(new THREE.Vector3(0, 0.25, 7.6));
      this.animateCameraTo(destPos, destTarget);
    },

    animateCameraTo(destPos, destTarget) {
      this.cameraAnim = {
        fromPos: this.camera.position.clone(),
        toPos: destPos.clone(),
        fromTgt: this.target.clone(),
        toTgt: destTarget.clone(),
        t: 0,
        dur: 0.65
      };
    },

    setLayer(key, enabled) {
      if (!(key in this.layers)) return;
      this.layers[key] = !!enabled;
      if (this.layerGroups && this.layerGroups[key]) {
        this.layerGroups[key].visible = !!enabled;
      }
    },

    resize() {
      if (!this.container || !this.renderer) return;
      const w = Math.max(300, this.container.clientWidth);
      const h = Math.max(300, this.container.clientHeight);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },

    getProjectedAnchors() {
      if (!this.container || !this.camera || !this.structureAnchors) return null;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const pts = {};
      for (const [k, vec] of Object.entries(this.structureAnchors)) {
        const wv = vec.clone().applyMatrix4(this.root.matrixWorld);
        const p = wv.project(this.camera);
        pts[k] = {
          x: (p.x * 0.5 + 0.5) * w,
          y: (-p.y * 0.5 + 0.5) * h
        };
      }
      return { width: w, height: h, points: pts };
    },

    drawFrame(dtSec, sim, pt) {
      if (!this.initialized || !sim || !pt) return;
      const isPlaying = BioSim.App ? BioSim.App.playing : true;
      const effDt = isPlaying ? dtSec : 0;
      const now = performance.now() * 0.001;

      // Interpolação suave de câmera
      if (this.cameraAnim) {
        this.cameraAnim.t += dtSec;
        const p = Math.min(1, this.cameraAnim.t / this.cameraAnim.dur);
        const ease = p * p * (3 - 2 * p);
        this.camera.position.lerpVectors(this.cameraAnim.fromPos, this.cameraAnim.toPos, ease);
        this.target.lerpVectors(this.cameraAnim.fromTgt, this.cameraAnim.toTgt, ease);
        this.camera.lookAt(this.target);
        if (p >= 1) {
          this.cameraAnim = null;
          this.spherical.setFromVector3(this.camera.position.clone().sub(this.target));
        }
      }

      // Respiração / oscilação microscópica orgânica sutil
      if (this.autoRotate) {
        this.root.rotation.y += dtSec * 0.28;
      } else {
        this.root.rotation.y = Math.sin(now * 0.45) * 0.08;
        this.root.rotation.x = Math.cos(now * 0.35) * 0.04;
      }

      // 1. Escala da rede micelial periférica acompanha qualitativamente a Biomassa X(t)
      if (this.layers.morphology) {
        const bioScale = 0.82 + Math.min(0.28, (pt.X / 22.0) * 0.28);
        this.layerGroups.morphology.scale.setScalar(bioScale);
      }

      // 2. Animação do Material Genético (Nucleoide + Cluster pSCL4 responde ao fator genético)
      if (this.layers.genetics && this.clusterGroup) {
        this.clusterGroup.rotation.z += effDt * (0.45 + sim.genetic.acGeneFactor * 0.25);
        this.pscl4Mat1.emissiveIntensity = 0.55 + Math.min(0.9, sim.genetic.acGeneFactor * 0.25);
        this.pscl4Mat2.emissiveIntensity = 0.55 + Math.min(0.9, sim.config.genes.claR * 0.30);
      }

      // 3. Animação de entrada de precursores (Glicerol + L-Arginina -> Cluster AC)
      if (this.layers.metabolism) {
        const entrySpeed = 0.35 + pt.thetaG * 0.75;
        this.precursorParticles.forEach(p => {
          p.phase = (p.phase + effDt * p.speed * entrySpeed) % 1.0;
          p.mesh.position.copy(p.curve.getPoint(p.phase));
        });
      }

      // 4. Animação de Biossíntese Intracelular (Pi) e Liberação Extracelular (Pe) via φ(γ̇)
      if (this.layers.product) {
        // Quantidade de grânulos no pool intracelular Pi
        const activePi = Math.min(
          this.piParticles.length,
          Math.max(4, Math.round((pt.Pi / 220.0) * this.piParticles.length))
        );
        this.piParticles.forEach((p, idx) => {
          p.mesh.visible = idx < activePi;
          if (p.mesh.visible) {
            p.mesh.position.y = p.basePos.y + Math.sin(now * 2.4 + p.seed) * 0.035;
          }
        });

        // Taxa de liberação r_lib = k_di * (γ̇ / K_γ) * Pi governa a velocidade e densidade das partículas Pe!
        const releaseRate = sim.config.kdi * (pt.gammaDot / sim.config.Kgamma) * pt.Pi; // mg/(L·h)
        const releaseNorm = Math.min(1.0, Math.max(0.08, (releaseRate / 18.0) + pt.phi * 0.6));
        const activePe = Math.min(
          this.peReleaseParticles.length,
          Math.max(6, Math.round(releaseNorm * this.peReleaseParticles.length))
        );
        const speedMult = 0.25 + releaseNorm * 1.15;

        this.peReleaseParticles.forEach((p, idx) => {
          if (idx >= activePe || (pt.Pi < 1 && pt.Pe < 1)) {
            p.mesh.visible = false;
            return;
          }
          p.mesh.visible = true;
          p.phase = (p.phase + effDt * speedMult * (0.45 + (idx % 4) * 0.12)) % 1.0;
          p.mesh.position.lerpVectors(p.start, p.end, p.phase);
          p.mesh.position.y += Math.sin(p.phase * Math.PI) * 0.25;
          const sc = (1.0 - p.phase * 0.35) * (0.75 + 0.45 * releaseNorm);
          p.mesh.scale.setScalar(sc);
        });

        this.acLight.intensity = 1.6 + releaseNorm * 2.5;
      }

      this.renderer.render(this.scene, this.camera);
    }
  };

  BioSim.Cell3D = Cell3D;
})(window);
