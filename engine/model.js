/* ============================================================================
 * BioSim — Motor Matemático e Metabólico de Produção de Ácido Clavulânico
 * Base científica:
 *  - Relatório Consolidado PUC-Campinas (2026): RIB21, CER12, GOM19-22, FEN21, FEN22
 *  - PFD-AC-001 Rev. 1 (Áreas 100 a 500)
 *  - Operações Unitárias do Downstream: Agudelo-Arenas et al. (2024), Hirata et al. (2009)
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});

  // Constantes de geometria verificada do fermentador industrial R-301 (Tabela 4 e 17)
  const REACTOR_GEOM = {
    V_geom: 60.0,        // m³ geométrico total (59,9937 m³)
    V_max: 41.92,        // m³ volume útil de referência
    V0_base: 26.90,      // m³ volume inicial padrão fed-batch
    Dt: 2.836,           // m diâmetro do tanque (Área = 6,316 m², HL a 41,92 m³ = 6,637 m)
    Di: 1.007,           // m diâmetro dos 3 impelidores Rushton (vtip = 5,80 m/s a 110 rpm)
    n_impellers: 3,
    Np_eff: 16.50,       // Número de potência efetivo (3 × 5,5)
    rho: 1000.0,         // kg/m³ base de potência verificada (105,335 kW a 110 rpm)
    torque_limit: 9.15,  // kN·m limite nominal de projeto (110,0 rpm)
    P0_limit: 105.4,     // kW potência não aerada instalada
    N_flood_ref: 105.72, // rpm mínimo de antialagamento a 0,50 vvm e 41,92 m³
    vtip_bench_max: 4.19,// m/s maior velocidade de ponta testada em bancada (1000 rpm, 5,1 L)
    mu_ap_calib_max: 14.5,// mPa·s limite do envelope de calibração reológica
    q_coil_max: 3.0,     // kW/m³ limite superior típico de serpentina interna com água gelada
    dH_O2: 460.0         // kJ / mol O2 consumido (hipótese declarada seção 5.5)
  };

  // Presets de Meios de Cultivo (Tabela 2 e Seção 7.1)
  const MEDIA_PRESETS = {
    ribeiro: {
      id: 'ribeiro',
      name: 'Meio de Ribeiro (RIB21 — Calibração)',
      shortName: 'Ribeiro (Glicerol 15 g/L)',
      SG0: 15.0,          // g/L glicerol inicial
      SC0: 0.0,           // g/L eq-glicerol complexo
      C_mol_L: 0.489,     // mol C/L inicial
      P0: 0.142,          // g P/L inicial (KH2PO4)
      SG_feed: 120.0,     // g/L glicerol na alimentação
      gamma_C: 4.667,     // grau de redução
      khid: 0.01771,      // h⁻¹
      composition: [
        { name: 'Glicerol', gL: 15.0, molC: 0.489, pctC: 100.0, gamma: 4.667 }
      ]
    },
    fen22: {
      id: 'fen22',
      name: 'Meio do Grupo (FEN22 — Industrial Complexo)',
      shortName: 'FEN22 (3,32 mol C/L)',
      SG0: 5.0,           // g/L glicerol livre inicial
      SC0: 96.84,         // g/L eq-glicerol (dextrina + farelo de soja + óleo de milho)
      C_mol_L: 3.3175,    // mol C/L total inicial (6,8x Ribeiro)
      P0: 0.6697,         // g P/L inicial (4,71x Ribeiro)
      SG_feed: 180.0,     // g/L glicerol na alimentação
      gamma_C: 4.730,     // grau de redução médio (+1,3% sobre glicerol)
      khid: 0.01771,      // h⁻¹ (ln(10)/130 h)
      composition: [
        { name: 'Glicerol', gL: 5.0, molC: 0.1629, pctC: 4.9, gamma: 4.667 },
        { name: 'Dextrina', gL: 20.0, molC: 0.7401, pctC: 22.3, gamma: 4.000 },
        { name: 'Farelo de soja', gL: 40.0, molC: 1.1190, pctC: 33.7, gamma: 4.200 },
        { name: 'Óleo de milho', gL: 20.0, molC: 1.2955, pctC: 39.0, gamma: 5.614 }
      ]
    }
  };

  // Correlações de kLa (Tabela 13)
  const KLA_CORRELATIONS = {
    caldo: { id: 'caldo', name: 'Caldo (Padrão R-48)', C: 243.7, a: 0.2448, b: 0.4097, g: -0.0727, loo: '13,6%' },
    agua:  { id: 'agua',  name: 'Água (Intermediária)', C: 37.36, a: 0.2885, b: 0.3782, g: -0.2198, loo: '7,7%' },
    metodoC: { id: 'metodoC', name: 'Método C (Refutado R-45)', C: 5.651, a: 0.5674, b: 0.5515, g: -0.2198, loo: 'Viés -74,5%' }
  };

  // Estratégias de Alimentação Fed-Batch (Tabela 15 e 29)
  const STRATEGIES = {
    A: { id: 'A', name: 'A — Alimentação Constante', desc: 'Vazão fixa após fase batch inicial' },
    D: { id: 'D', name: 'D — Limitação Controlada (2 g/L)', desc: 'Mantém glicerol residual controlado próximo a 2 g/L' },
    E: { id: 'E', name: 'E — Receita FEN22 (Grupo)', desc: 'Pulso/rampa industrial quando SG < 5 g/L (2–5 g/L)' },
    F: { id: 'F', name: 'F — Lei FEN22 (120 g/L)', desc: 'Alimentação proporcional à demanda metabólica' }
  };

  // Presets de Cepas / Engenharia Genética (Aba 3)
  const STRAIN_PRESETS = {
    wildtype: {
      id: 'wildtype',
      name: 'ATCC 27064 (Bancada RIB21)',
      desc: 'Cepa referência selvagem calibrada nos ensaios de bancada de 5,1 L.',
      strainMultiplier: 1.0,
      genes: { ccaR: 1.0, claR: 1.0, cas2: 1.0, ceaS2: 1.0, lat: 1.0, cvm: 1.0 }
    },
    engineered: {
      id: 'engineered',
      name: 'Engenheirada (claR↑ ccaR↑ Δlat)',
      desc: 'Superexpressão de reguladores de AC e knockout da via competidora de Cefamicina C.',
      strainMultiplier: 1.35,
      genes: { ccaR: 2.2, claR: 2.5, cas2: 1.8, ceaS2: 1.6, lat: 0.0, cvm: 0.2 }
    },
    industrial: {
      id: 'industrial',
      name: 'Cepa Industrial FEN22 (3,74×/C)',
      desc: 'Cepa mutante industrial de alto título (Feng et al., 2022 — até 4.960 mg/L).',
      strainMultiplier: 3.741,
      genes: { ccaR: 2.5, claR: 2.8, cas2: 2.2, ceaS2: 2.0, lat: 0.15, cvm: 0.15 }
    }
  };

  // Estado padrão inicial da simulação
  function createDefaultConfig() {
    return {
      // Operação do Biorreator (Aba 2)
      medium: 'fen22',            // 'ribeiro' | 'fen22'
      strategy: 'E',              // 'A' | 'D' | 'E' | 'F'
      controlMode: 'fixed',       // 'fixed' | 'do_cascade'
      rpm: 105.7,                 // 80 – 200 rpm
      vvm: 0.50,                  // 0.20 – 1.00 vvm
      tempInit: 26.0,             // °C (0–36 h)
      tempProd: 24.0,             // °C (>36 h — estratégia FEN22 reduz Impureza G)
      pH: 6.9,                    // pH 6,9 ± 0,5
      klaModel: 'caldo',          // 'caldo' | 'agua' | 'metodoC'
      horizonH: 170,              // h

      // Downstream (Aba 1)
      downstreamRoute: 'll_double', // 'll_single' | 'll_double' | 'll_multistage' | 'amberlite'
      extractionTemp: 10.0,       // °C
      extractionPH: 2.0,          // pH
      solventRatio: 1.2,          // Org/Aq (1:1,20 ref. modelo estatístico)

      // Modelagem Matemática & Estrutural (Aba 3 — Seções 3 e 6.5)
      kdi: 1.0,                   // h⁻¹ (0,03 a 3,0)
      muInhibition: false,        // g(μ) = 1 / [1 + (μ/0,05)^4]
      phosphateActive: true,      // fP ativo vs inerte (refutado FEN21)
      thetaGMode: 'monod',        // 'monod' (SG/(Km+SG)) | 'saturated' (θG = 1)
      beta: 21.60,                // mg/(gX·h)
      Kgamma: 705.1,              // s⁻¹
      kdP: 0.038,                 // h⁻¹ degradação extracelular do AC a 24 °C (t1/2 ~ 18 h)
      muMax: 0.115,               // h⁻¹
      YXG: 0.44,                  // gX/gS
      mS: 0.018,                  // gS/(gX·h)

      // Engenharia Genética / DNA (Aba 3 — Cluster pSCL4 de S. clavuligerus)
      strainPreset: 'wildtype',
      strainMultiplier: 1.0,
      genes: {
        ccaR: 1.0,   // Regulador global supercluster cefamicina/AC (0–3)
        claR: 1.0,   // Regulador específico etapa tardia AC (0–3)
        cas2: 1.0,   // Clavaminato sintase (oxigenase O2-dependente) (0–3)
        ceaS2: 1.0,  // Carboxietilarginina sintase + entrada glicerol (0–3)
        lat: 1.0,    // Lisina ε-aminotransferase (Via competidora Cefamicina C) (0–2.5)
        cvm: 1.0     // Via de Clavamas 5S (competição por clavaminato) (0–2.5)
      }
    };
  }

  // Presets rápidos de cenário global (barra superior) — Mantém cenários e origens distintos (Seção 5)
  const SCENARIO_PRESETS = {
    preliminar_ref: {
      label: 'Modelo Preliminar Fed-Batch · ~577 mg/L @ 99h (~20 kg)',
      origin: 'Simulação preliminar fed-batch (não validada experimentalmente em 60 m³)',
      batchId: 'PRELIM-AC-009',
      patch: {
        medium: 'ribeiro', strategy: 'D', controlMode: 'fixed', rpm: 110.0, vvm: 0.50,
        tempInit: 26.0, tempProd: 24.0, pH: 6.90, klaModel: 'caldo',
        kdi: 1.0, muInhibition: false, phosphateActive: true, thetaGMode: 'monod',
        beta: 19.65, Kgamma: 705.1, strainPreset: 'wildtype', strainMultiplier: 1.0,
        genes: { ccaR: 1.0, claR: 1.0, cas2: 1.0, ceaS2: 1.0, lat: 1.0, cvm: 1.0 }
      }
    },
    ribeiro_rec: {
      label: 'Ribeiro RIB21 · 105,7 rpm (Calibração Bancada 5,1 L)',
      origin: 'Calibração cinética RIB21 extrapolada para 60 m³',
      batchId: 'RIB21-AC-012',
      patch: {
        medium: 'ribeiro', strategy: 'D', controlMode: 'fixed', rpm: 105.7, vvm: 0.50,
        tempInit: 26.0, tempProd: 24.0, pH: 6.90, klaModel: 'caldo',
        kdi: 1.0, muInhibition: false, phosphateActive: true, thetaGMode: 'monod',
        beta: 21.60, Kgamma: 705.1, strainPreset: 'wildtype', strainMultiplier: 1.0,
        genes: { ccaR: 1.0, claR: 1.0, cas2: 1.0, ceaS2: 1.0, lat: 1.0, cvm: 1.0 }
      }
    },
    fen22_grupo: {
      label: 'FEN22 Grupo · 105,7 rpm (Meio Complexo 3,32 mol C/L)',
      origin: 'Meio industrial FEN22 com cinética ATCC 27064 (Seção 7)',
      batchId: 'FEN22-AC-015',
      patch: {
        medium: 'fen22', strategy: 'E', controlMode: 'fixed', rpm: 105.7, vvm: 0.50,
        tempInit: 26.0, tempProd: 24.0, pH: 6.90, klaModel: 'caldo',
        kdi: 1.0, muInhibition: false, phosphateActive: true, thetaGMode: 'monod',
        beta: 21.60, Kgamma: 705.1, strainPreset: 'wildtype', strainMultiplier: 1.0,
        genes: { ccaR: 1.0, claR: 1.0, cas2: 1.0, ceaS2: 1.0, lat: 1.0, cvm: 1.0 }
      }
    },
    fen22_industrial: {
      label: 'FEN22 Industrial · 125 rpm + Cepa Ind. (3,74×/C)',
      origin: 'Cenário industrial de alto título (Feng et al., 2022)',
      batchId: 'FEN22-IND-021',
      patch: {
        medium: 'fen22', strategy: 'E', controlMode: 'fixed', rpm: 125.0, vvm: 0.50,
        tempInit: 26.0, tempProd: 24.0, pH: 6.90, klaModel: 'caldo',
        kdi: 0.30, muInhibition: false, phosphateActive: false, thetaGMode: 'saturated',
        beta: 21.36, Kgamma: 625.1, strainPreset: 'industrial', strainMultiplier: 3.741,
        genes: { ccaR: 2.5, claR: 2.8, cas2: 2.2, ceaS2: 2.0, lat: 0.15, cvm: 0.15 }
      }
    },
    high_rpm_180: {
      label: 'Novo Acionamento · 180 rpm (Ribeiro RIB21)',
      origin: 'Estudo de reespecificação eletromecânica a 180 rpm',
      batchId: 'RIB21-DRV-180',
      patch: {
        medium: 'ribeiro', strategy: 'D', controlMode: 'fixed', rpm: 180.0, vvm: 0.50,
        tempInit: 26.0, tempProd: 24.0, pH: 6.90, klaModel: 'caldo',
        kdi: 1.0, muInhibition: false, phosphateActive: true, thetaGMode: 'monod',
        beta: 21.60, Kgamma: 705.1, strainPreset: 'wildtype', strainMultiplier: 1.0,
        genes: { ccaR: 1.0, claR: 1.0, cas2: 1.0, ceaS2: 1.0, lat: 1.0, cvm: 1.0 }
      }
    }
  };

  // Hidrodinâmica instantânea do vaso de 60 m³
  function computeHydrodynamics(N_rpm, vvm, V_m3, X_gL, tempC, klaModelId) {
    const G = REACTOR_GEOM;
    const Ns = N_rpm / 60.0; // s⁻¹
    const area = Math.PI * Math.pow(G.Dt / 2, 2); // 6,316 m²
    const HL = V_m3 / area;

    // Potência não aerada (kW) — exatamente calibrada em 105,335 kW a 110 rpm
    const P0_kW = (G.Np_eff * G.rho * Math.pow(Ns, 3) * Math.pow(G.Di, 5)) / 1000.0;
    // Torque não aerado (kN·m) — 9,144 kN·m a 110 rpm
    const torque_kNm = P0_kW / (2 * Math.PI * Ns);
    const torqueMarginPct = ((G.torque_limit - torque_kNm) / G.torque_limit) * 100.0;

    // Velocidade de ponta (m/s) — 5,80 m/s a 110 rpm
    const vtip = Math.PI * G.Di * Ns;

    // Vazão de ar (m³/s) e velocidade superficial vs (m/s)
    // Referência Tabela 13: a 0,50 vvm e volume operacional, vs = 0,0286 m/s
    const Q_air_m3s = (vvm * V_m3) / 60.0;
    const vs = 0.0286 * (vvm / 0.50) * Math.pow(V_m3 / 33.0, 0.35);

    // Mínimo de antialagamento Nmin (105,72 rpm a 0,50 vvm e 41,92 m³)
    const N_flood = G.N_flood_ref * Math.pow(Math.max(0.05, vvm) / 0.50, 1 / 3) * Math.pow(V_m3 / G.V_max, 0.18);
    const isFlooded = N_rpm < N_flood;

    // Potência aerada Pg (Michel & Miller calibrado à Tabela 17: 23,3 kW a 110 rpm, 100,8 kW a 180 rpm)
    const aerFactor = 0.219 * Math.pow(0.50 / Math.max(0.10, vvm), 0.252) * Math.pow(110.0 / Math.max(40, N_rpm), 0.03);
    const Pg_kW = P0_kW * Math.min(0.85, Math.max(0.14, aerFactor));
    const PV_Wm3 = (Pg_kW * 1000.0) / Math.max(10.0, V_m3);

    // Reologia de caldo filamentoso de S. clavuligerus (GOM19 + Seção 7)
    // Calibrada à Tabela 2, 16 e 29:
    //  - Ribeiro (105,7 rpm, X~10,9 g/L): γ̇ ≈ 165 s⁻¹, μap ≈ 224 mPa·s
    //  - FEN22 (105,7 rpm, X~21,4 g/L): γ̇ ≈ 145 s⁻¹, μap ≈ 488 mPa·s
    //  - 180 rpm (Tabela 16): γ̇ ≈ 522 s⁻¹
    const tempViscFactor = Math.exp(0.022 * (26.0 - tempC));
    const n_flow = Math.max(0.50, 0.90 - 0.018 * Math.min(22.5, X_gL)); // índice pseudoplástico
    const K_cons = (0.0010 + 0.0044 * Math.pow(Math.max(0.1, X_gL), 2.28)) * tempViscFactor; // Pa·s^n

    // Taxa de cisalhamento média γ̇ (s⁻¹) — reproduz Tabela 16 (170 a 106 rpm -> 522 a 180 rpm)
    const gammaDot = Math.max(30.0, 165.0 * Math.pow(Math.max(40, N_rpm) / 105.7, 2.11) * Math.pow(10.0 / Math.max(2.5, X_gL + 1.2), 0.14));

    // Viscosidade aparente (Pa·s e mPa·s)
    const mu_ap_Pas = Math.max(0.00089, Math.min(1.5, K_cons * Math.pow(gammaDot, n_flow - 1.0)));
    const mu_ap_mPas = mu_ap_Pas * 1000.0;

    // Coeficiente de transferência de oxigênio kLa (h⁻¹) — Tabela 13
    const corr = KLA_CORRELATIONS[klaModelId] || KLA_CORRELATIONS.caldo;
    let kLa = corr.C * Math.pow(Math.max(50, PV_Wm3), corr.a) * Math.pow(Math.max(1e-4, vs), corr.b) * Math.pow(Math.max(0.00084, mu_ap_Pas), corr.g);
    if (isFlooded) {
      // Perda severa de dispersão sob inundação do impelidor
      const floodRatio = Math.max(0.35, N_rpm / N_flood);
      kLa *= Math.pow(floodRatio, 2.2);
    }

    // Saturação de O2 C* (mg/L e mmol/L) corrigida por temperatura e pressão hidrostática média (R-23)
    const P_mean_atm = 1.0 + (G.rho * 9.81 * (HL * 0.45)) / 101325.0; // ~1,28 atm
    const Cstar_mgL = (14.16 - 0.3943 * tempC + 0.007714 * tempC * tempC - 0.0000646 * Math.pow(tempC, 3)) * P_mean_atm;
    const Cstar_mmolL = Cstar_mgL / 32.0;

    // Tempo de mistura estimado (s)
    const t_mix_s = Math.max(6.0, 5.2 / Ns * Math.pow(G.Dt / G.Di, 2.1) * Math.pow(Math.max(1, mu_ap_mPas / 30), 0.25));

    return {
      Ns, HL, P0_kW, Pg_kW, PV_Wm3, torque_kNm, torqueMarginPct,
      vtip, Q_air_m3s, vs, N_flood, isFlooded,
      n_flow, K_cons, gammaDot, mu_ap_Pas, mu_ap_mPas,
      kLa, Cstar_mgL, Cstar_mmolL, t_mix_s
    };
  }

  // Cálculo dos efeitos genéticos / fluxo metabólico na célula S. clavuligerus (Aba 3)
  function computeGeneticProfile(cfg) {
    const g = cfg.genes;
    // Regulador global ccaR amplifica supercluster (AC + Cefamicina C)
    const ccaR_eff = 0.35 + 0.65 * g.ccaR;
    // Regulador específico claR direciona clavaminato para AC (tardia)
    const claR_eff = 0.20 + 0.80 * Math.pow(g.claR, 0.85);
    // Entrada de glicerol/G3P (ceaS2 + glpK)
    const entry_eff = 0.30 + 0.70 * Math.pow(g.ceaS2, 0.75);
    // Clavaminato sintase cas2 (gargalo enzimático dependente de O2)
    const cas2_eff = 0.25 + 0.75 * Math.pow(g.cas2, 0.80);

    // Competição por precursores:
    // lat (Cefamicina C) consome aminoácidos/carbono do pool secundário
    const cephDrain = 0.22 * g.lat * ccaR_eff;
    // cvm (Clavamas 5S) compete diretamente por clavaminato com claR
    const clav5SDrain = 0.18 * g.cvm / Math.max(0.35, claR_eff);

    // Fator líquido de redirecionamento de fluxo para Ácido Clavulânico
    // Quando todos genes estão em 1.0 (Wild-Type): factor ≈ 1.00
    const rawFlux = Math.min(entry_eff, cas2_eff * 1.15) * ccaR_eff * claR_eff;
    const competitionFactor = (1.0 + 0.22 + 0.18) / (1.0 + cephDrain + clav5SDrain);
    const acGeneFactor = Math.max(0.05, rawFlux * competitionFactor * cfg.strainMultiplier);

    // Fatores relativos das vias paralelas
    const cephGeneFactor = Math.max(0.0, g.lat * ccaR_eff * (1.0 / (0.6 + 0.4 * claR_eff)));
    const clav5SGeneFactor = Math.max(0.0, g.cvm * cas2_eff * (1.2 / (0.4 + 0.8 * claR_eff)));

    // Fator de afinidade de oxigênio da cas2 (se cas2 for baixa, exige mais OD)
    const cas2_O2_Km = 8.0 / Math.max(0.3, g.cas2); // % OD

    return {
      acGeneFactor,
      cephGeneFactor,
      clav5SGeneFactor,
      entry_eff,
      cas2_eff,
      ccaR_eff,
      claR_eff,
      cephDrain,
      clav5SDrain,
      cas2_O2_Km
    };
  }

  // Simulação completa 0 → horizonH (RK4 / integração adaptada)
  function runSimulation(config) {
    const cfg = Object.assign(createDefaultConfig(), config || {});
    cfg.genes = Object.assign({}, createDefaultConfig().genes, (config && config.genes) || {});

    const media = MEDIA_PRESETS[cfg.medium] || MEDIA_PRESETS.fen22;
    const gen = computeGeneticProfile(cfg);
    const G = REACTOR_GEOM;

    // Ajuste de β quando inibição por μ está ligada (Tabela 9: 21,60 -> 60,55)
    let betaEff = cfg.beta;
    if (cfg.muInhibition) {
      betaEff = cfg.beta * (60.55 / 21.60);
    }
    // Ajuste fino de Kγ com kdi (Tabela 6: se o usuário mexer no kdi mantendo calibração implícita)
    const KgammaEff = cfg.Kgamma;
    const KIP = 0.41; // g/L (Seção 3.3)
    const Km_G = 0.10; // g/L (Seção 7.4)
    const KS = 0.45;   // g/L Monod substrato
    const YXP = 42.0;  // gX/gP
    // Rendimento e manutenção de O2 calibrados à Tabela 2 e 33:
    //  - Ribeiro: Q_met ≈ 62,9 kW (Q/V ≈ 3,14 kW/m³, OD_min ≈ 83%)
    //  - FEN22:   Q_met ≈ 253,7 kW (Q/V ≈ 10,24 kW/m³, OD_min ≈ 21,3%)
    const YXO2 = cfg.medium === 'fen22' ? 0.0155 : 0.029; // gX / mmol O2
    const mO = cfg.medium === 'fen22' ? 1.55 : 0.65;      // mmol O2 / (gX·h)

    // Condições iniciais
    let V = G.V0_base;    // 26,90 m³
    let X = 0.95;         // g/L (inóculo 4% v/v do tanque semente R-201)
    let SG = media.SG0;   // g/L
    let SC = media.SC0;   // g/L eq-glicerol complexo
    let P = media.P0;     // g P/L
    let Pi = 0.0;         // mg/L AC intracelular
    let Pe = 0.0;         // mg/L AC extracelular
    let CephC = 0.0;      // mg/L Cefamicina C
    let Clav5S = 0.0;     // mg/L Clavamas 5S
    let ImpG = 0.0;       // mg/L Impureza Substância G

    const dt = 0.5;       // h
    const steps = Math.round(cfg.horizonH / dt);
    const series = [];

    // Acumuladores de resumo
    let peakAC = 0, peakMassKg = 0, peakTimeH = 0, peakIdx = 0;
    let maxX = 0, minOD = 100, maxMuAp = 0, maxQSpec = 0, maxQTotal = 0;
    let maxTorque = 0, maxRPM = 0, minKlaMargin = 999, totalEnergyKWh = 0;
    let sumGamma = 0, sumPhi = 0, countActive = 0;
    let maxCephC = 0, maxClav5S = 0, maxImpG = 0;
    let maxVtip = 0, maxPg = 0, maxP0 = 0;

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      // Perfil térmico FEN22: 26 °C fase de crescimento → 24 °C fase de produção após 36 h
      const tempC = t < 36.0 ? cfg.tempInit : cfg.tempProd;

      // Controle de vazão de alimentação fed-batch F (m³/h)
      let F = 0.0;
      if (V < G.V_max - 0.01) {
        if (cfg.strategy === 'A') {
          if (t >= 20.0) F = 0.115;
        } else if (cfg.strategy === 'D') {
          if (t >= 18.0 && SG < 2.2) {
            F = Math.min(0.22, 0.06 + 0.09 * Math.max(0, 2.2 - SG));
          }
        } else if (cfg.strategy === 'E') {
          // Receita FEN22: inicia quando glicerol < 5 g/L
          if (t >= 24.0 && SG < 4.5) {
            F = Math.min(0.24, 0.085 + 0.05 * Math.max(0, 4.5 - SG));
          }
        } else if (cfg.strategy === 'F') {
          if (t >= 20.0 && SG < 3.0) {
            F = Math.min(0.20, 0.055 + 0.065 * (X / 10.0));
          }
        }
      }
      if (V + F * dt > G.V_max) {
        F = Math.max(0, (G.V_max - V) / dt);
      }
      const D = F / V; // h⁻¹

      // Determinação de rotação (fixa ou controle cascata por OD alvo 30%)
      let N_curr = cfg.rpm;
      let hydro = computeHydrodynamics(N_curr, cfg.vvm, V, X, tempC, cfg.klaModel);

      // Cálculo preliminar da demanda de O2 para modo cascata OD
      const fTempGrow = Math.exp(-0.015 * Math.pow(tempC - 26.5, 2));
      const fPH = Math.exp(-0.35 * Math.pow(cfg.pH - 6.9, 2));
      const mu_pot = cfg.muMax * (SG / (KS + SG)) * fTempGrow * fPH;
      const OUR_pot = (mu_pot / YXO2 + mO) * X; // mmol O2 / (L·h)

      if (cfg.controlMode === 'do_cascade') {
        // Ajusta rotação para sustentar OD >= 30% sem baixar abaixo de N_flood
        let nTry = Math.max(hydro.N_flood, 95.0);
        for (let iter = 0; iter < 12; iter++) {
          const hTry = computeHydrodynamics(nTry, cfg.vvm, V, X, tempC, cfg.klaModel);
          const otrMax = hTry.kLa * hTry.Cstar_mmolL;
          const odTry = 100.0 * (1.0 - OUR_pot / Math.max(1e-6, otrMax));
          if (odTry >= 30.0) break;
          nTry += 3.5;
          if (nTry > 200) { nTry = 200; break; }
        }
        N_curr = nTry;
        hydro = computeHydrodynamics(N_curr, cfg.vvm, V, X, tempC, cfg.klaModel);
      }

      // Balanço de oxigênio acoplado (OD real)
      const OTR_max = hydro.kLa * hydro.Cstar_mmolL; // mmol O2 / (L·h)
      // Resolução analítica rápida do acoplamento OUR(OD) = OTR(OD)
      let OD_pct = 100.0;
      let mu = mu_pot;
      let OUR = OUR_pot;
      for (let it = 0; it < 6; it++) {
        const fO2 = OD_pct / (4.5 + OD_pct);
        mu = mu_pot * fO2;
        OUR = (mu / YXO2 + mO * (OD_pct / (2.0 + OD_pct))) * X;
        const nextOD = Math.max(0.5, Math.min(100.0, 100.0 * (1.0 - OUR / Math.max(1e-6, OTR_max))));
        OD_pct = 0.5 * OD_pct + 0.5 * nextOD;
      }
      const kLaMargin = (OTR_max * 0.80) / Math.max(1e-6, OUR); // margem sobre piso 20% OD

      // Balanço térmico (Seção 5.5 e 7.6)
      // OUR está em mmol/(L·h) = mol/(m³·h). Dividir por 3600 -> mol/(m³·s).
      const Q_met_kW = (OUR / 3600.0) * V * G.dH_O2;
      const Q_ag_kW = hydro.Pg_kW;
      const Q_tot_kW = Q_met_kW + Q_ag_kW;
      const Q_spec_kWm3 = Q_tot_kW / V;

      // Termos de biossíntese de Ácido Clavulânico (Seção 3.1, 3.5, 7.4)
      const fP = cfg.phosphateActive ? (KIP / (KIP + P)) : 1.0;
      const thetaG = cfg.thetaGMode === 'saturated' ? 1.0 : (SG / (Km_G + SG));
      const gMu = cfg.muInhibition ? (1.0 / (1.0 + Math.pow(mu / 0.05, 4))) : 1.0;
      const fO2_cas2 = OD_pct / (gen.cas2_O2_Km + OD_pct);
      const fTempProd = Math.exp(-0.025 * Math.pow(tempC - 24.5, 2));

      // Biossíntese intracelular rbio [mg/(L·h)]
      const rbio = betaEff * fP * thetaG * gMu * fO2_cas2 * fTempProd * gen.acGeneFactor * X;

      // Fração de liberação por cisalhamento φ(γ̇)
      const phi = hydro.gammaDot / (hydro.gammaDot + KgammaEff);
      const releaseRate = cfg.kdi * (hydro.gammaDot / KgammaEff) * Pi;
      const degIntracell = cfg.kdi * Pi;

      // Degradação extracelular dependente de temperatura e pH
      const kdP_eff = cfg.kdP * Math.exp(0.085 * (tempC - 24.0)) * (1.0 + 0.25 * Math.pow(cfg.pH - 6.8, 2));

      // Subprodutos (Cefamicina C, Clavamas 5S, Impureza Substância G)
      const rCeph = 8.5 * fP * thetaG * gen.cephGeneFactor * X;
      const rClav5S = 6.2 * fP * thetaG * fO2_cas2 * gen.clav5SGeneFactor * X;
      // Impureza G (FEN22: cresce com temperatura > 24 °C e concentração de AC + idade do cultivo)
      const rImpG = (0.0022 * Math.exp(0.18 * (tempC - 24.0)) * (Pe + 15.0)) * (t > 40 ? 1.0 : 0.2);

      // Massa atual de AC no reator (kg)
      const massAC_kg = (Pe * V) / 1000.0;

      // Fase da fermentação (para UI & linha do tempo)
      let phase = 'Preparação';
      if (t < 10) phase = 'Adaptação (Lag)';
      else if (t < 32) phase = 'Crescimento Exponencial';
      else if (F > 0.01 && t < 85) phase = 'Alimentação Fed-Batch';
      else if (t >= 85 && Pe >= peakAC * 0.92) phase = 'Pico de Produção AC';
      else if (t >= 85) phase = 'Declínio / Colheita';

      // Registrar ponto da série
      const point = {
        t: Number(t.toFixed(2)),
        V: Number(V.toFixed(2)),
        F: Number(F.toFixed(3)),
        X: Number(X.toFixed(2)),
        mu: Number(mu.toFixed(4)),
        SG: Number(SG.toFixed(2)),
        SC: Number(SC.toFixed(2)),
        P: Number(P.toFixed(3)),
        OD: Number(OD_pct.toFixed(1)),
        OUR: Number(OUR.toFixed(2)),
        OTR: Number(OTR_max.toFixed(1)),
        kLa: Number(hydro.kLa.toFixed(1)),
        kLaMargin: Number(Math.min(15, kLaMargin).toFixed(2)),
        Pi: Number(Pi.toFixed(1)),
        Pe: Number(Pe.toFixed(1)),
        massAC_kg: Number(massAC_kg.toFixed(2)),
        CephC: Number(CephC.toFixed(1)),
        Clav5S: Number(Clav5S.toFixed(1)),
        ImpG: Number(ImpG.toFixed(1)),
        rbio: Number(rbio.toFixed(2)),
        phi: Number(phi.toFixed(3)),
        gammaDot: Number(hydro.gammaDot.toFixed(1)),
        muAp: Number(hydro.mu_ap_mPas.toFixed(1)),
        N: Number(N_curr.toFixed(1)),
        P0: Number(hydro.P0_kW.toFixed(1)),
        Pg: Number(hydro.Pg_kW.toFixed(1)),
        PV: Number(hydro.PV_Wm3.toFixed(0)),
        torque: Number(hydro.torque_kNm.toFixed(2)),
        torqueMargin: Number(hydro.torqueMarginPct.toFixed(1)),
        vtip: Number(hydro.vtip.toFixed(2)),
        N_flood: Number(hydro.N_flood.toFixed(1)),
        isFlooded: hydro.isFlooded,
        Q_met: Number(Q_met_kW.toFixed(1)),
        Q_ag: Number(Q_ag_kW.toFixed(1)),
        Q_tot: Number(Q_tot_kW.toFixed(1)),
        Q_spec: Number(Q_spec_kWm3.toFixed(2)),
        tempC: Number(tempC.toFixed(1)),
        pH: Number(cfg.pH.toFixed(2)),
        fP: Number(fP.toFixed(3)),
        thetaG: Number(thetaG.toFixed(3)),
        gMu: Number(gMu.toFixed(3)),
        fO2_cas2: Number(fO2_cas2.toFixed(3)),
        t_mix: Number(hydro.t_mix_s.toFixed(1)),
        phase
      };
      series.push(point);

      // Atualizar estatísticas
      if (massAC_kg > peakMassKg) {
        peakMassKg = massAC_kg;
        peakAC = Pe;
        peakTimeH = t;
        peakIdx = i;
      }
      if (X > maxX) maxX = X;
      if (t > 4 && OD_pct < minOD) minOD = OD_pct;
      if (hydro.mu_ap_mPas > maxMuAp) maxMuAp = hydro.mu_ap_mPas;
      if (Q_spec_kWm3 > maxQSpec) maxQSpec = Q_spec_kWm3;
      if (Q_tot_kW > maxQTotal) maxQTotal = Q_tot_kW;
      if (hydro.torque_kNm > maxTorque) maxTorque = hydro.torque_kNm;
      if (N_curr > maxRPM) maxRPM = N_curr;
      if (t > 4 && kLaMargin < minKlaMargin) minKlaMargin = kLaMargin;
      if (hydro.vtip > maxVtip) maxVtip = hydro.vtip;
      if (hydro.Pg_kW > maxPg) maxPg = hydro.Pg_kW;
      if (hydro.P0_kW > maxP0) maxP0 = hydro.P0_kW;
      if (CephC > maxCephC) maxCephC = CephC;
      if (Clav5S > maxClav5S) maxClav5S = Clav5S;
      if (ImpG > maxImpG) maxImpG = ImpG;
      if (t <= Math.max(peakTimeH, 100)) {
        sumGamma += hydro.gammaDot;
        sumPhi += phi;
        countActive++;
      }
      if (i < steps) {
        totalEnergyKWh += (hydro.Pg_kW + hydro.Q_air_m3s * 42.0) * dt; // agitação + compressão ar
      }

      // Integração (Euler semi-implícito com sub-passos para estabilidade rígida em Pi/SG)
      const subSteps = 4;
      const h = dt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        const kdX = 0.0028 + (SG < 0.15 && SC < 1.0 ? 0.004 : 0.0);
        const dV = F;
        const dSC = -media.khid * SC - D * SC;
        const dSG = D * (media.SG_feed - SG) + media.khid * SC - (mu / cfg.YXG + cfg.mS) * X;
        const dP = - (mu / YXP) * X - D * P;
        const dX = (mu - kdX - D) * X;
        const dPi = rbio - cfg.kdi * (1.0 + hydro.gammaDot / KgammaEff) * Pi - D * Pi;
        const dPe = cfg.kdi * (hydro.gammaDot / KgammaEff) * Pi - kdP_eff * Pe - D * Pe;
        const dCeph = rCeph - 0.004 * CephC - D * CephC;
        const dClav5S = rClav5S - 0.005 * Clav5S - D * Clav5S;
        const dImpG = rImpG - D * ImpG;

        V = Math.min(G.V_max, Math.max(10.0, V + dV * h));
        SC = Math.max(0.0, SC + dSC * h);
        SG = Math.max(0.0, SG + dSG * h);
        P = Math.max(0.0, P + dP * h);
        X = Math.max(0.1, X + dX * h);
        Pi = Math.max(0.0, Pi + dPi * h);
        Pe = Math.max(0.0, Pe + dPe * h);
        CephC = Math.max(0.0, CephC + dCeph * h);
        Clav5S = Math.max(0.0, Clav5S + dClav5S * h);
        ImpG = Math.max(0.0, ImpG + dImpG * h);
      }
    }

    const peakPt = series[peakIdx] || series[series.length - 1];
    const energyPerKg = peakMassKg > 0.1 ? (totalEnergyKWh * (peakTimeH / cfg.horizonH)) / peakMassKg : 0;

    // Downstream (Áreas 400 e 500 — PFD-AC-001 & Agudelo-Arenas 2024)
    const downstream = computeDownstream(cfg, peakPt, maxX);

    // Alarmes de Engenharia (Seções 5, 7 e 8)
    const alarms = computeEngineeringAlarms(cfg, {
      peakPt, maxX, minOD, maxMuAp, maxQSpec, maxQTotal, maxTorque, maxRPM,
      minKlaMargin, maxVtip, maxImpG, maxP0
    });

    // Análise de Gargalos Celulares & Processo (Aba 3)
    const bottlenecks = computeBottlenecks(cfg, gen, peakPt, {
      minOD, maxQSpec, maxTorque, maxMuAp, maxCephC, maxClav5S, maxImpG,
      avgPhi: sumPhi / Math.max(1, countActive)
    });

    // Distribuição de Produtos da Célula no pico (Aba 3)
    const totalMetabolites = peakPt.Pe + peakPt.CephC + peakPt.Clav5S + peakPt.ImpG + 1e-6;
    const cellProducts = {
      ac_mgL: peakPt.Pe,
      cephC_mgL: peakPt.CephC,
      clav5S_mgL: peakPt.Clav5S,
      impG_mgL: peakPt.ImpG,
      biomass_gL: peakPt.X,
      ac_share: (peakPt.Pe / totalMetabolites) * 100,
      cephC_share: (peakPt.CephC / totalMetabolites) * 100,
      clav5S_share: (peakPt.Clav5S / totalMetabolites) * 100,
      impG_share: (peakPt.ImpG / totalMetabolites) * 100,
      impG_ratio_pct: peakPt.Pe > 1 ? (peakPt.ImpG / peakPt.Pe) * 100 : 0
    };

    // Envelope estrutural comparativo (Tabela 26)
    const structuralEnvelope = {
      currentMassKg: Number(peakMassKg.toFixed(2)),
      lowBoundKg: Number((peakMassKg * (cfg.muInhibition ? 0.36 : 0.92)).toFixed(2)),
      highBoundKg: Number((peakMassKg * (cfg.muInhibition ? 1.78 : 4.95)).toFixed(2)),
      paramP5Kg: Number((peakMassKg * 0.49).toFixed(2)),
      paramP95Kg: Number((peakMassKg * 1.92).toFixed(2))
    };

    // Comparador de Scale-Up (5,1 L → 50 L → 60 m³)
    const scaleUp = computeScaleUp(cfg, peakPt);

    return {
      config: cfg,
      media,
      genetic: gen,
      series,
      summary: {
        peakAC: Number(peakAC.toFixed(1)),
        peakMassKg: Number(peakMassKg.toFixed(2)),
        peakTimeH: Number(peakTimeH.toFixed(1)),
        peakVolume: peakPt.V,
        maxX: Number(maxX.toFixed(2)),
        minOD: Number(minOD.toFixed(1)),
        minKlaMargin: Number(minKlaMargin.toFixed(2)),
        maxMuAp: Number(maxMuAp.toFixed(1)),
        maxQSpec: Number(maxQSpec.toFixed(2)),
        maxQTotal: Number(maxQTotal.toFixed(1)),
        maxTorque: Number(maxTorque.toFixed(2)),
        torqueMarginMin: Number((((G.torque_limit - maxTorque) / G.torque_limit) * 100).toFixed(1)),
        maxRPM: Number(maxRPM.toFixed(1)),
        maxVtip: Number(maxVtip.toFixed(2)),
        maxP0: Number(maxP0.toFixed(1)),
        maxPg: Number(maxPg.toFixed(1)),
        avgGamma: Number((sumGamma / Math.max(1, countActive)).toFixed(1)),
        avgPhi: Number((sumPhi / Math.max(1, countActive)).toFixed(3)),
        energyPerKg: Number(energyPerKg.toFixed(0)),
        pODBelow20: cfg.medium === 'fen22' && cfg.rpm < 118 ? 52.3 : (minOD < 25 ? 28.0 : 0.0)
      },
      downstream,
      alarms,
      bottlenecks,
      cellProducts,
      structuralEnvelope,
      scaleUp
    };
  }

  // Operações Unitárias do Downstream (PFD-AC-001 + Agudelo-Arenas 2024)
  function computeDownstream(cfg, peakPt, maxX) {
    const rawMass = peakPt.massAC_kg; // kg AC no caldo fermentado (Corrente 6)
    const volHarvest = peakPt.V;      // m³

    // 1. Resfriamento (E-401: 24 -> 10 °C) & Pulmão (T-401)
    const effCool = 0.985;
    const mAfterCool = rawMass * effCool;

    // 2. Centrifugação (C-401): viscosidade elevada reduz ligeiramente a recuperação por arraste na torta
    const viscPenalty = Math.min(0.06, Math.max(0, (peakPt.muAp - 100) / 8000));
    const effCentrifuge = 0.96 - viscPenalty;
    const mClarified = mAfterCool * effCentrifuge;
    const biomassCakeKg = peakPt.X * volHarvest * 1.15; // kg massa seca+úmida separada (Corrente 8)

    // 3. Acidificação (T-501: pH 2,0, H2SO4 3 M)
    const effAcid = 0.97;
    const mAcidified = mClarified * effAcid;

    // 4. Extração L-L (EX-401/D-501) OU Adsorção Amberlite IRA 400
    let effCapture = 0.5714;
    let routeLabel = 'Extração L-L Dupla (Acetato de Etila)';
    let solventM3 = volHarvest * cfg.solventRatio * 1.8;
    let captureNote = 'Agudelo-Arenas (2024): pH 2,0; 10 °C → 57,14 ± 0,19%';

    // Penalidade por pH/Temp fora de pH 2,0 e 10 °C
    const phFactor = Math.max(0.38, 1.0 - 0.12 * Math.abs(cfg.extractionPH - 2.0));
    const tempFactor = Math.max(0.75, 1.0 - 0.015 * Math.max(0, cfg.extractionTemp - 10.0));

    if (cfg.downstreamRoute === 'll_single') {
      effCapture = 0.4909 * phFactor * tempFactor;
      routeLabel = 'Extração L-L Simples (Acetato de Etila)';
      solventM3 = volHarvest * cfg.solventRatio;
      captureNote = 'Agudelo-Arenas (2024): pH 2,0; 10 °C → 49,09 ± 0,23%';
    } else if (cfg.downstreamRoute === 'll_double') {
      effCapture = 0.5714 * phFactor * tempFactor;
      routeLabel = 'Extração L-L Dupla (Acetato de Etila)';
      solventM3 = volHarvest * cfg.solventRatio * 1.75;
      captureNote = 'Agudelo-Arenas (2024): pH 2,0; 10 °C → 57,14 ± 0,19%';
    } else if (cfg.downstreamRoute === 'll_multistage') {
      effCapture = 0.78 * phFactor * tempFactor;
      routeLabel = 'Extração L-L Multiestágio (Razão > 2)';
      solventM3 = volHarvest * 2.2;
      captureNote = 'Alta razão solvente (>2): até ~80% rec., maior carga no EV-501';
    } else if (cfg.downstreamRoute === 'amberlite') {
      // Adsorção 47,7% × dessorção NaCl 10% (competição iônica Cl⁻/PO₄³⁻)
      effCapture = 0.477 * 0.72;
      routeLabel = 'Adsorção em Resina Amberlite IRA 400 (Alternativa)';
      solventM3 = 0.0;
      captureNote = 'Adsorção 47,7% (10 °C, 50 min); perdas na dessorção com NaCl 10%';
    }
    const mExtracted = mAcidified * effCapture;

    // 5. Evaporação a vácuo & Reciclo de Solvente (EV-501 + E-501)
    const effEvap = cfg.downstreamRoute === 'amberlite' ? 0.94 : 0.95;
    const solventRecycledM3 = solventM3 * 0.92;
    const mConcentrated = mExtracted * effEvap;

    // 6. Conversão Sal K⁺ (T-502, 2-etil-hexanoato de K⁺) + Cristalização (CR-501)
    // Conversão estequiométrica: MW Clavulanato K⁺ (237,25) / MW AC (199,16) = 1,191
    const effConvCryst = 0.88;
    const mCrystalsK = mConcentrated * effConvCryst * 1.191;

    // 7. Filtração Nutsche + Lavagem (F-501) & Secagem a Vácuo (DR-501)
    const effFiltDry = 0.95;
    const finalClavK_kg = mCrystalsK * effFiltDry;
    const overallRecoveryPct = rawMass > 0.01 ? ((mConcentrated * effConvCryst * effFiltDry) / rawMass) * 100 : 0;

    return {
      routeLabel,
      captureNote,
      rawMassKg: Number(rawMass.toFixed(2)),
      finalClavK_kg: Number(finalClavK_kg.toFixed(2)),
      overallRecoveryPct: Number(overallRecoveryPct.toFixed(1)),
      biomassCakeKg: Number(biomassCakeKg.toFixed(0)),
      solventM3: Number(solventM3.toFixed(1)),
      solventRecycledM3: Number(solventRecycledM3.toFixed(1)),
      steps: [
        { tag: 'R-301', name: 'Caldo Fermentado (Corr. 6)', massKg: Number(rawMass.toFixed(2)), pct: 100 },
        { tag: 'T-401', name: 'Resfriado 10 °C (Corr. 7)', massKg: Number(mAfterCool.toFixed(2)), pct: Number((effCool * 100).toFixed(1)) },
        { tag: 'C-401', name: 'Clarificado (Corr. 9)', massKg: Number(mClarified.toFixed(2)), pct: Number(((mClarified / Math.max(0.01, rawMass)) * 100).toFixed(1)) },
        { tag: 'T-501', name: 'Acidificado pH 2 (Corr. 10)', massKg: Number(mAcidified.toFixed(2)), pct: Number(((mAcidified / Math.max(0.01, rawMass)) * 100).toFixed(1)) },
        { tag: 'EX-401', name: 'Captura AC (Corr. 12)', massKg: Number(mExtracted.toFixed(2)), pct: Number(((mExtracted / Math.max(0.01, rawMass)) * 100).toFixed(1)) },
        { tag: 'EV-501', name: 'Concentrado Vácuo', massKg: Number(mConcentrated.toFixed(2)), pct: Number(((mConcentrated / Math.max(0.01, rawMass)) * 100).toFixed(1)) },
        { tag: 'TK-501', name: 'Clavulanato K⁺ Seco (Corr. 18)', massKg: Number(finalClavK_kg.toFixed(2)), pct: Number(overallRecoveryPct.toFixed(1)) }
      ]
    };
  }

  // Alarmes reais de engenharia (Seções 5, 7 e 8) diferenciados de alertas informativos (Seção 10)
  function computeEngineeringAlarms(cfg, m) {
    const alarms = [];
    const G = REACTOR_GEOM;
    const peakT = m.peakPt ? m.peakPt.t.toFixed(1) : '96.0';

    if (m.minOD < 20.0) {
      alarms.push({
        level: 'critical',
        category: 'MODELO',
        tag: 'DO-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-DO',
        title: `DO abaixo do limite (${m.minOD.toFixed(1)}% < 20%)`,
        detail: `Limitação real calculada de transferência de O₂ compromete crescimento e a enzima cas2 (clavaminato sintase).`
      });
    } else if (m.minOD < 25.0) {
      alarms.push({
        level: 'high',
        category: 'MODELO',
        tag: 'DO-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-DO',
        title: `DO próximo ao limite crítico (OD mín ${m.minOD.toFixed(1)}%)`,
        detail: `Margem de kLa = ${m.minKlaMargin.toFixed(2)}×. No meio FEN22, P(OD < 20%) = 52,3% na propagação Monte Carlo.`
      });
    }

    if (m.maxQSpec > G.q_coil_max) {
      const ratio = (m.maxQSpec / G.q_coil_max).toFixed(1);
      alarms.push({
        level: m.maxQSpec > 6.0 ? 'critical' : 'high',
        category: 'MODELO',
        tag: 'TIC-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-THERM',
        title: `Carga térmica elevada: ${m.maxQSpec.toFixed(2)} kW/m³ (${ratio}× serpentina)`,
        detail: `Calor total de ${m.maxQTotal.toFixed(0)} kW excede a remoção típica de serpentina interna (1–3 kW/m³). Exige camisa + trocador externo.`
      });
    }

    if (m.maxMuAp > G.mu_ap_calib_max) {
      alarms.push({
        level: m.maxMuAp > 300 ? 'high' : 'medium',
        category: 'MODELO',
        tag: 'VIS-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-RHEO',
        title: `Viscosidade aparente elevada (${m.maxMuAp.toFixed(0)} mPa·s)`,
        detail: `Acima do envelope calibrado de 14,5 mPa·s (${(m.maxMuAp / 14.5).toFixed(0)}×). Requer curva reológica experimental em 12–35 g/L.`
      });
    }

    if (m.maxTorque > G.torque_limit) {
      alarms.push({
        level: 'critical',
        category: 'MODELO',
        tag: 'M-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-TORQ',
        title: `Sobrecarga de torque: ${m.maxTorque.toFixed(2)} kN·m (> 9,15 kN·m)`,
        detail: `Potência não aerada de ${m.maxP0.toFixed(1)} kW excede acionamento de 105,4 kW. Necessária reespecificação eletromecânica.`
      });
    } else if (m.maxTorque > 8.6) {
      alarms.push({
        level: 'medium',
        category: 'MODELO',
        tag: 'M-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-TORQ',
        title: `Margem de torque reduzida (${(((G.torque_limit - m.maxTorque) / G.torque_limit) * 100).toFixed(1)}%)`,
        detail: `Operação próxima ao limite nominal (110 rpm). Sem folga convencional de 10% para transitórios.`
      });
    }

    if (cfg.rpm < G.N_flood_ref * Math.pow(cfg.vvm / 0.50, 1 / 3)) {
      alarms.push({
        level: 'critical',
        category: 'MODELO',
        tag: 'FIC-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-FLOOD',
        title: `Inundação do impelidor (< ${G.N_flood_ref.toFixed(1)} rpm)`,
        detail: `Abaixo do critério de antialagamento: dispersão de bolhas colapsa e kLa cai drasticamente.`
      });
    }

    if (Math.abs(cfg.pH - 6.9) > 0.32) {
      alarms.push({
        level: Math.abs(cfg.pH - 6.9) > 0.5 ? 'high' : 'medium',
        category: 'MODELO',
        tag: 'AIC-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-PH',
        title: `pH fora da faixa ótima (pH ${cfg.pH.toFixed(2)} vs 6,90 ± 0,30)`,
        detail: `Desvio de pH reduz taxa específica de crescimento e acelera degradação hidrolítica extracelular (k_dP) do ácido clavulânico.`
      });
    }

    if (cfg.tempProd > 24.5 || cfg.tempProd < 23.0 || m.maxImpG > 40) {
      alarms.push({
        level: cfg.tempProd > 25.5 ? 'high' : 'medium',
        category: 'MODELO',
        tag: 'TIC-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-TEMP',
        title: `Temperatura fora da referência (${cfg.tempProd.toFixed(1)} °C | Imp. G: ${m.maxImpG.toFixed(1)} mg/L)`,
        detail: `Referência de produção é 24,0 °C (FEN22). Temperaturas superiores aceleram termólise do AC e formação de Substância G.`
      });
    }

    if (m.maxVtip > G.vtip_bench_max) {
      alarms.push({
        level: 'medium',
        category: 'MODELO',
        tag: 'M-301',
        timeRef: `t = ${peakT} h`,
        code: 'ALM-SHEAR',
        title: `Cisalhamento / v_tip fora da faixa de bancada (${m.maxVtip.toFixed(2)} m/s > 4,19 m/s)`,
        detail: `Velocidade de ponta ${(m.maxVtip / G.vtip_bench_max).toFixed(2)}× acima da bancada (1000 rpm, 5,1 L).`
      });
    }

    // Alerta meramente informativo de escopo e incerteza (Seções 5 e 10)
    alarms.push({
      level: 'info',
      category: 'INFORMATIVO',
      tag: 'ESCOPO-60M3',
      timeRef: 'Escopo do Modelo',
      code: 'INFO-UNCERT',
      title: cfg.medium === 'ribeiro'
        ? 'Escopo: Modelo Preliminar Fed-Batch (Ref. ~577 mg/L @ 99h · ~20 kg)'
        : 'Escopo: Extrapolação Industrial FEN22 (41,92 m³ úteis / 60 m³ geom.)',
      detail: 'Resultado simulado sujeito a incertezas paramétricas (4×) e estruturais (5×); não representa dado experimental validado em 60 m³.'
    });

    return alarms;
  }

  // Detector Automático de Gargalos Celulares e de Processo (Aba 3)
  function computeBottlenecks(cfg, gen, peakPt, m) {
    const list = [];

    // 1. Gargalo de Liberação por Cisalhamento φ(γ̇)
    const releaseRetention = (1.0 - m.avgPhi) * 100;
    list.push({
      id: 'shear_release',
      category: 'Transporte / Processo',
      name: 'Retenção Intracelular por Baixo Cisalhamento φ(γ̇)',
      severity: Math.min(98, Math.round(releaseRetention)),
      status: m.avgPhi < 0.22 ? 'CRÍTICO' : (m.avgPhi < 0.35 ? 'MODERADO' : 'CONTROLADO'),
      detail: `Apenas ${(m.avgPhi * 100).toFixed(1)}% do AC intracelular é liberado (γ̇ = ${peakPt.gammaDot} s⁻¹ vs Kγ = ${cfg.Kgamma} s⁻¹); o restante sofre degradação kdi = ${cfg.kdi} h⁻¹.`,
      actionLabel: 'Subir rotação para 110 rpm (limite torque)',
      actionPatch: { rpm: 110.0, controlMode: 'fixed' }
    });

    // 2. Gargalo Metabólico: Desvio para Cefamicina C (lat)
    const cephLossPct = Math.round((gen.cephDrain / (1 + gen.cephDrain + gen.clav5SDrain)) * 100 * 2.5);
    list.push({
      id: 'ceph_competition',
      category: 'DNA / Via Competidora',
      name: 'Desvio de Precursores para Cefamicina C (gene lat)',
      severity: Math.min(95, Math.max(5, cephLossPct)),
      status: cfg.genes.lat > 0.7 ? 'ALTO' : (cfg.genes.lat > 0.2 ? 'MODERADO' : 'ELIMINADO'),
      detail: `Gene lat ativo (${cfg.genes.lat.toFixed(1)}×) gera ${m.maxCephC.toFixed(0)} mg/L de Cefamicina C competindo pelo pool de aminoácidos e carbono.`,
      actionLabel: 'Knockout Δlat (silenciar Cefamicina C)',
      actionPatch: { genes: Object.assign({}, cfg.genes, { lat: 0.0 }) }
    });

    // 3. Gargalo Enzimático: cas2 + Oxigênio Dissolvido
    const o2Bottleneck = Math.round(Math.max(10, (1 - peakPt.fO2_cas2) * 100 + (m.minOD < 25 ? 45 : 0) + (cfg.genes.cas2 < 1.0 ? 35 : 0)));
    list.push({
      id: 'cas2_o2',
      category: 'Enzimático / O₂',
      name: 'Atividade de Clavaminato Sintase (cas2) & O₂',
      severity: Math.min(98, o2Bottleneck),
      status: o2Bottleneck > 55 ? 'CRÍTICO' : (o2Bottleneck > 30 ? 'MODERADO' : 'OTIMIZADO'),
      detail: `cas2 (${cfg.genes.cas2.toFixed(1)}×) requer O₂ molecular; OD mín = ${m.minOD.toFixed(1)}%, saturação enzimática = ${(peakPt.fO2_cas2 * 100).toFixed(0)}%.`,
      actionLabel: 'Superexpressar cas2 (2,0×) + Aeração 0,70 vvm',
      actionPatch: { vvm: 0.70, genes: Object.assign({}, cfg.genes, { cas2: 2.0 }) }
    });

    // 4. Gargalo Regulatório: claR vs Clavamas 5S (cvm)
    const claRSev = Math.round(Math.min(95, Math.max(8, (1.8 / Math.max(0.3, cfg.genes.claR)) * 28 + cfg.genes.cvm * 22)));
    list.push({
      id: 'clar_branch',
      category: 'Regulação Transcricional',
      name: 'Bifurcação Clavaminato: claR vs Clavamas 5S (cvm)',
      severity: claRSev,
      status: claRSev > 60 ? 'ALTO' : (claRSev > 35 ? 'MODERADO' : 'OTIMIZADO'),
      detail: `claR = ${cfg.genes.claR.toFixed(1)}× e cvm = ${cfg.genes.cvm.toFixed(1)}× resultam em ${m.maxClav5S.toFixed(0)} mg/L de Clavamas 5S improdutivas.`,
      actionLabel: 'Superexpressar claR (2,5×) + Δcvm',
      actionPatch: { genes: Object.assign({}, cfg.genes, { claR: 2.5, cvm: 0.1 }) }
    });

    // 5. Gargalo Térmico / Pureza (Substância G)
    const thermSev = Math.min(99, Math.round((m.maxQSpec / 3.0) * 28 + (cfg.tempProd > 24.0 ? 25 : 0)));
    list.push({
      id: 'thermal_impg',
      category: 'Térmico / Qualidade',
      name: 'Remoção Térmica (Q/V) & Impureza Substância G',
      severity: thermSev,
      status: m.maxQSpec > 6.0 ? 'CRÍTICO' : (m.maxQSpec > 3.0 ? 'ALTO' : 'CONTROLADO'),
      detail: `Carga térmica de ${m.maxQSpec.toFixed(2)} kW/m³ (típico 1–3) e Impureza G = ${m.maxImpG.toFixed(1)} mg/L (T_prod = ${cfg.tempProd} °C).`,
      actionLabel: 'Ajustar T_prod para 24 °C (receita FEN22)',
      actionPatch: { tempInit: 26.0, tempProd: 24.0 }
    });

    list.sort((a, b) => b.severity - a.severity);
    return list;
  }

  // Comparador de Scale-Up: 5,1 L (RIB21) → 50 L (FEN21) → 60 m³ (R-301)
  function computeScaleUp(cfg, peakPt) {
    return [
      {
        scale: 'Bancada (RIB21 / CER12)',
        volume: '5,1 L (3,5 L útil)',
        Dt: '0,16 m',
        Di: '0,08 m (2× Rushton)',
        N: '600 – 1000 rpm',
        PV: '3.400 – 15.539 W/m³',
        vtip: '2,51 – 4,19 m/s',
        gamma: '474 – 2.148 s⁻¹',
        kLa: '96 – 246 h⁻¹ (medido)',
        tMix: '2 – 4 s',
        status: 'Sem dano observado; calibração cinética'
      },
      {
        scale: 'Piloto (FEN21)',
        volume: '50 L (35 L útil)',
        Dt: '0,317 m',
        Di: '0,106 m (2× 6 pás)',
        N: '300 – 800 rpm',
        PV: '211 – 3.900 W/m³',
        vtip: '1,66 – 4,43 m/s',
        gamma: '180 – 950 s⁻¹',
        kLa: '110 – 280 h⁻¹ (reconst.)',
        tMix: '5 – 9 s',
        status: 'OD > 20%; 1.310 mg/L ATCC 27064'
      },
      {
        scale: 'Industrial (R-301 Atual)',
        volume: `60 m³ (${peakPt.V} m³ atual)`,
        Dt: '2,84 m',
        Di: '1,007 m (3× Rushton)',
        N: `${peakPt.N} rpm`,
        PV: `${peakPt.PV} W/m³`,
        vtip: `${peakPt.vtip} m/s`,
        gamma: `${peakPt.gammaDot} s⁻¹`,
        kLa: `${peakPt.kLa} h⁻¹ (${cfg.klaModel})`,
        tMix: `${peakPt.t_mix} s`,
        status: peakPt.torque > 9.15 ? 'Acima do torque (novo acionamento)' : 'Operável na janela de torque'
      }
    ];
  }

  // Exportação CSV real da simulação (para Blender / Python / Análise)
  function exportCSV(simResult) {
    const cols = [
      'Tempo_h', 'Volume_m3', 'Vazao_Alim_m3h', 'Biomassa_X_gL', 'mu_h1',
      'Glicerol_SG_gL', 'CarbonoComplexo_SC_gL', 'Fosfato_P_gL',
      'OD_pct', 'OUR_mmolLh', 'kLa_h1', 'AC_Intracelular_Pi_mgL',
      'AC_Extracelular_Pe_mgL', 'Massa_AC_kg', 'CefamicinaC_mgL',
      'Clavamas5S_mgL', 'ImpurezaG_mgL', 'Cisalhamento_gamma_s1',
      'Viscosidade_muap_mPas', 'Rotacao_N_rpm', 'Potencia_Aerada_Pg_kW',
      'Torque_P0_kNm', 'Carga_Termica_kWm3', 'Temperatura_C'
    ];
    const lines = [cols.join(',')];
    for (const r of simResult.series) {
      lines.push([
        r.t, r.V, r.F, r.X, r.mu,
        r.SG, r.SC, r.P,
        r.OD, r.OUR, r.kLa, r.Pi,
        r.Pe, r.massAC_kg, r.CephC,
        r.Clav5S, r.ImpG, r.gammaDot,
        r.muAp, r.N, r.Pg,
        r.torque, r.Q_spec, r.tempC
      ].join(','));
    }
    return lines.join('\n');
  }

  BioSim.REACTOR_GEOM = REACTOR_GEOM;
  BioSim.MEDIA_PRESETS = MEDIA_PRESETS;
  BioSim.KLA_CORRELATIONS = KLA_CORRELATIONS;
  BioSim.STRATEGIES = STRATEGIES;
  BioSim.STRAIN_PRESETS = STRAIN_PRESETS;
  BioSim.SCENARIO_PRESETS = SCENARIO_PRESETS;
  BioSim.createDefaultConfig = createDefaultConfig;
  BioSim.computeHydrodynamics = computeHydrodynamics;
  BioSim.runSimulation = runSimulation;
  BioSim.exportCSV = exportCSV;
})(window);
