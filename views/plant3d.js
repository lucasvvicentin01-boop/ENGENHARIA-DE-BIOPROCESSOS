/* ============================================================================
 * CLAVIS Digital Twin — Planta Industrial 3D por Camadas (Three.js)
 * Implementa as 8 Camadas 3D, 20 Equipamentos do PFD, 5 Áreas (100 a 500),
 * Correntes Padronizadas, Instrumentação ISA-5.1, TAGs com Anti-Sobreposição
 * e Modos de Câmera / Inspeção Interativa.
 * ============================================================================ */
(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});
  const THREE = global.THREE;
  if (!THREE) {
    BioSim.Plant3D = { available: false };
    return;
  }

  // Padrão de cores oficial das correntes (Seção 4 da Diretriz)
  const STREAM_COLORS = {
    aqueous: 0x2589f5,  // Azul: corrente aquosa
    organic: 0x22c55e,  // Verde: fase orgânica
    solvent: 0x06b6d4,  // Ciano: solvente recuperado / ar estéril
    product: 0xf59e0b,  // Amarelo/âmbar: produto
    waste:   0xf97316   // Laranja: resíduos e biomassa
  };

  // 20 Equipamentos reais do PFD-AC-001 Rev. 1 posicionados conforme o layout 3D de referência
  const equipment = [
    // ÁREA 100 — PREPARO DE MEIOS (Esquerda / Meio-Fundo)
    {
      id: 'V-101', name: 'Tanque de Meio Basal', area: '100', kind: 'tank',
      x: -12.6, z: -2.2, h: 4.1, r: 1.15, color: 0xd4dde2, platform: false, ladder: true,
      instruments: ['LIC-101', 'TIC-101'], priority: 2
    },
    {
      id: 'V-102', name: 'Tanque de Alimentação', area: '100', kind: 'tank',
      x: -9.6, z: -3.2, h: 3.9, r: 1.08, color: 0xd4dde2, platform: false, ladder: true,
      instruments: ['LIC-102'], priority: 2
    },
    {
      id: 'P-101', name: 'Bomba Dosadora de Meios', area: '100', kind: 'pump',
      x: -7.1, z: -2.4, h: 1.35, r: 0.78, color: 0x38bdf8, platform: false,
      instruments: ['FIC-101'], priority: 1
    },

    // ÁREA 200 — INÓCULO E AR (Fundo Central)
    {
      id: 'R-201', name: 'Biorreator Semente (Inóculo)', area: '200', kind: 'reactor',
      x: -5.2, z: -5.4, h: 4.3, r: 1.08, color: 0xd4dde2, platform: false, ladder: true,
      instruments: ['TIC-201', 'PIC-201'], priority: 2
    },
    {
      id: 'K-201', name: 'Compressor de Ar Estéril', area: '200', kind: 'compressor',
      x: -2.1, z: -6.8, h: 2.3, r: 0.95, color: 0x94a3b8, platform: true,
      instruments: ['PIC-202'], priority: 1
    },
    {
      id: 'E-201', name: 'Pós-Resfriador de Ar', area: '200', kind: 'exchanger_elev',
      x: -1.6, z: -5.1, h: 2.5, r: 0.95, color: 0xcbd5e1, platform: true,
      instruments: ['TI-202'], priority: 2
    },
    {
      id: 'F-201', name: 'Filtro de Ar Estéril 0,2 µm', area: '200', kind: 'filter_air',
      x: 1.1, z: -5.8, h: 3.5, r: 0.86, color: 0xd4dde2, platform: false, ladder: true,
      instruments: ['PDI-201'], priority: 2
    },

    // ÁREA 300 — FERMENTAÇÃO (Centro-Direita — Destaque Principal)
    {
      id: 'R-301', name: 'Fermentador STR · 60 m³', area: '300', kind: 'bioreactor_main',
      x: 3.6, z: -1.6, h: 6.4, r: 1.75, color: 0x0d9e94, main: true, platform: true, ladder: true,
      instruments: ['TIC-301', 'AIC-301', 'OIC-301', 'SIC-301'], priority: 3
    },

    // ÁREA 400 — COLHEITA (Fundo Direita)
    {
      id: 'T-401', name: 'Tanque Pulmão Refrigerado', area: '400', kind: 'tank',
      x: 9.2, z: -4.4, h: 4.3, r: 1.22, color: 0xd4dde2, platform: false, ladder: true,
      instruments: ['TI-401', 'LI-401'], priority: 2
    },
    {
      id: 'C-401', name: 'Centrífuga de Discos', area: '400', kind: 'centrifuge',
      x: 12.6, z: -2.5, h: 2.7, r: 1.05, color: 0xcbd5e1, platform: true,
      instruments: ['SI-401', 'FI-401'], priority: 2
    },

    // ÁREA 500 — EXTRAÇÃO E PURIFICAÇÃO (Fileira Frontal da Esquerda para a Direita)
    {
      id: 'T-501', name: 'Tanque de Acidificação', area: '500', kind: 'tank',
      x: -11.8, z: 4.8, h: 3.8, r: 1.12, color: 0xd4dde2, platform: true, ladder: true,
      instruments: ['pHIC-501', 'TI-501'], priority: 2
    },
    {
      id: 'EX-401', name: 'Extrator Líquido-Líquido', area: '500', kind: 'reactor_frame',
      x: -8.6, z: 4.6, h: 3.5, r: 0.96, color: 0xd4dde2, platform: true, ladder: true,
      instruments: ['FIC-501'], priority: 2
    },
    {
      id: 'D-501', name: 'Decantador de Fases', area: '500', kind: 'reactor_frame',
      x: -5.4, z: 4.4, h: 3.6, r: 1.04, color: 0xd4dde2, platform: true, ladder: true,
      instruments: ['LIC-501'], priority: 2
    },
    {
      id: 'EV-501', name: 'Evaporador a Vácuo', area: '500', kind: 'twin_columns',
      x: -2.4, z: 4.2, h: 6.2, r: 0.92, color: 0xd4dde2, platform: true, ladder: true,
      instruments: ['PIC-501', 'TIC-501'], priority: 3
    },
    {
      id: 'E-501', name: 'Condensador de Solvente', area: '500', kind: 'tank',
      x: 0.5, z: 4.2, h: 3.7, r: 1.05, color: 0xd4dde2, platform: false, ladder: true,
      instruments: ['TI-502', 'FI-502'], priority: 2
    },
    {
      id: 'T-502', name: 'Conversão Sal de Potássio', area: '500', kind: 'tank',
      x: 2.8, z: 2.6, h: 3.4, r: 0.88, color: 0x0ea5e9, platform: false,
      instruments: ['FIC-502'], priority: 1
    },
    {
      id: 'CR-501', name: 'Cristalizador Encamisado', area: '500', kind: 'reactor_teal',
      x: 3.8, z: 4.5, h: 3.6, r: 0.96, color: 0x0d9e94, platform: false, ladder: true,
      instruments: ['TIC-502'], priority: 2
    },
    {
      id: 'F-501', name: 'Filtro Nutsche Fechado', area: '500', kind: 'reactor_teal',
      x: 6.6, z: 4.4, h: 3.4, r: 0.94, color: 0x14b8a6, platform: false,
      instruments: ['PIC-502'], priority: 2
    },
    {
      id: 'TK-501', name: 'Silo Pulmão de Cristais', area: '500', kind: 'tank',
      x: 9.5, z: 4.1, h: 4.2, r: 1.05, color: 0xd4dde2, platform: true, ladder: true,
      instruments: ['LI-502'], priority: 2
    },
    {
      id: 'DR-501', name: 'Secador a Vácuo Horizontal', area: '500', kind: 'dryer_horiz',
      x: 12.9, z: 3.6, h: 2.9, r: 1.25, color: 0xd4dde2, platform: true,
      instruments: ['TIC-503', 'WI-501'], priority: 3
    }
  ];

  // Correntes de Processo do PFD-AC-001 (com classificação de fluido e cor padronizada)
  const processStreams = [
    { id: 'S-01',  from: 'V-101',  to: 'P-101',       category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Meio de fermentação basal' },
    { id: 'S-02',  from: 'V-102',  to: 'P-101',       category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Meio de alimentação (glicerol)' },
    { id: 'S-03a', from: 'P-101',  to: 'R-201',       category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Meio basal para inóculo' },
    { id: 'S-03',  from: 'P-101',  to: 'R-301',       category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Alimentação fed-batch para R-301' },
    { id: 'S-04',  from: 'R-201',  to: 'R-301',       category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Inóculo S. clavuligerus (4% v/v)' },
    { id: 'S-05a', from: 'K-201',  to: 'E-201',       category: 'solvent', color: STREAM_COLORS.solvent, label: 'Ar comprimido' },
    { id: 'S-05b', from: 'E-201',  to: 'F-201',       category: 'solvent', color: STREAM_COLORS.solvent, label: 'Ar comprimido resfriado' },
    { id: 'S-05',  from: 'F-201',  to: 'R-301',       category: 'solvent', color: STREAM_COLORS.solvent, label: 'Ar estéril (0,50 vvm)' },
    { id: 'S-06',  from: 'R-301',  to: 'T-401',       category: 'organic', color: STREAM_COLORS.organic, label: 'Caldo fermentado bruto' },
    { id: 'S-07',  from: 'T-401',  to: 'C-401',       category: 'organic', color: STREAM_COLORS.organic, label: 'Caldo resfriado (10 °C)' },
    { id: 'S-08',  from: 'C-401',  to: 'BIOMASS-OUT', category: 'waste',   color: STREAM_COLORS.waste,   label: 'Biomassa separada (resíduo)' },
    { id: 'S-09',  from: 'C-401',  to: 'T-501',       category: 'organic', color: STREAM_COLORS.organic, label: 'Caldo clarificado' },
    { id: 'S-10',  from: 'T-501',  to: 'EX-401',      category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Caldo acidificado (pH 2,0)' },
    { id: 'S-11',  from: 'EX-401', to: 'D-501',       category: 'organic', color: STREAM_COLORS.organic, label: 'Mistura com acetato de etila' },
    { id: 'S-12',  from: 'D-501',  to: 'EV-501',      category: 'organic', color: STREAM_COLORS.organic, label: 'Fase orgânica rica em AC' },
    { id: 'S-13',  from: 'D-501',  to: 'RAFF-OUT',    category: 'aqueous', color: STREAM_COLORS.aqueous, label: 'Fase aquosa / rafinado' },
    { id: 'S-14a', from: 'EV-501', to: 'E-501',       category: 'solvent', color: STREAM_COLORS.solvent, label: 'Vapor de acetato de etila' },
    { id: 'S-14',  from: 'E-501',  to: 'EX-401',      category: 'solvent', color: STREAM_COLORS.solvent, label: 'Acetato de etila recuperado (reciclo)', recycle: true },
    { id: 'S-15',  from: 'EV-501', to: 'T-502',       category: 'product', color: STREAM_COLORS.product, label: 'Extrato orgânico concentrado em AC' },
    { id: 'S-16',  from: 'T-502',  to: 'CR-501',      category: 'product', color: STREAM_COLORS.product, label: 'Conversão + agente de potássio' },
    { id: 'S-17',  from: 'CR-501', to: 'F-501',       category: 'product', color: STREAM_COLORS.product, label: 'Suspensão de cristais de Clavulanato K⁺' },
    { id: 'S-18a', from: 'F-501',  to: 'MOTHER-OUT',  category: 'waste',   color: STREAM_COLORS.waste,   label: 'Licor-mãe (resíduo)' },
    { id: 'S-18',  from: 'F-501',  to: 'TK-501',      category: 'product', color: STREAM_COLORS.product, label: 'Cristais lavados úmidos' },
    { id: 'S-19',  from: 'TK-501', to: 'DR-501',      category: 'product', color: STREAM_COLORS.product, label: 'Cristais dosados para secagem' },
    { id: 'S-20',  from: 'DR-501', to: 'PRODUCT-OUT', category: 'product', color: STREAM_COLORS.product, label: 'Clavulanato de potássio seco (IFA)' }
  ];

  // 5 Áreas Industriais (Camada 07)
  const areaDefs = [
    {
      id: '100', name: 'Preparo de Meios',
      x: -10.2, z: -2.7, w: 8.2, d: 4.8, labelPos: [-10.8, 5.1, -2.5],
      color: 0x2589f5, focus: [-10.0, -2.6], radius: 14.5,
      desc: 'Preparo, esterilização e dosagem do meio basal e solução concentrada de glicerol para alimentação fed-batch.'
    },
    {
      id: '200', name: 'Inóculo e Ar Estéril',
      x: -2.0, z: -5.8, w: 9.2, d: 4.4, labelPos: [-1.8, 5.5, -5.8],
      color: 0x06b6d4, focus: [-2.0, -5.6], radius: 15.0,
      desc: 'Propagação do inóculo micelial de S. clavuligerus (R-201) e geração/filtração absoluta de ar estéril (K-201 → E-201 → F-201).'
    },
    {
      id: '300', name: 'Fermentação Principal',
      x: 3.6, z: -1.6, w: 6.4, d: 5.4, labelPos: [3.6, 8.2, -1.6],
      color: 0x14f1d9, focus: [3.6, -1.6], radius: 14.0,
      desc: 'Biorreator STR de 60 m³ geométricos (41,92 m³ úteis) com 3 impelidores Rushton e controle acoplado de OD, pH e temperatura.'
    },
    {
      id: '400', name: 'Colheita e Clarificação',
      x: 10.9, z: -3.5, w: 7.2, d: 4.8, labelPos: [10.8, 5.3, -3.8],
      color: 0x38bdf8, focus: [10.8, -3.4], radius: 14.5,
      desc: 'Resfriamento rápido a 10 °C no tanque pulmão T-401 e separação contínua da biomassa micelial na centrífuga de discos C-401.'
    },
    {
      id: '500', name: 'Extração e Purificação (Downstream)',
      x: 0.6, z: 4.2, w: 28.5, d: 5.2, labelPos: [-2.4, 7.5, 4.2],
      color: 0xf59e0b, focus: [0.5, 4.2], radius: 24.0,
      desc: 'Acidificação (pH 2,0), extração L-L com acetato de etila, evaporação a vácuo com reciclo de solvente, cristalização como sal de potássio e secagem final.'
    }
  ];

  // Cena, Câmera e Renderizador Three.js
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1622);
  scene.fog = new THREE.FogExp2(0x0b1622, 0.0085);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 220);
  camera.position.set(27, 25, 31);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Iluminação industrial dramática de alto contraste (valoriza o aço inox e detalhes amarelos/teal)
  const hemiLight = new THREE.HemisphereLight(0xdff4ff, 0x1e293b, 1.55);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
  sunLight.position.set(-18, 34, 24);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -26;
  sunLight.shadow.camera.right = 26;
  sunLight.shadow.camera.top = 22;
  sunLight.shadow.camera.bottom = -22;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
  rimLight.position.set(24, 18, -20);
  scene.add(rimLight);

  const warmFill = new THREE.DirectionalLight(0xfbbf24, 0.55);
  warmFill.position.set(12, 10, 22);
  scene.add(warmFill);

  // Grupos de Camadas 3D (vinculados à mesma cena principal!)
  const root = new THREE.Group();
  scene.add(root);

  const infrastructureGroup = new THREE.Group();
  const equipmentGroup      = new THREE.Group(); // CAMADA 01
  const pipeGroup           = new THREE.Group(); // CAMADA 02
  const streamGroup         = new THREE.Group(); // CAMADA 03
  const tagGroup            = new THREE.Group(); // CAMADA 04 (âncoras 3D + hastes)
  const instrumentationGroup= new THREE.Group(); // CAMADA 05
  const statusGroup         = new THREE.Group(); // CAMADA 06
  const areaGroup           = new THREE.Group(); // CAMADA 07
  const flowGroup           = new THREE.Group(); // CAMADA 08
  const highlightGroup      = new THREE.Group();

  [
    infrastructureGroup,
    areaGroup,
    equipmentGroup,
    pipeGroup,
    streamGroup,
    flowGroup,
    instrumentationGroup,
    statusGroup,
    tagGroup,
    highlightGroup
  ].forEach(g => root.add(g));

  const layers = {
    equipment: equipmentGroup,
    pipes: pipeGroup,
    streams: streamGroup,
    tags: tagGroup,
    instrumentation: instrumentationGroup,
    status: statusGroup,
    areas: areaGroup,
    flow: flowGroup
  };

  const layerEnabled = {
    equipment: true,
    pipes: true,
    streams: true,
    tags: true,
    instrumentation: true,
    status: true,
    areas: true,
    flow: true
  };

  // Materiais reutilizáveis
  const mat = (color, metalness = 0.65, roughness = 0.28, extra = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, metalness, roughness }, extra));

  const matStainless   = mat(0xd8e2e8, 0.88, 0.18);
  const matStainlessDk = mat(0x94a3b8, 0.80, 0.26);
  const matSteelGalv   = mat(0x64748b, 0.72, 0.34);
  const matDarkMotor   = mat(0x1e293b, 0.55, 0.40);
  const matTealGlass   = mat(0x0d9e94, 0.62, 0.18);
  const matSafetyYellow= mat(0xeab308, 0.45, 0.32);
  const matConcrete    = mat(0x6b7785, 0.12, 0.85);
  const matAsphalt     = mat(0x262e38, 0.08, 0.90);
  const matBuilding    = mat(0xcbd5e1, 0.20, 0.65);

  function addBox(parent, x, y, z, w, h, d, material, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function addCyl(parent, x, y, z, rTop, rBot, h, material, seg = 28) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function addTube(parent, points, colorHex, radius, metalness = 0.62, roughness = 0.26, emissiveIntensity = 0.12) {
    const vectors = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.12);
    const geom = new THREE.TubeGeometry(curve, Math.max(24, points.length * 10), radius, 10, false);
    const m = new THREE.Mesh(
      geom,
      mat(colorHex, metalness, roughness, {
        emissive: colorHex,
        emissiveIntensity
      })
    );
    m.castShadow = true;
    parent.add(m);
    return { curve, mesh: m };
  }

  // ==========================================================================
  // CONSTRUÇÃO DO PÁTIO INDUSTRIAL, PRÉDIOS, VIAS E PIPE-RACKS (INFRAESTRUTURA)
  // ==========================================================================
  function buildIndustrialCompound() {
    // Base geral de asfalto e vias perimetrais
    addBox(infrastructureGroup, 0, -0.52, 0, 44, 0.6, 28, matAsphalt, false);

    // Pátio principal de concreto elevado onde ficam as Áreas 100 a 500
    addBox(infrastructureGroup, 0, -0.18, -0.4, 33.6, 0.32, 18.8, matConcrete, false);

    // Linhas de demarcação viária amarelas no asfalto e bordas de segurança do pátio
    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    addBox(infrastructureGroup, 0, 0.0, 9.1, 33.8, 0.02, 0.14, roadLineMat, false);
    addBox(infrastructureGroup, 16.9, 0.0, -0.4, 0.14, 0.02, 18.9, roadLineMat, false);
    addBox(infrastructureGroup, -16.9, 0.0, -0.4, 0.14, 0.02, 18.9, roadLineMat, false);

    // Faixas tracejadas na via frontal e lateral
    for (let x = -18; x <= 18; x += 2.6) {
      addBox(infrastructureGroup, x, -0.21, 11.4, 1.3, 0.02, 0.12, roadLineMat, false);
    }
    for (let z = -10; z <= 10; z += 2.6) {
      addBox(infrastructureGroup, 19.4, -0.21, z, 0.12, 0.02, 1.3, roadLineMat, false);
    }

    // Juntas de dilatação do piso de concreto industrial
    const jointMat = mat(0x525e6b, 0.1, 0.9);
    for (let x = -15; x <= 15; x += 3.0) {
      addBox(infrastructureGroup, x, -0.015, -0.4, 0.04, 0.01, 18.6, jointMat, false);
    }
    for (let z = -9; z <= 8; z += 3.0) {
      addBox(infrastructureGroup, 0, -0.014, z, 33.4, 0.01, 0.04, jointMat, false);
    }

    // Prédios industriais de utilidades e controle no fundo-esquerdo (como na imagem)
    // Prédio 1 (Esquerda-Fundo)
    addBox(infrastructureGroup, -12.2, 2.3, -8.2, 8.2, 4.6, 4.2, matBuilding);
    addBox(infrastructureGroup, -12.2, 4.68, -8.2, 8.4, 0.18, 4.4, matSteelGalv);
    // Prédio 2 (Centro-Fundo)
    addBox(infrastructureGroup, -3.2, 2.6, -9.2, 8.8, 5.2, 3.6, matBuilding);
    addBox(infrastructureGroup, -3.2, 5.28, -9.2, 9.0, 0.18, 3.8, matSteelGalv);

    // Janelas envidraçadas nos prédios
    const windowMat = mat(0x38bdf8, 0.85, 0.15, { emissive: 0x0c4a6e, emissiveIntensity: 0.35 });
    for (let x = -15.2; x <= -9.2; x += 1.5) {
      addBox(infrastructureGroup, x, 3.1, -6.08, 0.95, 0.72, 0.05, windowMat, false);
      addBox(infrastructureGroup, x, 1.6, -6.08, 0.95, 0.72, 0.05, windowMat, false);
    }
    for (let x = -6.6; x <= 0.2; x += 1.7) {
      addBox(infrastructureGroup, x, 3.5, -7.38, 1.1, 0.75, 0.05, windowMat, false);
    }

    // Chillers e unidades HVAC no teto dos prédios
    const hvacMat = mat(0x94a3b8, 0.55, 0.38);
    addBox(infrastructureGroup, -13.8, 5.15, -8.2, 1.5, 0.8, 1.2, hvacMat);
    addBox(infrastructureGroup, -10.8, 5.15, -8.2, 1.5, 0.8, 1.2, hvacMat);
    addBox(infrastructureGroup, -4.6, 5.75, -9.2, 1.8, 0.85, 1.4, hvacMat);
    addBox(infrastructureGroup, -1.6, 5.75, -9.2, 1.8, 0.85, 1.4, hvacMat);

    // Paisagismo perimetral (árvores e canteiros verdes nas bordas da planta, como na referência)
    const grassMat = mat(0x1e3f24, 0.05, 0.92);
    const foliageMat1 = mat(0x2d6a31, 0.08, 0.85);
    const foliageMat2 = mat(0x3b823e, 0.08, 0.82);
    const trunkMat = mat(0x4a3525, 0.1, 0.9);

    addBox(infrastructureGroup, 0, -0.19, 13.3, 42, 0.12, 1.6, grassMat, false);
    addBox(infrastructureGroup, -19.5, -0.19, 0, 2.2, 0.12, 26, grassMat, false);
    addBox(infrastructureGroup, 10.5, -0.19, -10.8, 16, 0.12, 2.2, grassMat, false);

    const treeCoords = [
      [-19.2, 8.5], [-19.2, 4.5], [-19.2, 0.2], [-19.2, -4.2],
      [-14.5, 13.2], [-9.2, 13.2], [-3.8, 13.2], [2.4, 13.2], [8.2, 13.2], [14.0, 13.2],
      [5.0, -10.6], [8.5, -10.6], [12.0, -10.6], [15.5, -10.6]
    ];
    treeCoords.forEach(([tx, tz], idx) => {
      const s = 0.85 + (idx % 3) * 0.18;
      addCyl(infrastructureGroup, tx, 0.45 * s, tz, 0.12 * s, 0.16 * s, 0.9 * s, trunkMat, 8);
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * s, 1), idx % 2 === 0 ? foliageMat1 : foliageMat2);
      crown1.position.set(tx, 1.35 * s, tz);
      crown1.castShadow = true;
      infrastructureGroup.add(crown1);
      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62 * s, 1), foliageMat2);
      crown2.position.set(tx + 0.22, 1.85 * s, tz - 0.15);
      crown2.castShadow = true;
      infrastructureGroup.add(crown2);
    });
  }

  // ==========================================================================
  // CAMADA 02 — PÓRTICOS E ESTRUTURAS DE TUBULAÇÃO (PIPE RACKS)
  // ==========================================================================
  function buildPipeRacks() {
    // Corredor traseiro (conecta Área 100, 200, 300, 400) e corredor frontal (Área 500)
    const rackX = [-13.5, -8.5, -3.5, 1.5, 6.5, 11.5];
    const rackZ = [-4.0, 1.4];

    rackZ.forEach(z => {
      rackX.forEach(x => {
        addBox(pipeGroup, x, 2.3, z - 0.55, 0.14, 4.6, 0.14, matSteelGalv);
        addBox(pipeGroup, x, 2.3, z + 0.55, 0.14, 4.6, 0.14, matSteelGalv);
        addBox(pipeGroup, x, 3.4, z, 0.14, 0.14, 1.25, matSteelGalv);
        addBox(pipeGroup, x, 4.4, z, 0.14, 0.14, 1.25, matSteelGalv);
      });
      // Longarinas horizontais do pipe-rack
      addBox(pipeGroup, -1.0, 3.4, z - 0.55, 25.2, 0.12, 0.12, matSteelGalv);
      addBox(pipeGroup, -1.0, 3.4, z + 0.55, 25.2, 0.12, 0.12, matSteelGalv);
      addBox(pipeGroup, -1.0, 4.4, z - 0.55, 25.2, 0.12, 0.12, matSteelGalv);
      addBox(pipeGroup, -1.0, 4.4, z + 0.55, 25.2, 0.12, 0.12, matSteelGalv);
    });

    // Travessas transversais ligando o pipe-rack traseiro ao frontal
    [-8.5, 1.5, 11.5].forEach(x => {
      addBox(pipeGroup, x, 3.9, -1.3, 0.12, 0.12, 5.5, matSteelGalv);
    });
  }

  // ==========================================================================
  // CAMADA 07 — ÁREAS INDUSTRIAIS (100 A 500)
  // ==========================================================================
  const areaPads = new Map();
  function buildIndustrialAreas() {
    areaDefs.forEach(a => {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(a.w, 0.04, a.d),
        new THREE.MeshBasicMaterial({
          color: a.color,
          transparent: true,
          opacity: 0.13,
          depthWrite: false
        })
      );
      pad.position.set(a.x, 0.02, a.z);
      pad.userData.areaId = a.id;
      areaGroup.add(pad);
      areaPads.set(a.id, pad);

      // Borda luminosa da área no piso
      const hw = a.w / 2;
      const hd = a.d / 2;
      const pts = [
        new THREE.Vector3(a.x - hw, 0.05, a.z - hd),
        new THREE.Vector3(a.x + hw, 0.05, a.z - hd),
        new THREE.Vector3(a.x + hw, 0.05, a.z + hd),
        new THREE.Vector3(a.x - hw, 0.05, a.z + hd),
        new THREE.Vector3(a.x - hw, 0.05, a.z - hd)
      ];
      const border = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: a.color, transparent: true, opacity: 0.85 })
      );
      border.userData.areaId = a.id;
      areaGroup.add(border);
    });
  }

  // ==========================================================================
  // CAMADA 01 — EQUIPAMENTOS 3D COM DETALHES CONSTRUTIVOS E PLATAFORMAS AMARELAS
  // ==========================================================================
  const objects = new Map();
  const statusRecords = [];
  const instrumentRecords = [];
  const tagRecords = [];

  function buildYellowPlatform(parent, w, h, d, levels = 1) {
    const plat = new THREE.Group();
    const hw = w / 2;
    const hd = d / 2;

    // 4 colunas amarelas
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(plat, sx * hw, h / 2, sz * hd, 0.11, h, 0.11, matSafetyYellow);
      }
    }

    for (let lv = 1; lv <= levels; lv++) {
      const py = (h / levels) * lv;
      // Piso gradeado metálico com vigas amarelas
      addBox(plat, 0, py, 0, w + 0.14, 0.10, d + 0.14, matSteelGalv);
      addBox(plat, 0, py + 0.02, hd, w + 0.18, 0.12, 0.08, matSafetyYellow);
      addBox(plat, 0, py + 0.02, -hd, w + 0.18, 0.12, 0.08, matSafetyYellow);
      addBox(plat, hw, py + 0.02, 0, 0.08, 0.12, d + 0.18, matSafetyYellow);
      addBox(plat, -hw, py + 0.02, 0, 0.08, 0.12, d + 0.18, matSafetyYellow);

      // Guarda-corpo de segurança amarelo
      const railH = 0.65;
      addBox(plat, 0, py + railH, hd, w + 0.16, 0.05, 0.05, matSafetyYellow);
      addBox(plat, 0, py + railH, -hd, w + 0.16, 0.05, 0.05, matSafetyYellow);
      addBox(plat, hw, py + railH, 0, 0.05, 0.05, d + 0.16, matSafetyYellow);
      addBox(plat, -hw, py + railH, 0, 0.05, 0.05, d + 0.16, matSafetyYellow);
    }

    parent.add(plat);
  }

  function buildYellowLadder(parent, x, h, z) {
    const lad = new THREE.Group();
    lad.position.set(x, 0, z);
    addBox(lad, 0, h / 2, -0.16, 0.04, h, 0.04, matSafetyYellow);
    addBox(lad, 0, h / 2, 0.16, 0.04, h, 0.04, matSafetyYellow);
    for (let y = 0.35; y < h; y += 0.32) {
      addBox(lad, 0, y, 0, 0.03, 0.03, 0.32, matSafetyYellow);
    }
    parent.add(lad);
  }

  function buildVerticalVessel(g, e, bodyMat) {
    const r = e.r;
    const h = e.h;

    // 4 pés tubulares de inox
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2 + Math.PI / 4;
      addCyl(g, Math.cos(ang) * r * 0.72, h * 0.12, Math.sin(ang) * r * 0.72, 0.08, 0.10, h * 0.24, matSteelGalv, 10);
    }

    // Costado cilíndrico principal
    addCyl(g, 0, h * 0.50, 0, r * 0.92, r * 0.92, h * 0.64, bodyMat, 36);

    // Anéis e virolas de inox superior e inferior
    addCyl(g, 0, h * 0.82, 0, r * 0.94, r * 0.94, 0.12, matStainless, 36);
    addCyl(g, 0, h * 0.18, 0, r * 0.94, r * 0.92, 0.12, matStainless, 36);

    // Tampos torisféricos superior e inferior em aço inox polido
    const topDome = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.92, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      matStainless
    );
    topDome.position.y = h * 0.82;
    topDome.scale.y = 0.32;
    topDome.castShadow = true;
    g.add(topDome);

    const botDome = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.92, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      matStainlessDk
    );
    botDome.position.y = h * 0.18;
    botDome.scale.y = 0.25;
    g.add(botDome);

    // Visor longitudinal luminoso
    const glassStrip = mat(0x22d3ee, 0.25, 0.12, { emissive: 0x0891b2, emissiveIntensity: 0.35 });
    addBox(g, 0, h * 0.50, r * 0.93, 0.14, h * 0.42, 0.04, glassStrip);

    // Bocais e flanges superiores
    addCyl(g, r * 0.42, h * 0.95, 0, 0.11, 0.11, 0.26, matStainless, 14);
    addCyl(g, -r * 0.42, h * 0.95, 0, 0.11, 0.11, 0.26, matStainless, 14);
  }

  function makeEquipmentMesh(e) {
    const g = new THREE.Group();
    g.position.set(e.x, 0.16, e.z);
    equipmentGroup.add(g);

    // Base de concreto individual (plinto)
    addBox(equipmentGroup, e.x, 0.08, e.z, e.r * 2.5, 0.16, e.r * 2.5, mat(0x475569, 0.18, 0.78));

    if (e.kind === 'bioreactor_main') {
      // R-301 — Biorreator STR 60 m³ com camisa teal, tampos inox, motor + 3 Rushton e plataforma dupla amarela
      buildVerticalVessel(g, e, matTealGlass);

      // Faixas metálicas de reforço da camisa térmica
      for (const fy of [0.32, 0.50, 0.68]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(e.r * 0.94, 0.035, 10, 44), matStainless);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = e.h * fy;
        g.add(ring);
      }

      // Motor redutor principal no topo + eixo + 3 impelidores Rushton internos
      addCyl(g, 0, e.h * 0.98, 0, 0.36, 0.42, 0.42, matStainlessDk, 20);
      addCyl(g, 0, e.h * 1.07, 0, 0.28, 0.28, 0.65, matDarkMotor, 20);

      const rotorGroup = new THREE.Group();
      rotorGroup.position.y = e.h * 0.50;
      rotorGroup.userData.rotor = true;
      addCyl(rotorGroup, 0, 0, 0, 0.055, 0.055, e.h * 0.66, matStainless, 12);
      for (const iy of [-e.h * 0.18, 0, e.h * 0.18]) {
        for (let b = 0; b < 4; b++) {
          const blade = addBox(rotorGroup, 0, iy, 0, e.r * 0.85, 0.08, 0.05, matStainless);
          blade.rotation.y = (b * Math.PI) / 2;
        }
      }
      g.add(rotorGroup);

      // Plataforma industrial amarela de 2 níveis ao redor do R-301
      buildYellowPlatform(g, e.r * 2.45, e.h * 0.74, e.r * 2.45, 2);
      buildYellowLadder(g, e.r * 1.28, e.h * 0.78, 0.5);
    } else if (e.kind === 'twin_columns') {
      // EV-501 — Par de colunas altas de evaporação a vácuo em inox com plataforma e escada amarela
      const colR = e.r * 0.52;
      [-0.65, 0.65].forEach(dx => {
        addCyl(g, dx, e.h * 0.50, 0, colR, colR, e.h * 0.88, matStainless, 28);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(colR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matStainless);
        dome.position.set(dx, e.h * 0.94, 0);
        g.add(dome);
        for (const fy of [0.25, 0.45, 0.65, 0.85]) {
          addCyl(g, dx, e.h * fy, 0, colR * 1.06, colR * 1.06, 0.07, matSteelGalv, 24);
        }
      });
      // Ponte de vapor superior interligando as duas colunas
      addBox(g, 0, e.h * 0.92, 0, 1.35, 0.16, 0.16, matStainless);
      buildYellowPlatform(g, 2.5, e.h * 0.42, 2.0, 1);
      buildYellowLadder(g, 1.3, e.h * 0.85, 0);
    } else if (e.kind === 'dryer_horiz') {
      // DR-501 — Secador a vácuo cilíndrico horizontal sobre berços e plataforma amarela
      buildYellowPlatform(g, 3.4, 0.95, 2.2, 1);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.8, 32), matStainless);
      body.rotation.z = Math.PI / 2;
      body.position.y = 1.95;
      body.castShadow = true;
      g.add(body);
      [-1.4, 1.4].forEach(dx => {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 14), matStainless);
        cap.scale.x = 0.35;
        cap.position.set(dx, 1.95, 0);
        g.add(cap);
        addBox(g, dx * 0.7, 1.25, 0, 0.22, 0.65, 1.35, matSteelGalv);
      });
    } else if (e.kind === 'exchanger_elev') {
      // E-201 — Trocador casco-e-tubos horizontal sobre plataforma elevada amarela
      buildYellowPlatform(g, 2.5, 1.45, 2.1, 1);
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 2.1, 28), matStainless);
      shell.rotation.z = Math.PI / 2;
      shell.position.y = 2.1;
      shell.castShadow = true;
      g.add(shell);
      buildYellowLadder(g, 1.3, 1.9, 0);
    } else if (e.kind === 'centrifuge') {
      // C-401 — Centrífuga de discos cônica em skid amarelo
      buildYellowPlatform(g, 2.4, 0.85, 2.2, 1);
      addCyl(g, 0, 1.25, 0, 0.78, 0.68, 0.75, matStainless, 28);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.75, 28), matStainless);
      cone.position.y = 1.95;
      cone.castShadow = true;
      g.add(cone);
      addCyl(g, 0.65, 1.45, 0, 0.28, 0.28, 0.65, mat(0x2563eb, 0.55, 0.35), 18);
    } else if (e.kind === 'pump') {
      // P-101 — Skid de bomba sanitária
      addBox(g, 0, 0.16, 0, 1.65, 0.22, 1.15, matSteelGalv);
      addCyl(g, -0.35, 0.62, 0, 0.36, 0.36, 0.65, mat(0x0284c7, 0.58, 0.32), 20);
      addCyl(g, 0.32, 0.62, 0, 0.32, 0.38, 0.55, matStainless, 20);
    } else if (e.kind === 'compressor') {
      // K-201 — Skid compressor de ar estéril
      buildYellowPlatform(g, 2.2, 0.75, 1.9, 1);
      addBox(g, 0, 1.38, 0, 1.65, 1.15, 1.25, matStainlessDk);
      addCyl(g, 0.35, 2.1, 0, 0.28, 0.28, 0.45, matStainless, 18);
    } else if (e.kind === 'reactor_teal') {
      // CR-501 e F-501 — Vasos downstream com camisa teal e tampos inox
      buildVerticalVessel(g, e, matTealGlass);
      addCyl(g, 0, e.h * 0.98, 0, 0.22, 0.22, 0.45, matDarkMotor, 16);
      if (e.ladder) buildYellowLadder(g, e.r * 1.05, e.h * 0.78, 0);
    } else if (e.kind === 'reactor_frame') {
      // EX-401 e D-501 — Vasos em estrutura metálica amarela
      buildVerticalVessel(g, e, matStainless);
      buildYellowPlatform(g, e.r * 2.35, e.h * 0.52, e.r * 2.35, 1);
      if (e.ladder) buildYellowLadder(g, e.r * 1.22, e.h * 0.62, 0.35);
    } else {
      // Tanques e reatores de aço inox (V-101, V-102, R-201, F-201, T-401, T-501, E-501, T-502, TK-501)
      buildVerticalVessel(g, e, e.id === 'T-502' ? matTealGlass : matStainless);
      if (e.kind === 'reactor') {
        addCyl(g, 0, e.h * 0.98, 0, 0.24, 0.24, 0.48, matDarkMotor, 16);
      }
      if (e.platform) {
        buildYellowPlatform(g, e.r * 2.25, e.h * 0.45, e.r * 2.25, 1);
      }
      if (e.ladder) {
        buildYellowLadder(g, e.r * 1.08, e.h * 0.76, 0.25);
      }
    }

    // Metadados para raycasting e destaque por área/seleção
    g.userData.equipment = e;
    g.traverse(child => {
      child.userData.equipmentId = e.id;
      if (child.material) {
        child.material = child.material.clone();
        if (child.material.color) {
          child.userData.baseColor = child.material.color.clone();
        }
      }
    });

    objects.set(e.id, g);

    // CAMADA 04 — Haste vertical de ancoragem da TAG 3D no topo do equipamento
    const stemH = 1.05;
    const stemY = 0.16 + e.h + stemH / 2;
    const stem = addCyl(tagGroup, e.x, stemY, e.z, 0.022, 0.022, stemH, mat(0x22d3ee, 0.3, 0.2, { emissive: 0x22d3ee, emissiveIntensity: 0.6 }), 8);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    tip.position.set(e.x, 0.16 + e.h + 0.08, e.z);
    tagGroup.add(tip);
    tagRecords.push({ e, stem, tip, anchorY: 0.16 + e.h + stemH });

    // CAMADA 06 — Anel luminoso e beacon de Status Operacional
    const statusRing = new THREE.Mesh(
      new THREE.TorusGeometry(e.r * 1.34, 0.065, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9 })
    );
    statusRing.rotation.x = Math.PI / 2;
    statusRing.position.set(e.x, 0.18, e.z);
    statusGroup.add(statusRing);

    const statusBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    statusBeacon.position.set(e.x + e.r * 0.55, 0.16 + e.h + 0.25, e.z);
    statusGroup.add(statusBeacon);
    statusRecords.push({ e, ring: statusRing, beacon: statusBeacon });

    // CAMADA 05 — Sensores, transmissores e medidores 3D acoplados ao equipamento
    const sensorGrp = new THREE.Group();
    sensorGrp.position.set(e.x, 0.16, e.z);
    instrumentationGroup.add(sensorGrp);

    (e.instruments || []).forEach((instCode, idx) => {
      const ang = idx * 1.35 + 0.4;
      const sx = Math.cos(ang) * (e.r + 0.18);
      const sz = Math.sin(ang) * (e.r + 0.18);
      const sy = e.h * (0.45 + idx * 0.14);

      addCyl(sensorGrp, sx * 0.92, sy, sz * 0.92, 0.04, 0.04, 0.22, matStainless, 10);
      const transmitter = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 12),
        mat(0x38bdf8, 0.35, 0.2, { emissive: 0x0284c7, emissiveIntensity: 0.45 })
      );
      transmitter.position.set(sx, sy + 0.06, sz);
      sensorGrp.add(transmitter);

      instrumentRecords.push({
        e,
        code: instCode,
        worldPos: new THREE.Vector3(e.x + sx, 0.16 + sy + 0.32, e.z + sz),
        mesh: transmitter
      });
    });
  }

  // ==========================================================================
  // CAMADAS 02, 03 E 08 — TUBULAÇÕES, CORRENTES COLORIDAS E PARTÍCULAS DE FLUXO
  // ==========================================================================
  const virtualNodes = {
    'BIOMASS-OUT': { x: 15.2, z: -2.5, h: 1.4, r: 0.3 },
    'RAFF-OUT':    { x: -5.4, z: 7.4,  h: 1.2, r: 0.3 },
    'MOTHER-OUT':  { x: 6.6,  z: 7.4,  h: 1.2, r: 0.3 },
    'PRODUCT-OUT': { x: 15.4, z: 3.6,  h: 1.8, r: 0.3 }
  };

  function computePipeRoute(fromId, toId, idx) {
    const a = equipment.find(e => e.id === fromId);
    const b = equipment.find(e => e.id === toId) || virtualNodes[toId];
    if (!a || !b) return null;

    const elev = 2.85 + (idx % 5) * 0.24;
    const startY = Math.min(a.h * 0.72, elev - 0.3);
    const endY   = Math.min((b.h || 2.0) * 0.72, elev - 0.3);

    // Se for reciclo de solvente (E-501 -> EX-401), passa pelo barramento elevado superior
    if (fromId === 'E-501' && toId === 'EX-401') {
      return [
        [a.x, a.h * 0.82, a.z],
        [a.x, 4.75, a.z - 1.4],
        [(a.x + b.x) / 2, 4.75, a.z - 1.4],
        [b.x, 4.75, b.z - 1.4],
        [b.x, b.h * 0.82, b.z]
      ];
    }

    const midZ = Math.abs(a.z - b.z) > 3.5 ? (a.z + b.z) * 0.5 : a.z;
    return [
      [a.x, startY, a.z],
      [a.x, elev, a.z],
      [a.x, elev, midZ],
      [b.x, elev, midZ],
      [b.x, elev, b.z],
      [b.x, endY, b.z]
    ];
  }

  const streamRecords = [];
  const movingParticles = [];

  function buildPipingAndStreams() {
    processStreams.forEach((s, i) => {
      const pts = computePipeRoute(s.from, s.to, i);
      if (!pts) return;

      // CAMADA 02 — Tubulação metálica estrutural + válvulas e flanges
      const pipeObj = addTube(pipeGroup, pts, 0x64748b, 0.088, 0.75, 0.30, 0.02);
      const midPt = pipeObj.curve.getPoint(0.5);
      const valveBody = addCyl(pipeGroup, midPt.x, midPt.y, midPt.z, 0.14, 0.14, 0.18, matSafetyYellow, 12);
      valveBody.rotation.z = Math.PI / 2;

      // Válvula de controle instrumentada (Camada 05) nas linhas principais
      if (['S-03', 'S-05', 'S-06', 'S-10', 'S-12', 'S-14'].includes(s.id)) {
        const actPos = pipeObj.curve.getPoint(0.35);
        addCyl(instrumentationGroup, actPos.x, actPos.y + 0.18, actPos.z, 0.04, 0.04, 0.22, matStainless, 8);
        addCyl(instrumentationGroup, actPos.x, actPos.y + 0.31, actPos.z, 0.16, 0.16, 0.08, mat(0x06b6d4, 0.4, 0.25), 16);
      }

      // CAMADA 03 — Corrente de Processo colorida com cones direcionais
      const streamObj = addTube(streamGroup, pts, s.color, 0.064, 0.35, 0.22, 0.32);

      // Cones direcionais fixos ao longo da corrente (indicam sentido do fluxo mesmo com simulação pausada)
      const dirCones = [];
      for (const frac of [0.28, 0.68]) {
        const p = streamObj.curve.getPoint(frac);
        const tangent = streamObj.curve.getTangent(frac);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.28, 12),
          new THREE.MeshStandardMaterial({
            color: s.color,
            emissive: s.color,
            emissiveIntensity: 0.45,
            metalness: 0.2,
            roughness: 0.2
          })
        );
        cone.position.copy(p);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent.clone().normalize());
        streamGroup.add(cone);
        dirCones.push(cone);
      }

      streamRecords.push({
        stream: s,
        pipeMesh: pipeObj.mesh,
        streamMesh: streamObj.mesh,
        dirCones,
        curve: streamObj.curve
      });

      // CAMADA 08 — Partículas animadas de Fluxo de Processo (2 marcadores por corrente)
      for (let k = 0; k < 2; k++) {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.125, 12, 12),
          new THREE.MeshBasicMaterial({ color: s.color })
        );
        const phase = (i * 0.11 + k * 0.5) % 1.0;
        marker.position.copy(streamObj.curve.getPoint(phase));
        flowGroup.add(marker);
        movingParticles.push({
          mesh: marker,
          curve: streamObj.curve,
          phase,
          speed: s.recycle ? 0.16 : 0.21,
          stream: s
        });
      }
    });
  }

  // Inicializa toda a geometria 3D
  buildIndustrialCompound();
  buildIndustrialAreas();
  buildPipeRacks();
  equipment.forEach(makeEquipmentMesh);
  buildPipingAndStreams();

  // Halo de destaque para equipamento selecionado
  const selectedRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.08, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.96 })
  );
  selectedRing.rotation.x = Math.PI / 2;
  selectedRing.position.y = 0.20;
  highlightGroup.add(selectedRing);

  // ==========================================================================
  // RÓTULOS 3D PROJETADOS (TAGs DE EQUIPAMENTOS, ÁREAS E INSTRUMENTAÇÃO)
  // Com posicionamento inteligente, agrupamento e ocultação conforme zoom!
  // ==========================================================================
  const container = document.getElementById('plant-canvas-wrap') || document.querySelector('.plant-canvas-wrap');
  const labelsOverlay = document.getElementById('plant-3d-labels');
  container.appendChild(renderer.domElement);

  const tooltip = document.createElement('div');
  tooltip.className = 'plant-3d-tooltip';
  tooltip.hidden = true;
  container.appendChild(tooltip);

  const baseCanvas = container.querySelector('#plant-canvas');
  if (baseCanvas) baseCanvas.style.display = 'none';

  // Criar elementos DOM projetados para Áreas, Equipamentos e Instrumentos
  const areaDomBadges = [];
  const eqDomTags = [];
  const instDomBadges = [];

  if (labelsOverlay) {
    labelsOverlay.innerHTML = '';

    // Badges de Áreas 100 a 500 (Camada 07)
    areaDefs.forEach(a => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'p3d-area-badge';
      el.dataset.areaId = a.id;
      el.innerHTML = `<strong>ÁREA ${a.id}</strong><small>${a.name}</small>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        focusArea(a.id);
        if (BioSim.PlantView && BioSim.PlantView.onAreaSelectedFrom3D) {
          BioSim.PlantView.onAreaSelectedFrom3D(a.id);
        }
      });
      labelsOverlay.appendChild(el);
      areaDomBadges.push({ area: a, el, pos: new THREE.Vector3(...a.labelPos) });
    });

    // TAGs dos 20 Equipamentos (Camada 04)
    equipment.forEach(e => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'p3d-eq-tag' + (e.main ? ' is-main' : '');
      el.dataset.eqId = e.id;
      el.innerHTML = `<span class="tag-code">${e.id}</span><span class="tag-sub">${e.name}</span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        select(e.id);
      });
      labelsOverlay.appendChild(el);
      eqDomTags.push({
        e,
        el,
        worldPos: new THREE.Vector3(e.x, 0.16 + e.h + 1.15, e.z)
      });
    });

    // Bolhas de Instrumentação ISA-5.1 (Camada 05 + Camada 04)
    instrumentRecords.forEach(rec => {
      const el = document.createElement('span');
      el.className = 'p3d-inst-tag';
      el.textContent = rec.code;
      labelsOverlay.appendChild(el);
      instDomBadges.push({ rec, el });
    });
  }

  // Estado de câmera, seleção e filtros
  let selectedId = 'R-301';
  let selectedArea = null;
  let activeStreamFilter = null;
  let hoveredId = null;
  let simState = null;
  let currentPoint = null;

  let target = new THREE.Vector3(0.5, 1.4, 0.2);
  camera.lookAt(target);
  let spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
  let cameraMove = null;
  let drag = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function resize() {
    if (!container) return;
    const w = Math.max(320, container.clientWidth);
    const h = Math.max(280, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateProjectedLabels();
  }

  function syncSpherical() {
    spherical.setFromVector3(camera.position.clone().sub(target));
  }

  function animateCamera(destination, destTarget, duration = 0.72) {
    cameraMove = {
      from: camera.position.clone(),
      to: destination.clone(),
      targetFrom: target.clone(),
      targetTo: destTarget.clone(),
      elapsed: 0,
      duration
    };
  }

  // 6. CÂMERA E MODOS DE VISUALIZAÇÃO
  function cameraMode(mode) {
    let pos, tgt;
    if (mode === 'top') {
      tgt = new THREE.Vector3(0, 0.5, 0);
      pos = new THREE.Vector3(0, 48, 0.01);
    } else if (mode === 'front') {
      tgt = new THREE.Vector3(0, 1.6, 0);
      pos = new THREE.Vector3(0, 14, 42);
    } else if (mode === 'side') {
      tgt = new THREE.Vector3(0, 1.6, 0);
      pos = new THREE.Vector3(44, 15, 0);
    } else {
      // Vista isométrica geral padrão
      tgt = new THREE.Vector3(0.5, 1.4, 0.2);
      pos = new THREE.Vector3(27, 25, 31);
    }
    animateCamera(pos, tgt, 0.75);
  }

  function focusEquipment(id) {
    const e = equipment.find(q => q.id === id);
    if (!e) return;
    selectedId = id;
    selectedRing.position.set(e.x, 0.20, e.z);
    selectedRing.scale.setScalar(e.r * 1.28);

    const currentDir = camera.position.clone().sub(target);
    if (currentDir.lengthSq() < 1) currentDir.set(1, 0.85, 1);
    currentDir.normalize();
    // Garante ângulo tridimensional agradável ao aproximar
    currentDir.y = Math.max(0.45, Math.min(0.85, currentDir.y));
    currentDir.normalize();

    const dist = Math.max(10.5, e.r * 6.8);
    const lookTgt = new THREE.Vector3(e.x, e.h * 0.48, e.z);
    const camPos = lookTgt.clone().addScaledVector(currentDir, dist);
    animateCamera(camPos, lookTgt, 0.70);
    highlightConnections(id);
  }

  function focusArea(areaId) {
    if (!areaId || areaId === 'all') {
      selectedArea = null;
      highlightArea(null);
      cameraMode('iso');
      return;
    }
    const a = areaDefs.find(q => q.id === areaId);
    if (!a) return;
    selectedArea = areaId;
    highlightArea(areaId);

    const dir = new THREE.Vector3(0.72, 0.68, 0.82).normalize();
    const lookTgt = new THREE.Vector3(a.focus[0], 1.4, a.focus[1]);
    const camPos = lookTgt.clone().addScaledVector(dir, a.radius);
    animateCamera(camPos, lookTgt, 0.75);
  }

  // Destaca conexões e correntes do equipamento selecionado
  function highlightConnections(eqId) {
    streamRecords.forEach(rec => {
      const isConnected = !eqId || rec.stream.from === eqId || rec.stream.to === eqId;
      const matchesArea = !selectedArea || (() => {
        const eqFrom = equipment.find(e => e.id === rec.stream.from);
        const eqTo = equipment.find(e => e.id === rec.stream.to);
        return (eqFrom && eqFrom.area === selectedArea) || (eqTo && eqTo.area === selectedArea);
      })();
      const matchesFilter = !activeStreamFilter || rec.stream.category === activeStreamFilter;

      const active = matchesArea && matchesFilter;
      rec.streamMesh.material.opacity = active ? 1.0 : 0.16;
      rec.streamMesh.material.transparent = !active;
      rec.streamMesh.material.emissiveIntensity = (isConnected && active) ? 0.55 : (active ? 0.25 : 0.04);
      rec.pipeMesh.material.opacity = active ? 1.0 : 0.22;
      rec.pipeMesh.material.transparent = !active;
    });
  }

  // 5. VISUALIZAÇÃO POR ÁREA: Destaca equipamentos da área e reduz intensidade visual das demais
  function highlightArea(areaId) {
    selectedArea = areaId || null;
    objects.forEach(g => {
      const e = g.userData.equipment;
      const isDimmed = !!selectedArea && e.area !== selectedArea;
      g.traverse(child => {
        if (child.material && child.material.color && child.userData.baseColor) {
          child.material.color.copy(child.userData.baseColor);
          if (isDimmed) {
            child.material.color.lerp(new THREE.Color(0x1e293b), 0.74);
            child.material.transparent = true;
            child.material.opacity = 0.42;
          } else {
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }
        }
      });
    });

    areaDefs.forEach(a => {
      const pad = areaPads.get(a.id);
      if (pad) {
        pad.material.opacity = selectedArea ? (a.id === selectedArea ? 0.28 : 0.03) : 0.13;
      }
    });

    highlightConnections(selectedId);
  }

  function filterStreamsByCategory(category) {
    activeStreamFilter = activeStreamFilter === category ? null : category;
    highlightConnections(selectedId);
    return activeStreamFilter;
  }

  function setLayer(key, on) {
    if (!(key in layers)) return;
    layerEnabled[key] = !!on;
    layers[key].visible = !!on;
    updateProjectedLabels();
  }

  function setAllLayers(on = true) {
    Object.keys(layers).forEach(k => {
      layerEnabled[k] = !!on;
      layers[k].visible = !!on;
    });
    updateProjectedLabels();
  }

  function setMode(mode) {
    renderer.domElement.style.display = mode === 'iso3d' ? 'block' : 'none';
    if (labelsOverlay) labelsOverlay.style.display = mode === 'iso3d' ? 'block' : 'none';
    if (baseCanvas) baseCanvas.style.display = mode === 'iso3d' ? 'none' : 'block';
    resize();
  }

  function zoom(factor) {
    spherical.radius = Math.max(9.5, Math.min(72, spherical.radius * factor));
    camera.position.setFromSpherical(spherical).add(target);
    camera.lookAt(target);
    cameraMove = null;
  }

  function select(id, shouldFocus = true) {
    const e = equipment.find(q => q.id === id);
    if (!e) return;
    selectedId = id;
    selectedRing.position.set(e.x, 0.20, e.z);
    selectedRing.scale.setScalar(e.r * 1.28);

    if (BioSim.PlantView) {
      BioSim.PlantView.selectedId = id;
      BioSim.PlantView.syncSelectedEquipmentUI(id);
      BioSim.PlantView.updateInspector(simState, currentPoint);
    }
    if (shouldFocus) {
      focusEquipment(id);
    } else {
      highlightConnections(id);
    }
    updateProjectedLabels();
  }

  // Posicionamento inteligente de TAGs 3D com anti-sobreposição e LOD por nível de zoom
  function updateProjectedLabels() {
    if (!labelsOverlay || !container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width < 50 || height < 50) return;

    const camDist = camera.position.distanceTo(target);
    const isCloseZoom = camDist < 24;
    const isFarZoom = camDist > 48;

    // 1. Atualizar Badges de Áreas Industriais (Camada 07)
    areaDomBadges.forEach(item => {
      if (!layerEnabled.areas) {
        item.el.style.display = 'none';
        return;
      }
      const v = item.pos.clone().project(camera);
      if (v.z > 1 || v.z < -1) {
        item.el.style.display = 'none';
        return;
      }
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      item.el.style.display = 'inline-flex';
      item.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      item.el.classList.toggle('is-active', selectedArea === item.area.id);
      item.el.classList.toggle('is-dimmed', !!selectedArea && selectedArea !== item.area.id);
    });

    // 2. Atualizar TAGs dos 20 Equipamentos (Camada 04) com algoritmo anti-colisão 2D
    const projectedEq = eqDomTags.map(item => {
      const v = item.worldPos.clone().project(camera);
      const sx = (v.x * 0.5 + 0.5) * width;
      const sy = (-v.y * 0.5 + 0.5) * height;
      const isSelected = item.e.id === selectedId;
      const isHovered = item.e.id === hoveredId;
      const inSelectedArea = !selectedArea || item.e.area === selectedArea;
      const score = (isSelected ? 1000 : 0) + (isHovered ? 500 : 0) + (item.e.main ? 200 : 0) + (inSelectedArea ? 80 : 0) + item.e.priority * 10 - v.z * 25;
      return { item, v, sx, sy, score, isSelected, isHovered, inSelectedArea };
    });

    // Ordenar por relevância para priorizar equipamento selecionado, R-301 e área ativa
    projectedEq.sort((a, b) => b.score - a.score);

    const occupiedBoxes = [];
    projectedEq.forEach(p => {
      const { item, v, isSelected, isHovered, inSelectedArea } = p;
      const el = item.el;

      if (!layerEnabled.tags || v.z > 1 || v.z < -1) {
        el.style.display = 'none';
        return;
      }

      // Ocultar suavemente rótulos de outras áreas quando uma área está isolada ou em zoom muito distante
      if (selectedArea && !inSelectedArea && !isSelected && !isHovered) {
        el.style.display = 'none';
        return;
      }
      if (isFarZoom && item.e.priority < 2 && !isSelected && !isHovered) {
        el.style.display = 'none';
        return;
      }

      let fx = p.sx;
      let fy = p.sy;
      const boxW = isCloseZoom || isSelected ? 88 : 54;
      const boxH = isCloseZoom || isSelected ? 32 : 22;

      // Resolver sobreposição com pequenos deslocamentos verticais/horizontais inteligentes
      const candidateOffsets = [
        [0, 0], [0, -18], [0, 16], [-26, -12], [26, -12], [-34, 10], [34, 10]
      ];
      let placed = false;
      for (const [ox, oy] of candidateOffsets) {
        const tx = fx + ox;
        const ty = fy + oy;
        const collides = occupiedBoxes.some(b =>
          Math.abs(b.x - tx) < (b.w + boxW) * 0.48 &&
          Math.abs(b.y - ty) < (b.h + boxH) * 0.52
        );
        if (!collides) {
          fx = tx;
          fy = ty;
          placed = true;
          break;
        }
      }

      // Em zoom muito afastado, se ainda colidir e não for o selecionado, oculta para evitar poluição
      if (!placed && !isSelected && !isHovered && camDist > 34) {
        el.style.display = 'none';
        return;
      }

      occupiedBoxes.push({ x: fx, y: fy, w: boxW, h: boxH });
      el.style.display = 'inline-flex';
      el.style.transform = `translate(-50%, -100%) translate(${fx.toFixed(1)}px, ${fy.toFixed(1)}px)`;
      el.classList.toggle('is-selected', isSelected);
      el.classList.toggle('is-hovered', isHovered);
      el.classList.toggle('show-detail', isSelected || isHovered || isCloseZoom);
    });

    // 3. Atualizar TAGs de Instrumentação ISA-5.1 (Camada 05) — visíveis em zoom próximo ou no equipamento selecionado
    instDomBadges.forEach(({ rec, el }) => {
      const showInst = layerEnabled.instrumentation && layerEnabled.tags && (rec.e.id === selectedId || camDist < 22);
      if (!showInst) {
        el.style.display = 'none';
        return;
      }
      const v = rec.worldPos.clone().project(camera);
      if (v.z > 1) {
        el.style.display = 'none';
        return;
      }
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      el.style.display = 'inline-block';
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
  }

  // CAMADA 06 — Cálculo dinâmico de Status Operacional de cada equipamento
  function statusFor(e) {
    if (!simState || !currentPoint) return 'standby';
    const isPaused = BioSim.App && !BioSim.App.playing;
    if (e.id === 'R-301') {
      if (currentPoint.Q_spec > 3.0 || currentPoint.isFlooded || currentPoint.OD < 20.0) {
        return 'alarm';
      }
    }
    if (isPaused) return 'standby';
    if (e.area === '500' && currentPoint.t < 24) return 'standby';
    return 'running';
  }

  function refreshStatus() {
    statusRecords.forEach(({ e, ring, beacon }) => {
      const st = statusFor(e);
      const col = st === 'alarm' ? 0xef4444 : (st === 'standby' ? 0xf59e0b : 0x10b981);
      ring.material.color.setHex(col);
      beacon.material.color.setHex(col);
      ring.material.opacity = st === 'standby' ? 0.55 : 0.92;
    });
  }

  // Interação de ponteiro (Orbit, Pan, Zoom e Clique em Equipamento)
  function findEquipmentAtPointer(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(equipmentGroup.children, true);
    for (const hit of hits) {
      if (hit.object.userData.equipmentId) return hit.object.userData.equipmentId;
    }
    return null;
  }

  renderer.domElement.addEventListener('pointerdown', ev => {
    drag = { x: ev.clientX, y: ev.clientY, button: ev.button, moved: false };
    renderer.domElement.setPointerCapture(ev.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', ev => {
    if (drag) {
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      drag.x = ev.clientX;
      drag.y = ev.clientY;
      if (Math.hypot(dx, dy) > 2) drag.moved = true;

      if (drag.button === 2 || ev.shiftKey) {
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        target.addScaledVector(right, -dx * 0.025);
        target.y = Math.max(-1, Math.min(8, target.y + dy * 0.025));
      } else {
        spherical.theta -= dx * 0.0065;
        spherical.phi = Math.max(0.18, Math.min(1.36, spherical.phi - dy * 0.0055));
      }
      camera.position.setFromSpherical(spherical).add(target);
      camera.lookAt(target);
      cameraMove = null;
      updateProjectedLabels();
      return;
    }

    const id = findEquipmentAtPointer(ev);
    if (id !== hoveredId) {
      hoveredId = id;
      updateProjectedLabels();
    }
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    if (id) {
      const item = equipment.find(q => q.id === id);
      tooltip.textContent = `${item.id} · ${item.name} (Área ${item.area})`;
      tooltip.hidden = false;
      const r = container.getBoundingClientRect();
      tooltip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 250) + 'px';
      tooltip.style.top = Math.max(42, ev.clientY - r.top - 30) + 'px';
    } else {
      tooltip.hidden = true;
    }
  });

  renderer.domElement.addEventListener('pointerup', () => {
    renderer.domElement.dataset.dragged = drag && drag.moved ? '1' : '0';
    drag = null;
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredId = null;
    tooltip.hidden = true;
    updateProjectedLabels();
  });

  renderer.domElement.addEventListener('contextmenu', ev => ev.preventDefault());

  renderer.domElement.addEventListener('wheel', ev => {
    ev.preventDefault();
    zoom(ev.deltaY > 0 ? 1.09 : 0.91);
    updateProjectedLabels();
  }, { passive: false });

  renderer.domElement.addEventListener('click', () => {
    if (renderer.domElement.dataset.dragged === '1') {
      renderer.domElement.dataset.dragged = '0';
      return;
    }
    if (hoveredId) {
      select(hoveredId, true);
    }
  });

  function tickCamera(dt) {
    if (!cameraMove) return;
    cameraMove.elapsed += dt;
    const p = Math.min(1, cameraMove.elapsed / cameraMove.duration);
    const ease = p * p * (3 - 2 * p);
    camera.position.lerpVectors(cameraMove.from, cameraMove.to, ease);
    target.lerpVectors(cameraMove.targetFrom, cameraMove.targetTo, ease);
    camera.lookAt(target);
    if (p >= 1) cameraMove = null;
    syncSpherical();
  }

  let pulseClock = 0;

  BioSim.Plant3D = {
    available: true,
    equipment,
    streams: processStreams,
    areaDefs,
    layerEnabled,
    resize,
    setMode,
    setLayer,
    setAllLayers,
    select,
    focusEquipment,
    focusArea,
    cameraMode,
    zoom,
    highlightArea,
    filterStreamsByCategory,
    statusFor,
    getSelectedArea() { return selectedArea; },
    update(sim, pt) {
      simState = sim;
      currentPoint = pt;
      refreshStatus();
    },
    drawFrame(dt, sim, pt) {
      simState = sim;
      currentPoint = pt;
      pulseClock += dt;
      tickCamera(Math.min(dt, 0.06));

      const isPlaying = BioSim.App ? BioSim.App.playing : false;

      // CAMADA 08 — Animação das correntes somente quando a simulação está em execução!
      if (isPlaying && layerEnabled.flow) {
        movingParticles.forEach(m => {
          m.phase = (m.phase + dt * m.speed) % 1.0;
          m.mesh.position.copy(m.curve.getPoint(m.phase));
        });
      }

      // Rotação dos impelidores do R-301 durante execução
      const r301 = objects.get('R-301');
      if (r301 && isPlaying) {
        r301.traverse(o => {
          if (o.userData.rotor) o.rotation.y += dt * 3.8;
        });
      }

      // Pulsação visual dos anéis de alarme (Camada 06)
      if (layerEnabled.status) {
        statusRecords.forEach(({ e, ring }) => {
          if (statusFor(e) === 'alarm') {
            ring.material.opacity = 0.45 + 0.5 * Math.abs(Math.sin(pulseClock * 5.0));
          }
        });
      }

      updateProjectedLabels();
      renderer.render(scene, camera);
    }
  };

  new ResizeObserver(resize).observe(container);
  resize();
  // Inicia com visão geral isométrica e R-301 selecionado sem fechar o zoom inicial
  select('R-301', false);
})(window);
