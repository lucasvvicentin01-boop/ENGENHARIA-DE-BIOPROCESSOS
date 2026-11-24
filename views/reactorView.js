/* ============================================================================
 * CLAVIS Digital Twin — Módulo 02: Controlador do Biorreator STR – BR-301 (60 m³)
 * Integra o modelo 3D Three.js (Reactor3D), 6 cartões de telemetria com sparklines,
 * instrumentação ISA-5.1 com linhas de chamada dinâmicas, painel de controle acoplado
 * ao motor matemático, 4 camadas fenomenológicas e Galeria Multi-Perspectiva 3D.
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});

  const ReactorView = {
    layers: {
      hydro: true,
      oxygen: true,
      mycelium: true,
      product: true
    },
    chartMode: 'kinetics', // 'kinetics' | 'do_vol' | 'visc_temp' | 'all6'
    showAllAlarms: false,
    animTime: 0,
    initialized: false,

    init(container, onConfigChange) {
      this.container = container;
      this.onConfigChange = onConfigChange;
      if (this.initialized || !container) return;
      this.initialized = true;

      // 1. Inicializar o Biorreator 3D Three.js no palco central
      const wrap3d = container.querySelector('#reactor-canvas-wrap');
      if (BioSim.Reactor3D && BioSim.Reactor3D.available && wrap3d) {
        BioSim.Reactor3D.init(wrap3d);
      }

      // 2. Sincronizar switches das 4 Camadas de Visualização 3D (Card Direito + Galeria)
      container.querySelectorAll('[data-rx-layer]').forEach(inp => {
        inp.addEventListener('change', () => {
          const key = inp.dataset.rxLayer;
          this.layers[key] = inp.checked;
          container.querySelectorAll(`[data-rx-layer="${key}"]`).forEach(el => {
            el.checked = inp.checked;
          });
          if (BioSim.Reactor3D && BioSim.Reactor3D.setLayer) {
            BioSim.Reactor3D.setLayer(key, inp.checked);
          }
        });
      });

      // Toggle do casco 3D na galeria
      const vesselToggle = container.querySelector('[data-gal-toggle="vessel"]');
      if (vesselToggle) {
        vesselToggle.addEventListener('change', () => {
          if (BioSim.Reactor3D && BioSim.Reactor3D.setComponentVisible) {
            BioSim.Reactor3D.setComponentVisible('vesselShell', vesselToggle.checked);
          }
        });
      }

      // 3. Modos de Visualização 3D (Pills do Topo do Palco 3D + Rádios da Galeria + Cards da Galeria)
      const apply3DViewMode = (mode) => {
        if (BioSim.Reactor3D && BioSim.Reactor3D.setViewMode) {
          BioSim.Reactor3D.setViewMode(mode);
        }
        container.querySelectorAll('[data-rx-3dmode]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.rx3dmode === mode);
        });
        container.querySelectorAll('input[name="rx-3d-viewopt"]').forEach(rad => {
          rad.checked = rad.value === mode;
        });
      };

      container.querySelectorAll('[data-rx-3dmode]').forEach(btn => {
        btn.addEventListener('click', () => apply3DViewMode(btn.dataset.rx3dmode));
      });

      container.querySelectorAll('input[name="rx-3d-viewopt"]').forEach(rad => {
        rad.addEventListener('change', () => {
          if (rad.checked) apply3DViewMode(rad.value);
        });
      });

      container.querySelectorAll('[data-persp-select]').forEach(card => {
        card.addEventListener('click', () => {
          const p = card.dataset.perspSelect;
          if (p === 'externa' || p === 'corte') {
            apply3DViewMode(p);
          } else {
            apply3DViewMode('realista');
          }
          const stage = container.querySelector('.reactor-stage-card');
          if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });

      // 4. Checkboxes de Componentes da Visualização Explodida (Imagem 2)
      container.querySelectorAll('[data-rx-comp]').forEach(chk => {
        chk.addEventListener('change', () => {
          const compKey = chk.dataset.rxComp;
          if (BioSim.Reactor3D && BioSim.Reactor3D.setComponentVisible) {
            BioSim.Reactor3D.setComponentVisible(compKey, chk.checked);
          }
        });
      });

      // 5. Dock Inferior de Câmera 3D do Biorreator
      container.querySelectorAll('[data-rx-cam]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.rxCam;
          if (!BioSim.Reactor3D) return;
          if (act === 'reset') {
            BioSim.Reactor3D.autoRotate = false;
            BioSim.Reactor3D.resetCamera();
            apply3DViewMode('realista');
          } else if (act === 'zoom-in') {
            BioSim.Reactor3D.zoom(0.84);
          } else if (act === 'zoom-out') {
            BioSim.Reactor3D.zoom(1.18);
          } else if (act === 'autorotate') {
            BioSim.Reactor3D.autoRotate = !BioSim.Reactor3D.autoRotate;
            btn.classList.toggle('active', BioSim.Reactor3D.autoRotate);
          } else if (act === 'explode') {
            const nextMode = BioSim.Reactor3D.viewMode === 'explodida' ? 'realista' : 'explodida';
            apply3DViewMode(nextMode);
            btn.classList.toggle('active', nextMode === 'explodida');
          } else if (act === 'gallery') {
            const gal = container.querySelector('#rx-multiperspective-gallery');
            if (gal) gal.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });

      const btnToggleGal = container.querySelector('#btn-toggle-3d-gallery');
      if (btnToggleGal) {
        btnToggleGal.addEventListener('click', () => {
          const gal = container.querySelector('#rx-multiperspective-gallery');
          if (gal) gal.scrollIntoView({ behavior: 'smooth' });
        });
      }

      // 6. Controles Temporais no Topo do Biorreator (sincronizados ao relógio global — Seção 11)
      const rxPlay = container.querySelector('#rx-btn-play');
      if (rxPlay) {
        rxPlay.addEventListener('click', () => {
          const mainPlay = document.getElementById('btn-play-toggle');
          if (mainPlay) mainPlay.click();
        });
      }
      const rxRestart = container.querySelector('#rx-btn-restart');
      if (rxRestart) {
        rxRestart.addEventListener('click', () => {
          if (BioSim.App) {
            BioSim.App.currentTime = 0.0;
            BioSim.App.refreshAllStatic();
          }
        });
      }
      const rxPeak = container.querySelector('#rx-btn-peak');
      if (rxPeak) {
        rxPeak.addEventListener('click', () => {
          const mainPeak = document.getElementById('btn-jump-peak');
          if (mainPeak) mainPeak.click();
        });
      }
      const rxSpeed = container.querySelector('#rx-speed-select');
      if (rxSpeed) {
        rxSpeed.addEventListener('change', () => {
          if (BioSim.App) {
            BioSim.App.speed = parseFloat(rxSpeed.value) || 4.0;
            const mainSpeed = document.getElementById('playback-speed');
            if (mainSpeed) mainSpeed.value = rxSpeed.value;
          }
        });
      }

      // 7. Painel de Controle acoplado ao modelo matemático (Seção 8)
      const scenSel = container.querySelector('#ctrl-scenario-quick');
      if (scenSel) {
        scenSel.addEventListener('change', () => {
          const preset = BioSim.SCENARIO_PRESETS && BioSim.SCENARIO_PRESETS[scenSel.value];
          if (preset) {
            const globalSel = document.getElementById('global-preset-select');
            if (globalSel) globalSel.value = scenSel.value;
            this.onConfigChange(preset.patch);
          }
        });
      }

      const bindSelect = (id, key) => {
        const el = container.querySelector('#' + id);
        if (el) el.addEventListener('change', () => this.onConfigChange({ [key]: el.value }));
      };
      bindSelect('ctrl-medium', 'medium');
      bindSelect('ctrl-strategy', 'strategy');
      bindSelect('ctrl-kla', 'klaModel');

      container.querySelectorAll('[data-ctrl-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const m = btn.getAttribute('data-ctrl-mode');
          this.onConfigChange({ controlMode: m === 'manual' ? 'fixed' : m });
          container.querySelectorAll('[data-ctrl-mode]').forEach(b => b.classList.toggle('active', b === btn));
        });
      });

      const bindRange = (id, key) => {
        const el = container.querySelector('#' + id);
        if (el) {
          el.addEventListener('input', () => {
            this.onConfigChange({ [key]: parseFloat(el.value) });
          });
        }
      };
      bindRange('ctrl-rpm', 'rpm');
      bindRange('ctrl-vvm', 'vvm');
      bindRange('ctrl-temp-prod', 'tempProd');
      bindRange('ctrl-ph', 'pH');

      // 8. Abas do Gráfico Multiparamétrico (Seção 10 — todas as 6 variáveis)
      container.querySelectorAll('[data-rx-chart-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.chartMode = btn.dataset.rxChartMode;
          container.querySelectorAll('[data-rx-chart-mode]').forEach(b => b.classList.toggle('active', b === btn));
          this.renderTrendsChart(this.lastSim, this.lastPt);
        });
      });

      // 9. Navegação lateral esquerda CLAVIS e clique nas etapas da Visão do Processo
      container.querySelectorAll('[data-rx-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.rxNav;
          if (act === 'simulation') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (act === 'operation' || act === 'settings') {
            const ctrlCard = container.querySelector('#rx-control-card');
            if (ctrlCard) ctrlCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (act === 'results') {
            const bot = container.querySelector('#rx-bottom-section');
            if (bot) bot.scrollIntoView({ behavior: 'smooth' });
          } else if (act === 'perspectives') {
            const gal = container.querySelector('#rx-multiperspective-gallery');
            if (gal) gal.scrollIntoView({ behavior: 'smooth' });
          } else if (act === 'alarms') {
            const alm = container.querySelector('#rx-alarms-card');
            if (alm) alm.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (act === 'reports') {
            if (BioSim.App && BioSim.App.downloadCSV) BioSim.App.downloadCSV();
          }
        });
      });

      container.querySelectorAll('[data-jump-plant]').forEach(step => {
        step.addEventListener('click', () => {
          const eqId = step.dataset.jumpPlant;
          if (BioSim.App && BioSim.App.switchTab) {
            BioSim.App.switchTab('plant');
            if (BioSim.PlantView && BioSim.PlantView.chooseEquipment) {
              BioSim.PlantView.chooseEquipment(eqId, true);
            }
          }
        });
      });
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

      const isPlaying = BioSim.App ? BioSim.App.playing : true;
      const hasCritAlarm = sim.alarms.some(a => a.category === 'MODELO' && a.level === 'critical');

      // Status e transporte no cabeçalho do Biorreator
      setTxt('rx-top-time', `t = ${pt.t.toFixed(1).replace('.', ',')} h`);
      const rxPlayBtn = this.container.querySelector('#rx-btn-play');
      if (rxPlayBtn) rxPlayBtn.textContent = isPlaying ? '❚❚' : '▶';

      const opPill = this.container.querySelector('#rx-op-pill');
      const opText = this.container.querySelector('#rx-op-text');
      if (opText) {
        opText.textContent = hasCritAlarm ? 'EM ALARME' : (isPlaying ? 'EM OPERAÇÃO' : 'SIMULAÇÃO PAUSADA');
      }
      if (opPill) {
        opPill.classList.toggle('is-paused', !isPlaying && !hasCritAlarm);
        opPill.classList.toggle('is-alarm', hasCritAlarm);
      }

      // Identificação clara do cenário e sua origem (Seção 5)
      const isPrelim = cfg.medium === 'ribeiro' && Math.abs(cfg.beta - 19.65) < 0.5;
      const isRibeiro = cfg.medium === 'ribeiro' && !isPrelim;
      const scenarioShort = isPrelim
        ? 'Modelo Preliminar Fed-Batch (~577 mg/L @ 99h · ~20 kg)'
        : (isRibeiro ? 'Meio Ribeiro RIB21 (Calibração 15 g/L Glicerol)' : 'Fermentação Fed-batch (FEN22 · 41,92 m³)');
      setTxt('rx-scenario-banner', scenarioShort);
      setTxt('gal-scenario-tag', isPrelim ? 'PRELIMINAR' : (isRibeiro ? 'RIB21' : 'FEN22'));

      // 1. COLUNA ESQUERDA: 6 Indicadores com limites, estado operacional e sparklines (Seção 6)
      // pH
      const phDev = Math.abs(pt.pH - 6.9);
      setTxt('rx-val-ph', pt.pH.toFixed(2).replace('.', ','));
      setTxt('rx-state-ph', phDev > 0.32 ? 'DESVIO pH' : 'NOMINAL');
      const stPh = this.container.querySelector('#rx-state-ph');
      if (stPh) stPh.className = `spark-state-badge ${phDev > 0.32 ? 'state-warn' : 'state-ok'}`;

      // Temperatura
      const tempDev = pt.t >= 36 && Math.abs(pt.tempC - 24.0) > 0.6;
      setTxt('rx-val-temp', `${pt.tempC.toFixed(1).replace('.', ',')} °C`);
      setTxt('rx-state-temp', tempDev ? 'FORA REF 24°C' : (pt.t < 36 ? 'CRESC. 26°C' : 'PROD. 24°C'));
      const stTemp = this.container.querySelector('#rx-state-temp');
      if (stTemp) stTemp.className = `spark-state-badge ${tempDev ? 'state-warn' : 'state-ok'}`;

      // Oxigênio Dissolvido (DO)
      setTxt('rx-val-do', `${pt.OD.toFixed(1).replace('.', ',')} %`);
      setTxt('rx-ref-do', `OUR: ${pt.OUR.toFixed(1)} mmol/L·h`);
      setTxt('rx-state-do', pt.OD < 20 ? 'CRÍTICO <20%' : (pt.OD < 28 ? 'ALERTA O₂' : 'NORMAL >20%'));
      const stDo = this.container.querySelector('#rx-state-do');
      if (stDo) stDo.className = `spark-state-badge ${pt.OD < 20 ? 'state-crit' : (pt.OD < 28 ? 'state-warn' : 'state-ok')}`;

      // Biomassa Micelial (X)
      setTxt('rx-val-x', `${pt.X.toFixed(2).replace('.', ',')} g·L⁻¹`);
      setTxt('rx-tol-x', `μ = ${pt.mu.toFixed(3)} h⁻¹`);
      setTxt('rx-ref-x', `Máx: ${sim.summary.maxX.toFixed(1)} g/L`);

      // Ácido Clavulânico Extracelular (Pe)
      const peGL = (pt.Pe / 1000.0).toFixed(3).replace('.', ',');
      setTxt('rx-val-ac', `${peGL} g·L⁻¹`);
      setTxt('rx-tol-ac', `${pt.Pe.toFixed(0)} mg/L`);
      setTxt('rx-ref-ac', `Lote: ${pt.massAC_kg.toFixed(1)} kg`);

      // Viscosidade Aparente (μ_app)
      setTxt('rx-val-visc', `${pt.muAp.toFixed(1).replace('.', ',')} mPa·s`);
      setTxt('rx-tol-visc', `γ̇ ${pt.gammaDot.toFixed(0)} s⁻¹`);
      setTxt('rx-state-visc', pt.muAp > 14.5 ? 'EXTRAPOLADO' : 'CALIBRADO');

      // Desenhar os 6 Sparklines com eixos Y e marcas temporais X (0h, 24h, 48h, 72h, 96h)
      BioSim.Charts.drawSparkline(this.container.querySelector('#rx-spark-ph'), sim.series, 'pH', '#10b981', pt.t, 6.4, 7.5, { showAxes: true, decimals: 2 });
      BioSim.Charts.drawSparkline(this.container.querySelector('#rx-spark-temp'), sim.series, 'tempC', '#a855f7', pt.t, 22.0, 27.5, { showAxes: true, decimals: 1 });
      BioSim.Charts.drawSparkline(this.container.querySelector('#rx-spark-do'), sim.series, 'OD', '#38bdf8', pt.t, 0, 100, { showAxes: true, decimals: 0 });
      BioSim.Charts.drawSparkline(this.container.querySelector('#rx-spark-x'), sim.series, 'X', '#10b981', pt.t, 0, Math.max(12, sim.summary.maxX * 1.08), { showAxes: true, decimals: 1 });
      BioSim.Charts.drawSparkline(this.container.querySelector('#rx-spark-ac'), sim.series, 'Pe', '#f59e0b', pt.t, 0, Math.max(400, sim.summary.peakAC * 1.1) / 1000, { showAxes: true, scale: 0.001, decimals: 2 });
      BioSim.Charts.drawSparkline(this.container.querySelector('#rx-spark-visc'), sim.series, 'muAp', '#22d3ee', pt.t, 0, Math.max(80, sim.summary.maxMuAp * 1.08), { showAxes: true, decimals: 0 });

      // 2. INSTRUMENTAÇÃO DO REATOR (8 Cartões HUD no palco 3D — Seção 7)
      const airM3H = (cfg.vvm * pt.V * 60.0).toFixed(0);
      const volPct = ((pt.V / 60.0) * 100.0).toFixed(1).replace('.', ',');
      setTxt('hud-val-aic', `pH: ${pt.pH.toFixed(2).replace('.', ',')}`);
      setTxt('hud-sub-aic', `Setpoint: ${cfg.pH.toFixed(2).replace('.', ',')} ± 0,05`);

      setTxt('hud-val-fic', `Ar: ${cfg.vvm.toFixed(2).replace('.', ',')} vvm`);
      setTxt('hud-sub-fic', `(${airM3H} m³·h⁻¹ | Fed: ${(pt.F * 1000).toFixed(0)} L/h)`);

      setTxt('hud-val-lic', `Volume: ${pt.V.toFixed(2).replace('.', ',')} m³`);
      setTxt('hud-sub-lic', `(${volPct} % de 60 m³ geom.)`);

      setTxt('hud-val-m301', `Agitador: ${pt.N.toFixed(1).replace('.', ',')} rpm`);
      setTxt('hud-sub-m301', `Torque: ${pt.torque.toFixed(2).replace('.', ',')} / 9,15 kN·m`);

      setTxt('hud-val-tic', `Temp.: ${pt.tempC.toFixed(1).replace('.', ',')} °C`);
      setTxt('hud-sub-tic', `Q/V: ${pt.Q_spec.toFixed(2).replace('.', ',')} kW/m³ (${pt.Q_tot.toFixed(0)} kW)`);

      setTxt('hud-val-do', `DO: ${pt.OD.toFixed(1).replace('.', ',')} %`);
      setTxt('hud-sub-do', `OUR: ${pt.OUR.toFixed(1).replace('.', ',')} mmol·L⁻¹·h⁻¹`);

      setTxt('hud-sub-r301', `(Vu: ${pt.V.toFixed(2).replace('.', ',')} m³ / 41,92 m³ ref.)`);
      setTxt('hud-val-kla', `${pt.kLa.toFixed(0)} h⁻¹`);
      setTxt('hud-sub-kla', `Correlação: ${cfg.klaModel.toUpperCase()} | Margem ${pt.kLaMargin}×`);

      // 3. COLUNA DIREITA: Status do Reator (Seção 5) & Painel de Controle (Seção 8)
      setTxt('rx-stat-batch', isPrelim ? 'PRELIM-AC-009' : (isRibeiro ? 'RIB21-AC-012' : 'FEN22-AC-015'));
      setTxt('rx-stat-phase', pt.phase);
      setTxt('rx-stat-time', `${pt.t.toFixed(1).replace('.', ',')} h / ${cfg.horizonH} h`);
      setTxt('rx-stat-vol', `${pt.V.toFixed(2).replace('.', ',')} m³ (${volPct} %)`);
      setTxt('rx-stat-scenario', isPrelim ? 'Preliminar Fed-Batch (Não validado)' : (isRibeiro ? 'Ribeiro RIB21 (Calibração)' : 'FEN22 (Meio Industrial)'));
      setTxt('rx-stat-mass', `${pt.massAC_kg.toFixed(2)} kg (Pico: ${sim.summary.peakMassKg} kg @ ${sim.summary.peakTimeH}h)`);
      setTxt('rx-stat-torque', `${pt.torque.toFixed(2)} kN·m | Pg ${pt.Pg} kW (P0 ${pt.P0} kW)`);
      setTxt('rx-stat-therm', `${pt.Q_spec.toFixed(2)} kW/m³ (${pt.Q_tot.toFixed(0)} kW)`);
      setTxt('rx-stat-shear', `γ̇ ${pt.gammaDot} s⁻¹ | φ = ${(pt.phi * 100).toFixed(1)}% | vtip ${pt.vtip} m/s`);

      const disclaimerEl = this.container.querySelector('#rx-scenario-disclaimer');
      if (disclaimerEl) {
        if (isPrelim) {
          disclaimerEl.innerHTML = `<strong>Origem · Modelo Preliminar Fed-Batch:</strong> resultado simulado de referência (~577 mg/L em ~99 h, ~20 kg/batelada, V = 26,9→41,9 m³). Possui incertezas relevantes e <u>não deve ser apresentado como resultado experimental validado</u>.`;
        } else if (isRibeiro) {
          disclaimerEl.innerHTML = `<strong>Origem · Calibração RIB21 (Ribeiro):</strong> meio definido com glicerol 15 g/L calibrado em 5,1 L e extrapolado para 60 m³ (distinto do meio complexo FEN22).`;
        } else {
          disclaimerEl.innerHTML = `<strong>Origem · Cenário Industrial FEN22:</strong> meio complexo (3,32 mol C/L, Vu = 41,92 m³). Não misturar com o resultado do modelo preliminar (~577 mg/L @ 99h, ~20 kg).`;
        }
      }

      // Tabela de Setpoints
      setTxt('sp-tbl-ph', cfg.pH.toFixed(2).replace('.', ','));
      setTxt('sp-tbl-temp', `${cfg.tempProd.toFixed(1).replace('.', ',')} °C`);
      setTxt('sp-tbl-do', cfg.controlMode === 'do_cascade' ? '30,0 % (Cascata)' : '≥ 20,0 % (Mín)');
      setTxt('sp-tbl-rpm', `${pt.N.toFixed(1).replace('.', ',')} rpm`);
      setTxt('sp-tbl-vvm', `${cfg.vvm.toFixed(2).replace('.', ',')} vvm`);

      // Sliders & Selects do Painel de Controle
      const setVal = (id, v) => {
        const el = this.container.querySelector('#' + id);
        if (el && String(el.value) !== String(v)) el.value = v;
      };
      setVal('ctrl-medium', cfg.medium);
      setVal('ctrl-strategy', cfg.strategy);
      setVal('ctrl-kla', cfg.klaModel);
      setVal('ctrl-rpm', cfg.rpm);
      setVal('ctrl-vvm', cfg.vvm);
      setVal('ctrl-temp-prod', cfg.tempProd);
      setVal('ctrl-ph', cfg.pH);

      setTxt('ctrl-rpm-val', `${cfg.rpm.toFixed(1)} rpm`);
      setTxt('ctrl-vvm-val', `${cfg.vvm.toFixed(2)} vvm`);
      setTxt('ctrl-temp-prod-val', `${cfg.tempProd.toFixed(1)} °C`);
      setTxt('ctrl-ph-val', cfg.pH.toFixed(2));

      const rpmSlider = this.container.querySelector('#ctrl-rpm');
      if (rpmSlider) rpmSlider.disabled = cfg.controlMode === 'do_cascade';

      // 4. REGIÃO INFERIOR: Fases Fed-Batch, Gráficos Sincronizados (Seção 10) e Alarmes
      setTxt('rx-proc-phase-label', `Fase: ${pt.phase}`);
      const phases = [
        { label: 'Preparação', minT: 0 },
        { label: 'Adaptação', minT: 1 },
        { label: 'Crescimento', minT: 12 },
        { label: 'Fed-Batch', minT: 24 },
        { label: 'Reologia', minT: 55 },
        { label: 'Produção AC', minT: 85 },
        { label: 'Colheita', minT: Math.max(95, sim.summary.peakTimeH - 4) }
      ];
      let activeIdx = 0;
      phases.forEach((ph, idx) => { if (pt.t >= ph.minT) activeIdx = idx; });
      const pipeEl = this.container.querySelector('#rx-phase-pipeline');
      if (pipeEl) {
        pipeEl.innerHTML = phases.map((ph, idx) => `
          <div class="phase-step ${idx < activeIdx ? 'done' : ''} ${idx === activeIdx ? 'current' : ''}">
            <div class="phase-dot">${idx < activeIdx ? '✓' : (idx + 1)}</div>
            <span>${ph.label}</span>
          </div>
        `).join('<div class="phase-conn"></div>');
      }

      this.renderTrendsChart(sim, pt);
      this.renderAlarms(sim);
      this.renderGalleryPerspectives(sim, pt);
    },

    // Gráficos sincronizados das 6 variáveis obrigatórias (Seção 10)
    renderTrendsChart(sim, pt) {
      if (!sim || !pt || !this.container) return;
      const trendCanvas = this.container.querySelector('#rx-chart-trends');
      const legendEl = this.container.querySelector('#rx-trend-legend');
      if (!trendCanvas) return;

      let lines = [];
      let legendHtml = '';

      if (this.chartMode === 'do_vol') {
        lines = [
          { key: 'OD', color: '#38bdf8', width: 2.3, max: 100 },
          { key: 'V', color: '#10b981', width: 2.1, max: 60 },
          { key: 'kLa', color: '#22d3ee', width: 1.7, dashed: true }
        ];
        legendHtml = `
          <span><i style="background:#38bdf8"></i>Oxigênio Dissolvido DO (%)</span>
          <span><i style="background:#10b981"></i>Volume V (m³)</span>
          <span><i style="background:#22d3ee"></i>kLa (h⁻¹)</span>
        `;
      } else if (this.chartMode === 'visc_temp') {
        lines = [
          { key: 'muAp', color: '#22d3ee', width: 2.3 },
          { key: 'tempC', color: '#a855f7', width: 2.1, max: 30 },
          { key: 'Q_spec', color: '#f97316', width: 1.8, dashed: true }
        ];
        legendHtml = `
          <span><i style="background:#22d3ee"></i>Viscosidade μ_app (mPa·s)</span>
          <span><i style="background:#a855f7"></i>Temperatura (°C)</span>
          <span><i style="background:#f97316"></i>Carga Térmica Q/V (kW/m³)</span>
        `;
      } else if (this.chartMode === 'all6') {
        lines = [
          { key: 'X', color: '#10b981', width: 2.0 },
          { key: 'Pe', color: '#f59e0b', width: 2.2 },
          { key: 'OD', color: '#38bdf8', width: 1.8, max: 100 },
          { key: 'tempC', color: '#a855f7', width: 1.6, max: 30 },
          { key: 'V', color: '#14f1d9', width: 1.6, max: 60 },
          { key: 'muAp', color: '#f97316', width: 1.7, dashed: true }
        ];
        legendHtml = `
          <span><i style="background:#10b981"></i>X (g/L)</span>
          <span><i style="background:#f59e0b"></i>AC Pe (mg/L)</span>
          <span><i style="background:#38bdf8"></i>DO (%)</span>
          <span><i style="background:#a855f7"></i>Temp (°C)</span>
          <span><i style="background:#14f1d9"></i>Vol (m³)</span>
          <span><i style="background:#f97316"></i>Visc (mPa·s)</span>
        `;
      } else {
        // Default: Biomassa (X), Pi intracelular, Pe extracelular e DO% (igual à Imagem 1)
        lines = [
          { key: 'X', color: '#10b981', width: 2.2 },
          { key: 'Pi', color: '#f59e0b', width: 1.9 },
          { key: 'Pe', color: '#22d3ee', width: 2.3 },
          { key: 'OD', color: '#38bdf8', width: 1.6, dashed: true, max: 100 }
        ];
        legendHtml = `
          <span><i style="background:#10b981"></i>Biomassa (X)</span>
          <span><i style="background:#f59e0b"></i>Pi (intracelular)</span>
          <span><i style="background:#22d3ee"></i>Pe (extracelular)</span>
          <span><i style="background:#38bdf8"></i>DO (%)</span>
        `;
      }

      if (legendEl) legendEl.innerHTML = legendHtml;
      BioSim.Charts.drawTimeSeries(trendCanvas, sim.series, {
        currentTime: pt.t,
        normalizeEach: true,
        lines
      });
    },

    // Alarmes diferenciando alertas reais do modelo e alertas meramente informativos (Seção 10)
    renderAlarms(sim) {
      const alarmsEl = this.container.querySelector('#rx-alarms-list');
      const countEl = this.container.querySelector('#rx-alarms-count');
      const navBadge = this.container.querySelector('#rx-nav-alarm-badge');

      const realAlarms = sim.alarms.filter(a => a.category !== 'INFORMATIVO');
      const infoAlarms = sim.alarms.filter(a => a.category === 'INFORMATIVO');

      if (countEl) countEl.textContent = `${realAlarms.length} ATIVOS (${infoAlarms.length} INFO)`;
      if (navBadge) {
        navBadge.textContent = String(realAlarms.length);
        navBadge.style.display = realAlarms.length > 0 ? 'inline-grid' : 'none';
      }
      if (!alarmsEl) return;

      const visibleList = this.showAllAlarms ? sim.alarms : [...realAlarms.slice(0, 2), ...infoAlarms.slice(0, 1)];
      const levelLabels = {
        critical: 'CRÍTICO · MODELO',
        high: 'ALTO · MODELO',
        medium: 'MÉDIO · MODELO',
        info: 'INFORMATIVO · ESCOPO'
      };

      alarmsEl.innerHTML = visibleList.map(a => `
        <div class="alarm-item alarm-${a.level}">
          <div class="alarm-head">
            <strong>${a.level === 'info' ? 'ℹ' : '⚠'} ${a.title}</strong>
            <span class="alarm-badge">${levelLabels[a.level] || a.level.toUpperCase()}</span>
          </div>
          <div class="alarm-meta">${a.tag || 'BR-301'} · ${a.timeRef || ''}</div>
          <p>${a.detail}</p>
        </div>
      `).join('') + (sim.alarms.length > 3 ? `
        <button type="button" class="rx-more-alarms-btn" id="btn-rx-toggle-alarms">
          ${this.showAllAlarms ? 'Recolher lista de alarmes ↑' : `VER TODOS OS ALARMES (${sim.alarms.length}) →`}
        </button>
      ` : '');

      const btnMore = alarmsEl.querySelector('#btn-rx-toggle-alarms');
      if (btnMore) {
        btnMore.addEventListener('click', () => {
          this.showAllAlarms = !this.showAllAlarms;
          this.renderAlarms(sim);
        });
      }
    },

    // Atualiza as linhas de chamada SVG conectando os 8 cartões HUD às portas 3D dos sensores (Seção 7)
    updateCalloutLinesSVG() {
      const svg = this.container && this.container.querySelector('#rx-callout-svg');
      const wrap = this.container && this.container.querySelector('#reactor-canvas-wrap');
      if (!svg || !wrap || !BioSim.Reactor3D || !BioSim.Reactor3D.getProjectedSensorCoords) return;

      const proj = BioSim.Reactor3D.getProjectedSensorCoords();
      if (!proj) return;
      const wrapRect = wrap.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${proj.width} ${proj.height}`);

      const colors = {
        'AIC-301': '#10b981',
        'FIC-301': '#22d3ee',
        'LIC-301': '#10b981',
        'M-301':   '#10b981',
        'TIC-301': '#22d3ee',
        'DO-301':  '#10b981',
        'R-301':   '#f59e0b',
        'KLA-301': '#10b981'
      };

      let pathsHtml = '';
      wrap.querySelectorAll('[data-sensor-box]').forEach(box => {
        const code = box.dataset.sensorBox;
        const targetPt = proj.points[code];
        if (!targetPt) return;

        const r = box.getBoundingClientRect();
        const isLeft = box.closest('.rx-hud-left') != null;
        const startX = isLeft ? (r.right - wrapRect.left) : (r.left - wrapRect.left);
        const startY = (r.top - wrapRect.top) + r.height * 0.5;
        const elbowX = isLeft ? startX + 26 : startX - 26;
        const col = colors[code] || '#22d3ee';

        pathsHtml += `
          <polyline points="${startX.toFixed(1)},${startY.toFixed(1)} ${elbowX.toFixed(1)},${startY.toFixed(1)} ${targetPt.x.toFixed(1)},${targetPt.y.toFixed(1)}"
            fill="none" stroke="${col}" stroke-width="1.4" stroke-opacity="0.78" />
          <circle cx="${targetPt.x.toFixed(1)}" cy="${targetPt.y.toFixed(1)}" r="3.4" fill="${col}" />
        `;
      });

      svg.innerHTML = pathsHtml;
    },

    // ========================================================================
    // GALERIA MULTI-PERSPECTIVA 3D & DIAGRAMA EXPLODIDO (IMAGEM 2)
    // ========================================================================
    renderGalleryPerspectives(sim, pt) {
      if (!this.container) return;
      this.container.querySelectorAll('[data-persp-canvas]').forEach(cv => {
        this.drawPerspectiveMiniTank(cv, cv.dataset.perspCanvas, sim, pt);
      });
      const expCv = this.container.querySelector('#rx-exploded-canvas');
      if (expCv) this.drawExplodedMiniCanvas(expCv, pt);
      const c360 = this.container.querySelector('#rx-360-canvas');
      if (c360) this.draw360MiniCanvas(c360, pt);
    },

    drawPerspectiveMiniTank(canvas, mode, sim, pt) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(160, Math.round(rect.width || 220));
      const h = Math.max(130, Math.round(rect.height || 165));
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Fundo gradeado cyber
      ctx.fillStyle = '#050e1a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const hasColorbar = ['hydro', 'do', 'biomass', 'kla', 'temp'].includes(mode);
      const cx = hasColorbar ? w * 0.40 : (mode === 'bubbles' ? w * 0.38 : w * 0.50);
      const tw = Math.min(82, w * 0.36);
      const th = Math.min(108, h * 0.66);
      const tx = cx - tw / 2;
      const ty = h * 0.20;
      const tb = ty + th;
      const fillFrac = Math.min(0.84, Math.max(0.40, pt.V / 55.0));
      const lh = th * fillFrac;
      const lt = tb - lh;

      // Motor e domo superior
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(cx - 8, ty - 20, 16, 13);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx, ty, tw / 2, 8, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Conteúdo interno do tanque conforme a perspectiva
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, [8, 8, 16, 16]);
      ctx.clip();

      if (mode === 'externa') {
        const g = ctx.createLinearGradient(tx, 0, tx + tw, 0);
        g.addColorStop(0, '#334155');
        g.addColorStop(0.35, '#e2e8f0');
        g.addColorStop(0.7, '#64748b');
        g.addColorStop(1, '#1e293b');
        ctx.fillStyle = g;
        ctx.fillRect(tx, ty, tw, th);
        // Visor vertical estreito
        ctx.fillStyle = 'rgba(14, 165, 233, 0.55)';
        ctx.fillRect(cx - 5, lt, 10, lh);
      } else {
        ctx.fillStyle = '#071526';
        ctx.fillRect(tx, ty, tw, th);

        // Preenchimento do caldo de acordo com a variável analisada
        const lg = ctx.createLinearGradient(0, lt, 0, tb);
        if (mode === 'hydro') {
          lg.addColorStop(0, 'rgba(34, 197, 94, 0.55)');
          lg.addColorStop(0.5, 'rgba(234, 179, 8, 0.65)');
          lg.addColorStop(1, 'rgba(14, 165, 233, 0.55)');
        } else if (mode === 'do') {
          lg.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
          lg.addColorStop(0.55, 'rgba(34, 197, 94, 0.55)');
          lg.addColorStop(1, 'rgba(249, 115, 22, 0.72)');
        } else if (mode === 'biomass') {
          lg.addColorStop(0, 'rgba(74, 222, 128, 0.72)');
          lg.addColorStop(1, 'rgba(6, 95, 70, 0.85)');
        } else if (mode === 'kla') {
          lg.addColorStop(0, 'rgba(56, 189, 248, 0.75)');
          lg.addColorStop(1, 'rgba(29, 78, 216, 0.85)');
        } else if (mode === 'temp') {
          lg.addColorStop(0, 'rgba(239, 68, 68, 0.78)');
          lg.addColorStop(0.5, 'rgba(234, 179, 8, 0.68)');
          lg.addColorStop(1, 'rgba(56, 189, 248, 0.72)');
        } else {
          lg.addColorStop(0, 'rgba(14, 165, 233, 0.42)');
          lg.addColorStop(1, 'rgba(3, 105, 161, 0.72)');
        }
        ctx.fillStyle = lg;
        ctx.fillRect(tx, lt, tw, lh);

        // Linhas de corrente para Hidrodinâmica
        if (mode === 'hydro') {
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
          ctx.lineWidth = 1.1;
          for (let k = 0; k < 3; k++) {
            const iy = tb - lh * (0.22 + k * 0.28);
            ctx.beginPath();
            ctx.ellipse(cx - tw * 0.22, iy, tw * 0.18, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + tw * 0.22, iy, tw * 0.18, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Bolhas internas
        if (['corte', 'do', 'bubbles', 'kla'].includes(mode)) {
          ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
          for (let b = 0; b < 24; b++) {
            const bx = tx + 8 + ((b * 19) % (tw - 16));
            const by = lt + 6 + ((b * 13) % Math.max(10, lh - 12));
            ctx.beginPath();
            ctx.arc(bx, by, 1.5 + (b % 2), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Eixo e 3 turbinas Rushton
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx - 1.5, ty, 3, th - 6);
        for (let k = 0; k < 3; k++) {
          const iy = tb - lh * (0.22 + k * 0.28);
          ctx.fillRect(cx - tw * 0.24, iy - 2, tw * 0.48, 4);
        }
      }
      ctx.restore();

      // Contorno metálico do tanque e pernas
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, [8, 8, 16, 16]);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.fillRect(tx + 8, tb, 4, 12);
      ctx.fillRect(tx + tw - 12, tb, 4, 12);

      // Lupa de zoom de bolhas no modo "bubbles" (igual à Imagem 2!)
      if (mode === 'bubbles') {
        const zx = w * 0.76;
        const zy = h * 0.54;
        const zr = 25;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + 8, tb - 18);
        ctx.lineTo(zx - zr * 0.7, zy + zr * 0.4);
        ctx.stroke();

        ctx.fillStyle = '#061a2e';
        ctx.beginPath();
        ctx.arc(zx, zy, zr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        for (const [ox, oy, br] of [[-9, -7, 5], [7, -8, 4], [0, 4, 6.5], [-11, 8, 3.5], [10, 7, 4.5]]) {
          ctx.beginPath();
          ctx.arc(zx + ox, zy + oy, br, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Barra de escala colorida (Colorbar) nos modos analíticos (igual à Imagem 2!)
      if (hasColorbar) {
        const bx = w - 46;
        const by = ty + 8;
        const bw = 9;
        const bh = th - 12;
        const cg = ctx.createLinearGradient(0, by, 0, by + bh);

        let unit = '';
        let labels = [];
        if (mode === 'hydro') {
          unit = 'm·s⁻¹';
          labels = [(pt.vtip * 0.25).toFixed(2), (pt.vtip * 0.12).toFixed(2), '0,00'];
          cg.addColorStop(0, '#ef4444'); cg.addColorStop(0.5, '#22c55e'); cg.addColorStop(1, '#1d4ed8');
        } else if (mode === 'do') {
          unit = 'DO (%)';
          labels = ['100', Math.round(pt.OD).toString(), '0'];
          cg.addColorStop(0, '#f59e0b'); cg.addColorStop(0.5, '#22c55e'); cg.addColorStop(1, '#1d4ed8');
        } else if (mode === 'biomass') {
          unit = 'X (g/L)';
          labels = [sim.summary.maxX.toFixed(1), pt.X.toFixed(1), '0,0'];
          cg.addColorStop(0, '#dcfce7'); cg.addColorStop(0.5, '#22c55e'); cg.addColorStop(1, '#064e3b');
        } else if (mode === 'kla') {
          unit = 'kLa (h⁻¹)';
          labels = [Math.round(pt.kLa * 1.2).toString(), Math.round(pt.kLa).toString(), '0'];
          cg.addColorStop(0, '#e0f2fe'); cg.addColorStop(0.5, '#0284c7'); cg.addColorStop(1, '#1e3a8a');
        } else if (mode === 'temp') {
          unit = 'T (°C)';
          labels = ['26,0', pt.tempC.toFixed(1), '22,0'];
          cg.addColorStop(0, '#ef4444'); cg.addColorStop(0.5, '#eab308'); cg.addColorStop(1, '#38bdf8');
        }

        ctx.fillStyle = cg;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(unit, bx - 4, by - 5);
        ctx.fillText(labels[0], bx + bw + 4, by + 6);
        ctx.fillText(labels[1], bx + bw + 4, by + bh * 0.5 + 3);
        ctx.fillText(labels[2], bx + bw + 4, by + bh);
      }
    },

    drawExplodedMiniCanvas(canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(160, Math.round(rect.width || 240));
      const h = Math.max(115, Math.round(rect.height || 130));
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#050e1a';
      ctx.fillRect(0, 0, w, h);

      // Desenho técnico explodido: Vaso à esquerda, Eixo + 3× Rushton no centro, Chicanas à direita
      // 1. Tampa superior + O-ring + Vaso
      const vx = w * 0.25;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(vx, 22, 26, 7, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(vx, 34, 25, 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
      ctx.fillRect(vx - 25, 44, 50, 56);
      ctx.strokeRect(vx - 25, 44, 50, 56);

      // 2. Eixo central + 3 Turbinas Rushton + Sparger no centro
      const sx = w * 0.60;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(sx - 2, 16, 4, 86);
      for (const iy of [36, 58, 80]) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - 18, iy - 3, 36, 6);
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(sx, 102, 16, 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Chicanas verticais à direita
      const bx = w * 0.84;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx - 6, 36, 4, 56);
      ctx.fillRect(bx + 4, 36, 4, 56);
    },

    draw360MiniCanvas(canvas, pt) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(130, Math.round(rect.width || 165));
      const h = Math.max(115, Math.round(rect.height || 130));
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#050e1a';
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      // Arco 360° luminoso ao redor do vaso
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.65, 48, 16, 0, -0.3, Math.PI + 0.3);
      ctx.stroke();

      // Mini tanque central
      ctx.fillStyle = 'rgba(14, 165, 233, 0.28)';
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(cx - 22, 22, 44, 68, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('360°', cx, h - 10);
    },

    drawFrame(dtSec, sim, pt) {
      if (!sim || !pt || !this.container) return;
      this.animTime += dtSec;

      if (BioSim.Reactor3D && BioSim.Reactor3D.available) {
        BioSim.Reactor3D.drawFrame(dtSec, sim, pt);
        this.updateCalloutLinesSVG();
      }
    }
  };

  BioSim.ReactorView = ReactorView;
})(window);
