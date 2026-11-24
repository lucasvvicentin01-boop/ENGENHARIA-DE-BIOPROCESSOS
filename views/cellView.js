/* ============================================================================
 * CLAVIS Digital Twin — Módulo 03: Controlador da Célula S. clavuligerus
 * Integra o modelo 3D Three.js (Cell3D), 9 Indicadores Celulares com Sparklines,
 * Cluster Biossintético pSCL4, Diagrama de Metabolismo e Biossíntese (Pi / Pe),
 * Produção de Metabólitos, 5 Camadas 3D, Evolução Temporal Sincronizada,
 * Parâmetros Cinéticos acoplados às EDOs e Diagnóstico do Estado Celular.
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});

  // Catálogo científico dos genes do cluster biossintético de Ácido Clavulânico (pSCL4)
  const CLUSTER_GENES = {
    ceaS2: {
      key: 'ceaS2',
      modelKey: 'ceaS2',
      title: 'ceaS2 — Carboxietilarginina Sintase',
      category: 'Síntese de Precursores (Operon Precoce)',
      role: 'Condensa D-gliceraldeído-3-fosfato (G3P, derivado do glicerol) com L-arginina (dependente de ThDP) formando N²-(2-carboxietil)-L-arginina (CEA).',
      effect: 'Primeiro passo comprometido da via; sua superexpressão (OE) amplia a entrada de carbono para o pool biossintético.',
      modeled: true
    },
    bls2: {
      key: 'bls2',
      modelKey: 'ceaS2',
      title: 'bls2 — β-Lactama Sintetase (Representação Conceitual)',
      category: 'Fechamento do Anel β-Lactâmico (Operon Precoce)',
      role: 'Converte CEA em desoxiguanidinoproclavaminato com consumo de ATP (formação do anel monocíclico β-lactâmico).',
      effect: 'Co-transcrito no operon precoce junto a ceaS2; agrupado no fator de entrada de precursores do modelo matemático.',
      modeled: true
    },
    pah2: {
      key: 'pah2',
      modelKey: 'ceaS2',
      title: 'pah2 — Proclavaminato Amidinohidrolase (Conceitual)',
      category: 'Síntese de Precursores (Operon Precoce)',
      role: 'Hidrolisa o grupamento guanidino liberando ácido proclavâmico para atuação da clavaminato sintase (cas2).',
      effect: 'Etapa intermediária representada conceitualmente e acoplada ao fluxo do operon precoce (ceaS2).',
      modeled: true
    },
    cas2: {
      key: 'cas2',
      modelKey: 'cas2',
      title: 'cas2 — Clavaminato Sintase (Oxigenase Fe²⁺/α-KG)',
      category: 'Montagem / Oxidação bicíclica O₂-dependente',
      role: 'Catalisa duas etapas oxidativas (hidroxilação e ciclização oxidativa do anel oxazolidínico) formando ácido clavâmico.',
      effect: 'Enzima estritamente dependente de O₂ dissolvido; sensível à queda de DO (< 20%) no biorreator STR.',
      modeled: true
    },
    lat: {
      key: 'lat',
      modelKey: 'lat',
      title: 'lat — Lisina ε-Aminotransferase (Via Competidora)',
      category: 'Via Competidora · Biossíntese de Cefamicina C',
      role: 'Inicia a biossíntese de Cefamicina C no supercluster pSCL4, drenando carbono e energia do metabolismo secundário.',
      effect: 'O knockout (Δlat = 0×) elimina a via competidora de Cefamicina C e redireciona fluxo para Ácido Clavulânico.',
      modeled: true
    },
    cvm: {
      key: 'cvm',
      modelKey: 'cvm',
      title: 'cvm (cvm1/cvm5) — Via Paralela de Clavamas 5S',
      category: 'Via Competidora · Ramificação do Ácido Clavâmico',
      role: 'Desvia o intermediário ácido clavâmico para a síntese de clavamas 5S sem atividade inibidora de β-lactamase.',
      effect: 'A atenuação/knockout (Δcvm) reduz a perda de clavaminato e eleva a seletividade para Ácido Clavulânico (3R,5R).',
      modeled: true
    },
    ccaR: {
      key: 'ccaR',
      modelKey: 'ccaR',
      title: 'ccaR — Regulador Global do Supercluster',
      category: 'Regulação Transcricional Superior',
      role: 'Proteína SARP que ativa a transcrição tanto do operon precoce do AC quanto do regulador tardio claR (e também da via de cefamicina).',
      effect: 'Superexpressão (OE) eleva globalmente a taxa de biossíntese r_bio; maior ganho quando combinada com Δlat.',
      modeled: true
    },
    claR: {
      key: 'claR',
      modelKey: 'claR',
      title: 'claR — Regulador Transcricional Tardio Específico de AC',
      category: 'Regulação Transcricional Tardia (Conversão Final)',
      role: 'Ativa seletivamente os passos tardios (oppA2, cyp, fd, cad/claD) que invertem a estereoquímica (3S,5S → 3R,5R) e reduzem clavaminato a Ácido Clavulânico.',
      effect: 'Principal alvo de engenharia metabólica: direciona o pool de clavaminato exclusivamente para AC contra clavamas 5S.',
      modeled: true
    }
  };

  // Descrições científicas das 9 estruturas anatômicas e metabólicas 3D
  const STRUCTURE_DESCRIPTIONS = {
    mycelium: {
      title: 'Micélio (Filamentos Ramificados de S. clavuligerus)',
      desc: 'Actinobactéria filamentosa Gram-positiva que cresce por extensão apical e ramificação lateral de hifas, elevando a viscosidade aparente (μ_app) do caldo.'
    },
    hypha: {
      title: 'Hifa Vegetativa (Morfologia Submersa no STR)',
      desc: 'Compartimento tubular multinucleado onde ocorrem o metabolismo primário de glicerol/aminoácidos e a biossíntese secundária de β-lactâmicos.'
    },
    wall: {
      title: 'Parede Celular (Peptidoglicano Gram-Positivo)',
      desc: 'Camada estrutural externa espessa de peptidoglicano reticulado. O cisalhamento hidrodinâmico (γ̇) no biorreator influencia a permeabilidade e liberação φ(γ̇).'
    },
    membrane: {
      title: 'Membrana Plasmática (Bicamada Lipídica)',
      desc: 'Fronteira seletiva entre o pool intracelular de ácido clavulânico (Pi) e o caldo extracelular (Pe), sede do transporte de glicerol, L-arginina e O₂.'
    },
    cytoplasm: {
      title: 'Citoplasma (Ambiente Intracelular — Pool Pi)',
      desc: 'Meio aquoso intracelular onde o ácido clavulânico recém-sintetizado (r_bio) acumula-se como Pi antes de ser liberado para Pe ou sofrer degradação k_di.'
    },
    ribosomes: {
      title: 'Ribossomos 70S e Complexos Enzimáticos',
      desc: 'Traduzem os transcritos policistrônicos das enzimas biossintéticas (CeaS2, Bls2, Pah2, Cas2, Cad) ativadas pelos reguladores CcaR e ClaR.'
    },
    nucleoid: {
      title: 'Nucleoide (Cromossomo Linear de S. clavuligerus)',
      desc: 'Genoma bacteriano linear (~6,8 Mb) rico em G+C (>70%) que codifica as vias centrais da glicólise, ciclo TCA e biossíntese de L-arginina.'
    },
    cluster: {
      title: 'Cluster de Biossíntese (AC) — Megaplasmídeo pSCL4',
      desc: 'O gênero S. clavuligerus porta o megaplasmídeo linear pSCL4 (~1,8 Mb) e a região cromossomal/paráloga contendo o supercluster de ácido clavulânico e cefamicina C.'
    },
    release: {
      title: 'Liberação Extracelular de Ácido Clavulânico (Pi → Pe)',
      desc: 'Governada no modelo matemático por r_lib = k_di·(γ̇/K_γ)·Pi, onde a fração liberada φ(γ̇) = γ̇/(γ̇ + K_γ) cresce com o cisalhamento médio do biorreator.'
    }
  };

  const CellView = {
    selectedGene: 'claR',
    animTime: 0,
    initialized: false,

    init(container, onConfigChange) {
      this.container = container;
      this.onConfigChange = onConfigChange;
      if (this.initialized || !container) return;
      this.initialized = true;

      // 1. Inicializar a visualização microscópica 3D Three.js
      const wrap3d = container.querySelector('#cell-canvas-wrap');
      if (BioSim.Cell3D && BioSim.Cell3D.available && wrap3d) {
        BioSim.Cell3D.init(wrap3d);
      }

      // 2. Seletor de Cenário Genético no topo (ATCC 27064, Δlat + claR↑, FEN22 Industrial)
      const strainSel = container.querySelector('#cell-strain-select');
      if (strainSel) {
        strainSel.addEventListener('change', () => {
          const sid = strainSel.value;
          const preset = BioSim.STRAIN_PRESETS[sid];
          if (!preset) return;
          this.onConfigChange({
            strainPreset: sid,
            strainMultiplier: preset.strainMultiplier,
            genes: Object.assign({}, preset.genes)
          });
        });
      }

      // 3. Controles de transporte temporal sincronizados ao biorreator (Seção 12)
      const btnPlay = container.querySelector('#cell-btn-play');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => {
          const mainPlay = document.getElementById('btn-play-toggle');
          if (mainPlay) mainPlay.click();
        });
      }
      const btnPeak = container.querySelector('#cell-btn-peak');
      if (btnPeak) {
        btnPeak.addEventListener('click', () => {
          const mainPeak = document.getElementById('btn-jump-peak');
          if (mainPeak) mainPeak.click();
        });
      }
      const speedSel = container.querySelector('#cell-speed-select');
      if (speedSel) {
        speedSel.addEventListener('change', () => {
          if (BioSim.App) {
            BioSim.App.speed = parseFloat(speedSel.value) || 4.0;
            const mainSpeed = document.getElementById('playback-speed');
            if (mainSpeed) mainSpeed.value = speedSel.value;
          }
        });
      }

      // 4. Seleção das setas de genes no Cluster Biossintético (Seção 5)
      container.querySelectorAll('[data-gene-select]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectedGene = btn.dataset.geneSelect;
          container.querySelectorAll('[data-gene-select]').forEach(b => b.classList.toggle('active', b === btn));
          if (BioSim.Cell3D && BioSim.Cell3D.focusStructure) {
            BioSim.Cell3D.focusStructure('cluster');
          }
          this.updateGeneInspector(this.lastSim);
        });
      });

      const setSelectedGeneExpr = (val) => {
        if (!this.lastSim) return;
        const meta = CLUSTER_GENES[this.selectedGene] || CLUSTER_GENES.claR;
        const nextGenes = Object.assign({}, this.lastSim.config.genes, { [meta.modelKey]: parseFloat(val) });
        this.onConfigChange({ genes: nextGenes });
      };

      const giSlider = container.querySelector('#gi-slider');
      if (giSlider) {
        giSlider.addEventListener('input', () => setSelectedGeneExpr(giSlider.value));
      }
      const btnKo = container.querySelector('#gi-btn-ko');
      if (btnKo) btnKo.addEventListener('click', () => setSelectedGeneExpr(0.0));
      const btnWt = container.querySelector('#gi-btn-wt');
      if (btnWt) btnWt.addEventListener('click', () => setSelectedGeneExpr(1.0));
      const btnOe = container.querySelector('#gi-btn-oe');
      if (btnOe) btnOe.addEventListener('click', () => setSelectedGeneExpr(2.5));

      // 5. Rótulos Anatômicos 3D e 5 Botões Circulares no Arco Esquerdo da Lente
      container.querySelectorAll('[data-struct-focus]').forEach(lbl => {
        lbl.addEventListener('click', () => {
          const key = lbl.dataset.structFocus;
          container.querySelectorAll('[data-struct-focus]').forEach(b => b.classList.toggle('is-active', b === lbl));
          if (BioSim.Cell3D && BioSim.Cell3D.focusStructure) {
            BioSim.Cell3D.focusStructure(key);
          }
          const info = STRUCTURE_DESCRIPTIONS[key];
          if (info) {
            const tEl = container.querySelector('#csb-title');
            const dEl = container.querySelector('#csb-desc');
            if (tEl) tEl.textContent = info.title;
            if (dEl) dEl.textContent = info.desc;
          }
        });
      });

      container.querySelectorAll('[data-cell-cam]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.cellCam;
          container.querySelectorAll('[data-cell-cam]').forEach(b => b.classList.toggle('active', b === btn));
          if (!BioSim.Cell3D) return;
          if (act === 'reset') {
            BioSim.Cell3D.resetCamera();
            container.querySelectorAll('[data-struct-focus]').forEach(b => b.classList.remove('is-active'));
          } else if (act === 'layers') {
            container.querySelectorAll('[data-cell-layer]').forEach(chk => {
              chk.checked = true;
              BioSim.Cell3D.setLayer(chk.dataset.cellLayer, true);
            });
          } else if (act === 'focus-structure') {
            BioSim.Cell3D.focusStructure('wall');
          } else if (act === 'focus-dna') {
            BioSim.Cell3D.focusStructure('cluster');
          } else if (act === 'focus-release') {
            BioSim.Cell3D.focusStructure('release');
          }
        });
      });

      // 6. Switches das 5 Camadas de Visualização (Seção 10)
      container.querySelectorAll('[data-cell-layer]').forEach(chk => {
        chk.addEventListener('change', () => {
          if (BioSim.Cell3D && BioSim.Cell3D.setLayer) {
            BioSim.Cell3D.setLayer(chk.dataset.cellLayer, chk.checked);
          }
        });
      });

      // 7. Sliders de Parâmetros do Modelo Cinético (Seção 9)
      const bindMathRange = (id, key) => {
        const el = container.querySelector('#' + id);
        if (el) {
          el.addEventListener('input', () => {
            this.onConfigChange({ [key]: parseFloat(el.value) });
          });
        }
      };
      bindMathRange('math-beta', 'beta');
      bindMathRange('math-kdi-slider', 'kdi');
      bindMathRange('math-kgamma', 'Kgamma');
      bindMathRange('math-kdp', 'kdP');
      bindMathRange('math-mumax', 'muMax');

      const bindToggle = (id, key, onVal, offVal) => {
        const el = container.querySelector('#' + id);
        if (el) {
          el.addEventListener('change', () => {
            this.onConfigChange({ [key]: el.checked ? onVal : offVal });
          });
        }
      };
      bindToggle('math-mu-inhib', 'muInhibition', true, false);
      bindToggle('math-fp-active', 'phosphateActive', true, false);
      bindToggle('math-thetag-sat', 'thetaGMode', 'saturated', 'monod');

      // 8. Navegação lateral esquerda CLAVIS
      container.querySelectorAll('[data-cell-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.cellNav;
          if (act === 'simulation') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (act === 'operation' || act === 'settings') {
            const pCard = container.querySelector('#cell-params-card');
            if (pCard) pCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (act === 'results') {
            const bot = container.querySelector('#cell-bottom-section');
            if (bot) bot.scrollIntoView({ behavior: 'smooth' });
          } else if (act === 'alarms') {
            if (BioSim.App && BioSim.App.switchTab) BioSim.App.switchTab('reactor');
          } else if (act === 'reports') {
            if (BioSim.App && BioSim.App.downloadCSV) BioSim.App.downloadCSV();
          }
        });
      });

      this.drawSporesInset();
    },

    updateGeneInspector(sim) {
      if (!sim || !this.container) return;
      const meta = CLUSTER_GENES[this.selectedGene] || CLUSTER_GENES.claR;
      const exprVal = sim.config.genes[meta.modelKey];

      const setTxt = (id, val) => {
        const el = this.container.querySelector('#' + id);
        if (el) el.textContent = val;
      };

      setTxt('gi-name', meta.title);
      setTxt('gi-role', `${meta.role} ${meta.effect}`);

      const badge = this.container.querySelector('#gi-badge');
      if (badge) {
        let tag = `${exprVal.toFixed(1).replace('.', ',')}× WT`;
        if (exprVal === 0) tag = 'KO (0×)';
        else if (exprVal > 1.3) tag = `${exprVal.toFixed(1).replace('.', ',')}× OE`;
        badge.textContent = tag;
        badge.className = 'gene-badge ' + (exprVal === 0 ? 'badge-ko' : (exprVal > 1.3 ? 'badge-oe' : 'badge-wt'));
      }

      const slider = this.container.querySelector('#gi-slider');
      if (slider && String(slider.value) !== String(exprVal)) {
        slider.value = exprVal;
      }
    },

    renderStatic(sim, pt) {
      if (!sim || !pt || !this.container) return;
      this.lastSim = sim;
      this.lastPt = pt;
      const cfg = sim.config;

      const setTxt = (id, val) => {
        const el = this.container.querySelector('#' + id);
        if (el) el.textContent = val;
      };
      const setVal = (id, val) => {
        const el = this.container.querySelector('#' + id);
        if (el && String(el.value) !== String(val)) el.value = val;
      };

      const isPlaying = BioSim.App ? BioSim.App.playing : true;
      setTxt('cell-sync-text', `Sincronizado ao Biorreator (t = ${pt.t.toFixed(1).replace('.', ',')} h)`);
      setTxt('cell-nav-clock', `t = ${pt.t.toFixed(1)} h · R-301 (${pt.V.toFixed(1)} m³)`);
      const playBtn = this.container.querySelector('#cell-btn-play');
      if (playBtn) playBtn.textContent = isPlaying ? '❚❚' : '▶';

      setVal('cell-strain-select', cfg.strainPreset);
      setTxt('cluster-mult-badge', `pSCL4 · ${sim.genetic.acGeneFactor.toFixed(2).replace('.', ',')}×`);

      const realAlarms = sim.alarms ? sim.alarms.filter(a => a.category !== 'INFORMATIVO').length : 0;
      const navBadge = this.container.querySelector('#cell-nav-alarm-badge');
      if (navBadge) {
        navBadge.textContent = String(realAlarms);
        navBadge.style.display = realAlarms > 0 ? 'inline-grid' : 'none';
      }

      // 1. COLUNA ESQUERDA: 9 Indicadores Celulares Sincronizados com o Biorreator (Seções 8 e 12)
      const rlib_mgLh = cfg.kdi * (pt.gammaDot / cfg.Kgamma) * pt.Pi;
      const rlib_gLh = rlib_mgLh / 1000.0;
      const rbio_gLh = pt.rbio / 1000.0;
      const qP_mg_gXh = pt.X > 0.1 ? (pt.rbio / pt.X) : 0;

      setTxt('ci-val-x', `${pt.X.toFixed(2).replace('.', ',')} g·L⁻¹`);
      setTxt('ci-del-x', `Máx ${sim.summary.maxX.toFixed(1)}`);

      setTxt('ci-val-mu', `${pt.mu.toFixed(3).replace('.', ',')} h⁻¹`);
      setTxt('ci-del-mu', `μmax ${cfg.muMax}`);

      setTxt('ci-val-pi', `${(pt.Pi / 1000.0).toFixed(3).replace('.', ',')} g·L⁻¹`);
      setTxt('ci-del-pi', `${pt.Pi.toFixed(0)} mg/L`);

      setTxt('ci-val-pe', `${(pt.Pe / 1000.0).toFixed(3).replace('.', ',')} g·L⁻¹`);
      setTxt('ci-del-pe', `${pt.Pe.toFixed(0)} mg/L`);

      setTxt('ci-val-rbio', `${rbio_gLh.toFixed(3).replace('.', ',')} g·L⁻¹·h⁻¹`);
      setTxt('ci-del-rbio', `${pt.rbio.toFixed(0)} mg/L·h`);

      setTxt('ci-val-rlib', `${rlib_gLh.toFixed(3).replace('.', ',')} g·L⁻¹·h⁻¹`);
      setTxt('ci-del-rlib', `φ = ${(pt.phi * 100).toFixed(1)}%`);

      setTxt('ci-val-gamma', `${pt.gammaDot.toFixed(1).replace('.', ',')} s⁻¹`);
      setTxt('ci-del-gamma', `Kγ ${cfg.Kgamma.toFixed(0)}`);

      setTxt('ci-val-visc', `${pt.muAp.toFixed(1).replace('.', ',')} mPa·s`);
      setTxt('ci-del-visc', `${pt.N} rpm`);

      setTxt('ci-val-prod', `${qP_mg_gXh.toFixed(1).replace('.', ',')} mg·gX⁻¹·h⁻¹`);
      setTxt('ci-del-prod', `β ${cfg.beta.toFixed(1)}`);

      // Sparklines dos 9 indicadores celulares (incluindo série derivada para r_lib e q_P)
      const derivedSeries = sim.series.map(s => ({
        t: s.t,
        rlib: cfg.kdi * (s.gammaDot / cfg.Kgamma) * s.Pi,
        qP: s.X > 0.1 ? (s.rbio / s.X) : 0
      }));

      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-x'), sim.series, 'X', '#10b981', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-mu'), sim.series, 'mu', '#fbbf24', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-pi'), sim.series, 'Pi', '#f97316', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-pe'), sim.series, 'Pe', '#22d3ee', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-rbio'), sim.series, 'rbio', '#38bdf8', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-rlib'), derivedSeries, 'rlib', '#eab308', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-gamma'), sim.series, 'gammaDot', '#14f1d9', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-visc'), sim.series, 'muAp', '#f59e0b', pt.t, 0, null, { showAxes: false });
      BioSim.Charts.drawSparkline(this.container.querySelector('#ci-spark-prod'), derivedSeries, 'qP', '#10b981', pt.t, 0, null, { showAxes: false });

      // 2. COLUNA DIREITA: Cluster Biossintético, Metabolismo/Biossíntese e Produção de Metabólitos
      this.updateGeneInspector(sim);

      setTxt('pw-val-c', `(glicerol: ${pt.SG.toFixed(1)} g/L)`);
      setTxt('pw-val-rbio', `(${pt.rbio.toFixed(0)} mg/L·h)`);
      setTxt('pw-val-pi', `(${pt.Pi.toFixed(0)} mg/L)`);
      setTxt('pw-val-phi', `φ=${(pt.phi * 100).toFixed(0)}%`);
      setTxt('pw-val-pe', `(${pt.Pe.toFixed(0)} mg/L)`);

      // Barras de Produção de Metabólitos (Seção 11)
      const cp = sim.cellProducts;
      const setBar = (fillId, valId, share, mgL, roleTag) => {
        const fillEl = this.container.querySelector('#' + fillId);
        if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(4, share)).toFixed(1)}%`;
        setTxt(valId, `${mgL.toFixed(0)} mg/L (${roleTag})`);
      };
      setBar('mb-fill-ac', 'mb-val-ac', cp.ac_share, pt.Pe, 'Principal');
      setBar('mb-fill-ceph', 'mb-val-ceph', cp.cephC_share, pt.CephC, cfg.genes.lat === 0 ? 'KO Δlat' : 'Secundário');
      setBar('mb-fill-clav', 'mb-val-clav', cp.clav5S_share, pt.Clav5S, cfg.genes.cvm < 0.2 ? 'Atenuado' : 'Secundário');

      // 3. PAINÉIS INFERIORES: Evolução Temporal Sincronizada, Parâmetros do Modelo e Estado Celular
      const syncChart = this.container.querySelector('#cell-chart-sync');
      if (syncChart) {
        BioSim.Charts.drawTimeSeries(syncChart, sim.series, {
          currentTime: pt.t,
          normalizeEach: true,
          lines: [
            { key: 'X', color: '#10b981', width: 2.2 },
            { key: 'Pi', color: '#f59e0b', width: 2.0 },
            { key: 'Pe', color: '#22d3ee', width: 2.4 }
          ]
        });
      }

      // Parâmetros do Modelo (Seção 9)
      setVal('math-beta', cfg.beta);
      setVal('math-kdi-slider', cfg.kdi);
      setVal('math-kgamma', cfg.Kgamma);
      setVal('math-kdp', cfg.kdP);
      setVal('math-mumax', cfg.muMax);

      setTxt('math-beta-val', `${cfg.beta.toFixed(1).replace('.', ',')} mg/g·h`);
      setTxt('math-kdi-val', `${cfg.kdi.toFixed(2).replace('.', ',')} h⁻¹`);
      setTxt('math-kgamma-val', `${cfg.Kgamma.toFixed(0)} s⁻¹`);
      setTxt('math-kdp-val', `${cfg.kdP.toFixed(3).replace('.', ',')} h⁻¹`);
      setTxt('math-mumax-val', `${cfg.muMax.toFixed(3).replace('.', ',')} h⁻¹`);

      const cbMu = this.container.querySelector('#math-mu-inhib');
      if (cbMu) cbMu.checked = !!cfg.muInhibition;
      const cbFp = this.container.querySelector('#math-fp-active');
      if (cbFp) cbFp.checked = !!cfg.phosphateActive;
      const cbTh = this.container.querySelector('#math-thetag-sat');
      if (cbTh) cbTh.checked = cfg.thetaGMode === 'saturated';

      // Estado Celular e Gargalo Prioritário
      setTxt('cs-row-1', pt.rbio > 5 ? `Produção de AC ativa (r_bio = ${pt.rbio.toFixed(0)} mg/L·h)` : 'Biossíntese em fase inicial / adaptação');
      setTxt('cs-row-2', `Liberação extracelular (φ = ${(pt.phi * 100).toFixed(1)}% @ γ̇ = ${pt.gammaDot.toFixed(0)} s⁻¹)`);
      setTxt('cs-row-3', `Crescimento em ${pt.phase.toLowerCase()} (X = ${pt.X.toFixed(1)} g/L)`);
      setTxt('cs-row-4', `Expressão do cluster pSCL4 (${sim.genetic.acGeneFactor.toFixed(2)}× sobre selvagem)`);

      const topBnBox = this.container.querySelector('#cell-top-bottleneck');
      if (topBnBox && sim.bottlenecks && sim.bottlenecks.length) {
        const topBn = sim.bottlenecks[0];
        topBnBox.innerHTML = `
          <div class="ctb-head">
            <span>Gargalo Principal: <strong>${topBn.name}</strong></span>
            <b>${topBn.severity}%</b>
          </div>
          <button type="button" class="bn-fix-btn" id="btn-cell-quickfix" style="width:100%;justify-content:center">
            ⚡ ${topBn.actionLabel}
          </button>
        `;
        const qfBtn = topBnBox.querySelector('#btn-cell-quickfix');
        if (qfBtn) {
          qfBtn.addEventListener('click', () => {
            if (topBn.actionPatch) this.onConfigChange(topBn.actionPatch);
          });
        }
      }
    },

    // Desenha a lente circular menor de Esporos (representação morfológica conceitual no topo direito)
    drawSporesInset() {
      const cv = this.container && this.container.querySelector('#cell-spores-canvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const w = cv.width;
      const h = cv.height;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, w * 0.5);
      bg.addColorStop(0, '#0c2d3e');
      bg.addColorStop(1, '#04101a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Cadeia curva de 4 esporos turquesa 3D (como na imagem de referência)
      const spores = [
        { x: 24, y: 74, r: 15 },
        { x: 46, y: 58, r: 16 },
        { x: 68, y: 44, r: 15 },
        { x: 88, y: 28, r: 13 }
      ];
      spores.forEach(sp => {
        const g = ctx.createRadialGradient(sp.x - 4, sp.y - 4, 2, sp.x, sp.y, sp.r);
        g.addColorStop(0, '#a5f3fc');
        g.addColorStop(0.45, '#14b8a6');
        g.addColorStop(1, '#0f3f4c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    },

    // Atualiza as linhas de chamada SVG conectando os 9 rótulos anatômicos às estruturas 3D
    updateCalloutLinesSVG() {
      const svg = this.container && this.container.querySelector('#cell-callout-svg');
      const wrap = this.container && this.container.querySelector('#cell-canvas-wrap');
      if (!svg || !wrap || !BioSim.Cell3D || !BioSim.Cell3D.getProjectedAnchors) return;

      const proj = BioSim.Cell3D.getProjectedAnchors();
      if (!proj) return;
      const wrapRect = wrap.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${proj.width} ${proj.height}`);

      let html = '';
      wrap.querySelectorAll('[data-struct-focus]').forEach(lbl => {
        const key = lbl.dataset.structFocus;
        const target = proj.points[key];
        if (!target) return;

        const r = lbl.getBoundingClientRect();
        const lx = (r.left - wrapRect.left) + r.width * 0.5;
        const ly = (r.top - wrapRect.top) + r.height * 0.5;
        const isGold = key === 'release';
        const isCyan = key === 'cluster';
        const col = isGold ? '#fbbf24' : (isCyan ? '#22d3ee' : 'rgba(148, 163, 184, 0.72)');

        html += `
          <line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${target.x.toFixed(1)}" y2="${target.y.toFixed(1)}"
            stroke="${col}" stroke-width="1.25" />
          <circle cx="${target.x.toFixed(1)}" cy="${target.y.toFixed(1)}" r="3.2" fill="${col}" />
        `;
      });

      svg.innerHTML = html;
    },

    drawFrame(dtSec, sim, pt) {
      if (!sim || !pt || !this.container) return;
      this.animTime += dtSec;

      if (BioSim.Cell3D && BioSim.Cell3D.available) {
        BioSim.Cell3D.drawFrame(dtSec, sim, pt);
        this.updateCalloutLinesSVG();
      }
    }
  };

  BioSim.CellView = CellView;
})(window);
