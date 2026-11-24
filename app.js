/* ============================================================================
 * BioSim — Controlador Principal da Aplicação (Digital Twin 3 Abas)
 * Sincroniza Planta Industrial, Biorreator R-301 e Célula S. clavuligerus
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});

  const App = {
    activeTab: 'plant', // 'plant' | 'reactor' | 'cell'
    config: null,
    sim: null,
    currentTime: 96.0,  // inicia próximo ao pico produtivo para impacto visual imediato
    playing: true,
    speed: 4.0,         // horas simuladas por segundo
    lastFrameTs: 0,
    lastStaticRefreshTs: 0,

    boot() {
      this.config = BioSim.createDefaultConfig();
      this.recompute(true);

      // Navegação entre as 3 abas principais
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchTab(btn.getAttribute('data-tab'));
        });
      });

      // Presets rápidos de cenário na barra superior
      const presetSel = document.getElementById('global-preset-select');
      if (presetSel) {
        presetSel.addEventListener('change', () => {
          const p = BioSim.SCENARIO_PRESETS[presetSel.value];
          if (p) {
            this.updateConfig(p.patch);
            // Salta para o instante de pico do cenário para inspeção imediata
            this.currentTime = Math.min(this.config.horizonH, this.sim.summary.peakTimeH);
            this.refreshAllStatic();
          }
        });
      }

      // Controles de reprodução temporal (Play/Pause, Reiniciar, Velocidade, Scrubber, Ir para Pico)
      const btnPlay = document.getElementById('btn-play-toggle');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => {
          this.playing = !this.playing;
          this.updateTransportUI();
        });
      }

      const btnRestart = document.getElementById('btn-restart-sim');
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          this.currentTime = 0.0;
          this.refreshAllStatic();
        });
      }

      const btnPeak = document.getElementById('btn-jump-peak');
      if (btnPeak) {
        btnPeak.addEventListener('click', () => {
          if (this.sim) {
            this.currentTime = this.sim.summary.peakTimeH;
            this.playing = false;
            this.updateTransportUI();
            this.refreshAllStatic();
          }
        });
      }

      const speedSel = document.getElementById('playback-speed');
      if (speedSel) {
        speedSel.addEventListener('change', () => {
          this.speed = parseFloat(speedSel.value) || 4.0;
        });
      }

      const scrubber = document.getElementById('time-scrubber');
      if (scrubber) {
        scrubber.addEventListener('input', () => {
          this.currentTime = parseFloat(scrubber.value) || 0;
          this.refreshAllStatic();
        });
      }

      // Exportação CSV real da simulação (compatível com Blender / Python)
      const btnCsv = document.getElementById('btn-export-csv');
      if (btnCsv) {
        btnCsv.addEventListener('click', () => this.downloadCSV());
      }

      // Inicializar as 3 Views
      BioSim.PlantView.init(
        document.getElementById('tab-plant'),
        (tab) => this.switchTab(tab),
        (patch) => this.updateConfig(patch)
      );
      BioSim.ReactorView.init(
        document.getElementById('tab-reactor'),
        (patch) => this.updateConfig(patch)
      );
      BioSim.CellView.init(
        document.getElementById('tab-cell'),
        (patch) => this.updateConfig(patch)
      );

      const hashTab = (window.location.hash || '').replace('#', '');
      const initialTab = ['plant', 'reactor', 'cell'].includes(hashTab) ? hashTab : 'plant';
      this.switchTab(initialTab);
      this.updateTransportUI();
      this.refreshAllStatic();

      window.addEventListener('resize', () => this.refreshAllStatic());
      requestAnimationFrame((ts) => this.loop(ts));
    },

    switchTab(tabId) {
      this.activeTab = tabId;
      document.body.classList.toggle('plant-layout-active', true);
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      });
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'tab-' + tabId);
      });
      if (tabId === 'plant' && BioSim.Plant3D && BioSim.Plant3D.resize) {
        requestAnimationFrame(() => BioSim.Plant3D.resize());
      }
      if (tabId === 'reactor' && BioSim.Reactor3D && BioSim.Reactor3D.resize) {
        requestAnimationFrame(() => BioSim.Reactor3D.resize());
      }
      if (tabId === 'cell' && BioSim.Cell3D && BioSim.Cell3D.resize) {
        requestAnimationFrame(() => BioSim.Cell3D.resize());
      }
      this.refreshAllStatic();
    },

    updateConfig(patch) {
      if (!patch) return;
      if (patch.genes) {
        this.config.genes = Object.assign({}, this.config.genes, patch.genes);
      }
      for (const k of Object.keys(patch)) {
        if (k !== 'genes') this.config[k] = patch[k];
      }
      this.recompute(false);
      this.refreshAllStatic();
    },

    recompute(resetTimeToPeak) {
      this.sim = BioSim.runSimulation(this.config);
      if (resetTimeToPeak) {
        this.currentTime = Math.min(this.config.horizonH, this.sim.summary.peakTimeH);
      }
    },

    getCurrentPoint() {
      if (!this.sim) return null;
      return BioSim.Charts.findPointAtTime(this.sim.series, this.currentTime);
    },

    updateTransportUI() {
      const btnPlay = document.getElementById('btn-play-toggle');
      if (btnPlay) {
        btnPlay.innerHTML = this.playing ? '❚❚ Pausar' : '▶ Simular';
        btnPlay.classList.toggle('is-playing', this.playing);
      }
      const plantStatus = document.getElementById('plant-run-status');
      const plantPill = plantStatus && plantStatus.closest('.plant-live-pill');
      if (plantStatus) plantStatus.textContent = this.playing ? 'EM OPERAÇÃO (SIMULAÇÃO)' : 'SIMULAÇÃO PAUSADA';
      if (plantPill) plantPill.classList.toggle('paused', !this.playing);
      if (this.sim && BioSim.PlantView && this.activeTab === 'plant') {
        BioSim.PlantView.updateInspector(this.sim, this.getCurrentPoint());
      }
      if (this.sim && BioSim.Plant3D && BioSim.Plant3D.available) {
        BioSim.Plant3D.update(this.sim, this.getCurrentPoint());
      }
    },

    refreshAllStatic() {
      const pt = this.getCurrentPoint();
      if (!this.sim || !pt) return;

      // Barra de transporte temporal global
      const scrubber = document.getElementById('time-scrubber');
      if (scrubber) {
        scrubber.max = this.config.horizonH;
        scrubber.value = this.currentTime.toFixed(1);
      }
      const timeTxt = document.getElementById('time-readout');
      if (timeTxt) timeTxt.textContent = `${pt.t.toFixed(1)} h / ${this.config.horizonH} h`;

      const phaseBadge = document.getElementById('global-phase-pill');
      if (phaseBadge) phaseBadge.textContent = pt.phase;

      // Atualizar apenas a view ativa (e dados globais)
      if (this.activeTab === 'plant') {
        BioSim.PlantView.renderStatic(this.sim, pt);
      } else if (this.activeTab === 'reactor') {
        BioSim.ReactorView.renderStatic(this.sim, pt);
      } else if (this.activeTab === 'cell') {
        BioSim.CellView.renderStatic(this.sim, pt);
      }
    },

    downloadCSV() {
      if (!this.sim) return;
      const csv = BioSim.exportCSV(this.sim);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulacao_AC_${this.config.medium}_${this.config.rpm}rpm.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    loop(ts) {
      if (!this.lastFrameTs) this.lastFrameTs = ts;
      const dtSec = Math.min(0.05, (ts - this.lastFrameTs) / 1000.0);
      this.lastFrameTs = ts;

      if (this.playing && this.sim) {
        this.currentTime += dtSec * this.speed;
        if (this.currentTime > this.config.horizonH) {
          this.currentTime = 0.0;
        }
        // Atualiza DOM/gráficos em ~12 Hz durante playback para manter 60 FPS suaves nos canvas
        if (ts - this.lastStaticRefreshTs > 85) {
          this.lastStaticRefreshTs = ts;
          this.refreshAllStatic();
        }
      }

      const pt = this.getCurrentPoint();
      if (this.sim && pt) {
        if (this.activeTab === 'plant') {
          BioSim.PlantView.drawFrame(dtSec, this.sim, pt);
        } else if (this.activeTab === 'reactor') {
          BioSim.ReactorView.drawFrame(dtSec, this.sim, pt);
        } else if (this.activeTab === 'cell') {
          BioSim.CellView.drawFrame(dtSec, this.sim, pt);
        }
      }

      requestAnimationFrame((nextTs) => this.loop(nextTs));
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.boot());
  BioSim.App = App;
})(window);
