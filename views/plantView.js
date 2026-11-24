/* ============================================================================
 * BioSim — Aba 1: Controlador da Planta Industrial 3D por Camadas (CLAVIS)
 * Integra o catálogo completo dos 20 equipamentos do PFD-AC-001 Rev. 1,
 * Sistema de 8 Camadas 3D, Inspeção de Equipamentos, Visualização por Área
 * (100 a 500), Legenda Permanente de Correntes e Controles de Câmera.
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});

  // Catálogo completo dos 20 equipamentos da planta (Áreas 100 a 500 — PFD-AC-001 Rev. 1)
  const EQUIPMENT_CATALOG = [
    // ÁREA 100 — PREPARO DE MEIOS
    {
      id: 'V-101', area: '100', areaName: 'Preparo de Meios', name: 'Tanque de Meio Basal',
      spec: 'Preparo, homogeneização e esterilização do meio basal (FEN22: 3,32 mol C/L ou Ribeiro: 15 g/L glicerol).',
      notes: 'Formulação FEN22: glicerol (5 g/L), dextrina (20 g/L), farelo de soja (40 g/L), óleo de milho (20 g/L) e sais.',
      instruments: ['LIC-101 (Nível do tanque)', 'TIC-101 (Esterilização 121 °C)']
    },
    {
      id: 'V-102', area: '100', areaName: 'Preparo de Meios', name: 'Tanque de Alimentação Fed-Batch',
      spec: 'Reservatório estéril de solução concentrada de glicerol (120–180 g/L) para operação fed-batch.',
      notes: 'Fornece carbono suplementar conforme a estratégia ativa (A, D, E ou F) através da bomba P-101.',
      instruments: ['LIC-102 (Nível de alimentação)', 'TI-102 (Temperatura)']
    },
    {
      id: 'P-101', area: '100', areaName: 'Preparo de Meios', name: 'Bomba Dosadora Sanitária de Meios',
      spec: 'Bomba sanitária de deslocamento positivo para transferência de meio basal e dosagem modulada fed-batch.',
      notes: 'Atua em malha fechada com o controle de substrato residual (SG) do biorreator principal R-301.',
      instruments: ['FIC-101 (Controle de vazão L/h)', 'PI-101 (Pressão de recalque)']
    },

    // ÁREA 200 — INÓCULO E AR
    {
      id: 'R-201', area: '200', areaName: 'Inóculo e Ar', name: 'Biorreator Semente (Inóculo)',
      spec: 'Fermentador semente encamisado para propagação vegetativa de Streptomyces clavuligerus (4% v/v).',
      notes: 'Garante transferência de micélio fisiologicamente ativo (~0,95 g/L inicial no R-301).',
      instruments: ['TIC-201 (Temperatura 26 °C)', 'PIC-201 (Pressão positiva)']
    },
    {
      id: 'K-201', area: '200', areaName: 'Inóculo e Ar', name: 'Compressor de Ar Isento de Óleo',
      spec: 'Compressor industrial centrífugo isento de óleo para suprimento contínuo de ar de processo.',
      notes: 'Dimensionado para vazão específica de 0,20 a 1,00 vvm (~16–42 m³/min em escala de 60 m³).',
      instruments: ['PIC-202 (Pressão de descarga)', 'WI-201 (Potência de compressão)']
    },
    {
      id: 'E-201', area: '200', areaName: 'Inóculo e Ar', name: 'Trocador Pós-Resfriador de Ar',
      spec: 'Trocador casco-e-tubos em aço inox para resfriamento do ar comprimido e remoção de condensado.',
      notes: 'Condiciona a temperatura e umidade relativa do ar antes da membrana hidrofóbica do F-201.',
      instruments: ['TI-202 (Temperatura de saída do ar)']
    },
    {
      id: 'F-201', area: '200', areaName: 'Inóculo e Ar', name: 'Filtro Esterilizante de Ar (0,2 µm)',
      spec: 'Conjunto de cartuchos absolutos PTFE 0,2 µm esterilizáveis a vapor (SIP) para retenção microbiológica.',
      notes: 'Barreira sanitária crítica antes do aspersor anelar inferior do biorreator R-301.',
      instruments: ['PDI-201 (Pressão diferencial do filtro)']
    },

    // ÁREA 300 — FERMENTAÇÃO
    {
      id: 'R-301', area: '300', areaName: 'Fermentação', name: 'Fermentador Principal STR 60 m³',
      spec: '60 m³ geométricos (41,92 m³ úteis) | Dt = 2,836 m | 3× Turbinas Rushton (Di = 1,007 m, Np = 16,5).',
      notes: 'Unidade central da planta. Torque nominal 9,15 kN·m (110 rpm); antialagamento 105,7 rpm; atenção à carga térmica Q/V no meio FEN22.',
      instruments: ['TIC-301 (Temperatura)', 'AIC-301 (pH 6,90)', 'OIC-301 (Oxigênio Dissolvido)', 'SIC-301 (Rotação RPM)']
    },

    // ÁREA 400 — COLHEITA
    {
      id: 'T-401', area: '400', areaName: 'Colheita', name: 'Tanque Pulmão Refrigerado (c/ E-401)',
      spec: 'Resfriamento rápido do caldo colhido (24 °C → 10 °C) e pulmão isotérmico sanitário.',
      notes: 'Reduz drasticamente a constante de degradação térmica (k_dP) do ácido clavulânico antes da centrifugação.',
      instruments: ['TI-401 (Temperatura 10 °C)', 'LI-401 (Volume colhido)']
    },
    {
      id: 'C-401', area: '400', areaName: 'Colheita', name: 'Centrífuga Industrial de Discos',
      spec: 'Clarificação contínua sólido-líquido de alta força G com descarga automática da torta micelial.',
      notes: 'Separa a biomassa filamentosa (Corrente S-08) do sobrenadante clarificado rico em AC (Corrente S-09).',
      instruments: ['SI-401 (Rotação do bowl)', 'FI-401 (Vazão de clarificado)']
    },

    // ÁREA 500 — EXTRAÇÃO E PURIFICAÇÃO (DOWNSTREAM)
    {
      id: 'T-501', area: '500', areaName: 'Extração e Purificação', name: 'Tanque de Acidificação',
      spec: 'Ajuste controlado de pH para 2,0 a 10 °C com H₂SO₄ 3 mol/L sob agitação e camisa refrigerada.',
      notes: 'Agudelo-Arenas et al. (2024): pH 2,0 protona o AC (pKa ≈ 2,7) maximizando partição para a fase orgânica.',
      instruments: ['pHIC-501 (Controle pH 2,0)', 'TI-501 (Temperatura 10 °C)']
    },
    {
      id: 'EX-401', area: '500', areaName: 'Extração e Purificação', name: 'Misturador-Extrator Líquido-Líquido',
      spec: 'Extração líquido-líquido intensiva do caldo acidificado com acetato de etila (fresco + recuperado).',
      notes: 'Extração dupla alcança 57,14 ± 0,19% de recuperação experimental (Agudelo-Arenas, 2024).',
      instruments: ['FIC-501 (Razão Org/Aq)']
    },
    {
      id: 'D-501', area: '500', areaName: 'Extração e Purificação', name: 'Decantador de Fases',
      spec: 'Vaso separador coalescedor para partição limpa entre extrato orgânico rico em AC e rafinado aquoso.',
      notes: 'O extrato orgânico leve segue para o EV-501 (S-12) e a fase aquosa esgotada sai em S-13.',
      instruments: ['LIC-501 (Interface Org/Aq)']
    },
    {
      id: 'EV-501', area: '500', areaName: 'Extração e Purificação', name: 'Evaporador a Vácuo Multiestágio',
      spec: 'Colunas gêmeas de evaporação sob vácuo para concentração do extrato orgânico a baixa temperatura.',
      notes: 'Evapora o acetato de etila sem degradar o ácido clavulânico termolábil.',
      instruments: ['PIC-501 (Vácuo de operação)', 'TIC-501 (Temperatura de topo)']
    },
    {
      id: 'E-501', area: '500', areaName: 'Extração e Purificação', name: 'Condensador e Tanque de Solvente',
      spec: 'Condensação refrigerada e armazenamento do acetato de etila recuperado (~92% de reciclo fechado).',
      notes: 'Realimenta o extrator EX-401 através da linha de reciclo de solvente (Corrente S-14, ciano).',
      instruments: ['TI-502 (Temp. condensado)', 'FI-502 (Vazão de reciclo)']
    },
    {
      id: 'T-502', area: '500', areaName: 'Extração e Purificação', name: 'Reator de Conversão para Sal K⁺',
      spec: 'Adição estequiométrica de 2-etil-hexanoato de potássio (Hirata et al., 2009) ao extrato concentrado.',
      notes: 'Converte o ácido clavulânico livre instável no sal farmacêutico estável Clavulanato de Potássio.',
      instruments: ['FIC-502 (Dosagem de agente K⁺)']
    },
    {
      id: 'CR-501', area: '500', areaName: 'Extração e Purificação', name: 'Cristalizador Encamisado',
      spec: 'Cristalização controlada por rampa de resfriamento e antissolvente com agitação de baixo cisalhamento.',
      notes: 'Garante alta pureza química e distribuição granulométrica uniforme dos cristais.',
      instruments: ['TIC-502 (Rampa térmica de cristalização)']
    },
    {
      id: 'F-501', area: '500', areaName: 'Extração e Purificação', name: 'Filtro Nutsche Fechado',
      spec: 'Filtração pressurizada hermética, deslocamento do licor-mãe (S-18a) e lavagem da torta cristalina.',
      notes: 'Opera sob nitrogênio seco para evitar hidrólise do clavulanato de potássio.',
      instruments: ['PIC-502 (Pressão de filtração N₂)']
    },
    {
      id: 'TK-501', area: '500', areaName: 'Extração e Purificação', name: 'Silo Pulmão de Cristais Lavados',
      spec: 'Vaso intermediário hermético para equalização e alimentação contínua da torta úmida ao secador.',
      notes: 'Mantém atmosfera inerte de baixa umidade antes da secagem final.',
      instruments: ['LI-502 (Nível de torta cristalina)']
    },
    {
      id: 'DR-501', area: '500', areaName: 'Extração e Purificação', name: 'Secador a Vácuo Horizontal',
      spec: 'Secador horizontal agitado a vácuo para remoção final de solvente residual e umidade (< 0,5%).',
      notes: 'Entrega o IFA final Clavulanato de Potássio Seco (Corrente S-20).',
      instruments: ['TIC-503 (Temp. secagem ≤ 30 °C)', 'WI-501 (Massa final Clav-K⁺)']
    }
  ];

  // Correntes de Processo com cores padronizadas (Seção 4)
  const PROCESS_STREAMS = [
    { id: 'S-01',  from: 'V-101',  to: 'P-101',       category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Meio de fermentação basal' },
    { id: 'S-02',  from: 'V-102',  to: 'P-101',       category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Meio de alimentação (glicerol)' },
    { id: 'S-03a', from: 'P-101',  to: 'R-201',       category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Meio basal para inóculo' },
    { id: 'S-03',  from: 'P-101',  to: 'R-301',       category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Alimentação fed-batch para R-301' },
    { id: 'S-04',  from: 'R-201',  to: 'R-301',       category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Inóculo S. clavuligerus (4% v/v)' },
    { id: 'S-05a', from: 'K-201',  to: 'E-201',       category: 'solvent', color: '#06b6d4', typeLabel: 'Ar / Utilidade limpa', label: 'Ar comprimido' },
    { id: 'S-05b', from: 'E-201',  to: 'F-201',       category: 'solvent', color: '#06b6d4', typeLabel: 'Ar / Utilidade limpa', label: 'Ar comprimido resfriado' },
    { id: 'S-05',  from: 'F-201',  to: 'R-301',       category: 'solvent', color: '#06b6d4', typeLabel: 'Ar / Utilidade limpa', label: 'Ar estéril (0,50 vvm)' },
    { id: 'S-06',  from: 'R-301',  to: 'T-401',       category: 'organic', color: '#22c55e', typeLabel: 'Caldo / Fase orgânica', label: 'Caldo fermentado bruto' },
    { id: 'S-07',  from: 'T-401',  to: 'C-401',       category: 'organic', color: '#22c55e', typeLabel: 'Caldo / Fase orgânica', label: 'Caldo resfriado (10 °C)' },
    { id: 'S-08',  from: 'C-401',  to: 'BIOMASS-OUT', category: 'waste',   color: '#f97316', typeLabel: 'Resíduos e biomassa',  label: 'Biomassa separada (torta úmida)' },
    { id: 'S-09',  from: 'C-401',  to: 'T-501',       category: 'organic', color: '#22c55e', typeLabel: 'Caldo / Fase orgânica', label: 'Caldo clarificado' },
    { id: 'S-10',  from: 'T-501',  to: 'EX-401',      category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Caldo acidificado (pH 2,0)' },
    { id: 'S-11',  from: 'EX-401', to: 'D-501',       category: 'organic', color: '#22c55e', typeLabel: 'Fase orgânica',        label: 'Mistura com acetato de etila' },
    { id: 'S-12',  from: 'D-501',  to: 'EV-501',      category: 'organic', color: '#22c55e', typeLabel: 'Fase orgânica',        label: 'Fase orgânica rica em AC' },
    { id: 'S-13',  from: 'D-501',  to: 'RAFF-OUT',    category: 'aqueous', color: '#2589f5', typeLabel: 'Corrente aquosa',      label: 'Fase aquosa / rafinado esgotado' },
    { id: 'S-14a', from: 'EV-501', to: 'E-501',       category: 'solvent', color: '#06b6d4', typeLabel: 'Solvente recuperado',  label: 'Vapor de acetato de etila' },
    { id: 'S-14',  from: 'E-501',  to: 'EX-401',      category: 'solvent', color: '#06b6d4', typeLabel: 'Solvente recuperado',  label: 'Acetato de etila recuperado (reciclo)' },
    { id: 'S-15',  from: 'EV-501', to: 'T-502',       category: 'product', color: '#f59e0b', typeLabel: 'Produto',              label: 'Extrato orgânico concentrado em AC' },
    { id: 'S-16',  from: 'T-502',  to: 'CR-501',      category: 'product', color: '#f59e0b', typeLabel: 'Produto',              label: 'Solução + agente de potássio' },
    { id: 'S-17',  from: 'CR-501', to: 'F-501',       category: 'product', color: '#f59e0b', typeLabel: 'Produto',              label: 'Suspensão de cristais de Clavulanato K⁺' },
    { id: 'S-18a', from: 'F-501',  to: 'MOTHER-OUT',  category: 'waste',   color: '#f97316', typeLabel: 'Resíduos e biomassa',  label: 'Licor-mãe drenado' },
    { id: 'S-18',  from: 'F-501',  to: 'TK-501',      category: 'product', color: '#f59e0b', typeLabel: 'Produto',              label: 'Torta de cristais lavados' },
    { id: 'S-19',  from: 'TK-501', to: 'DR-501',      category: 'product', color: '#f59e0b', typeLabel: 'Produto',              label: 'Cristais úmidos dosados' },
    { id: 'S-20',  from: 'DR-501', to: 'PRODUCT-OUT', category: 'product', color: '#f59e0b', typeLabel: 'Produto',              label: 'Clavulanato de potássio seco (produto final)' }
  ];

  const AREA_METADATA = {
    '100': {
      title: 'ÁREA 100 — PREPARO DE MEIOS',
      desc: 'Formulação, esterilização e bombeamento sanitário do meio basal e da alimentação suplementar de glicerol.',
      sequence: ['V-101', 'V-102', 'P-101']
    },
    '200': {
      title: 'ÁREA 200 — INÓCULO E AR ESTÉRIL',
      desc: 'Propagação do inóculo micelial de S. clavuligerus (R-201) e geração/esterilização do ar de aeração (K-201 → E-201 → F-201).',
      sequence: ['R-201', 'K-201', 'E-201', 'F-201']
    },
    '300': {
      title: 'ÁREA 300 — FERMENTAÇÃO PRINCIPAL',
      desc: 'Fermentador industrial STR de 60 m³ (R-301) operando em batelada alimentada com 3 impelidores Rushton.',
      sequence: ['R-301']
    },
    '400': {
      title: 'ÁREA 400 — COLHEITA E CLARIFICAÇÃO',
      desc: 'Resfriamento imediato a 10 °C no tanque pulmão T-401 e separação contínua da biomassa na centrífuga C-401.',
      sequence: ['T-401', 'C-401']
    },
    '500': {
      title: 'ÁREA 500 — EXTRAÇÃO E PURIFICAÇÃO (DOWNSTREAM)',
      desc: 'Acidificação a pH 2,0, extração líquido-líquido com acetato de etila, evaporação a vácuo com reciclo de solvente, conversão ao sal de potássio, cristalização, filtração Nutsche e secagem a vácuo.',
      sequence: ['T-501', 'EX-401', 'D-501', 'EV-501', 'E-501', 'T-502', 'CR-501', 'F-501', 'TK-501', 'DR-501']
    }
  };

  const PlantView = {
    selectedId: 'R-301',
    selectedArea: null,
    subMode: 'iso3d', // 'iso3d' | 'scaleup'
    initialized: false,

    init(container, onNavigateTab, onConfigChange) {
      this.container = container;
      this.onNavigateTab = onNavigateTab;
      this.onConfigChange = onConfigChange;
      if (this.initialized) return;
      this.initialized = true;

      // 1. Alternância entre Maquete 3D e Scale-up
      container.querySelectorAll('[data-plant-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.subMode = btn.getAttribute('data-plant-mode');
          if (BioSim.Plant3D && BioSim.Plant3D.setMode) {
            BioSim.Plant3D.setMode(this.subMode);
          }
          const scaleOverlay = container.querySelector('#scaleup-overlay');
          if (scaleOverlay) {
            scaleOverlay.classList.toggle('visible', this.subMode === 'scaleup');
          }
          this.renderStatic(this.lastSim, this.lastPt);
        });
      });

      // 2. Controles das 8 Camadas 3D
      const updateLayerCountBadge = () => {
        const inputs = Array.from(container.querySelectorAll('[data-3d-layer]'));
        const activeCount = inputs.filter(i => i.checked).length;
        const countEl = container.querySelector('#layer-active-count');
        if (countEl) countEl.textContent = `0${activeCount}/08`;
        const badgeEl = container.querySelector('#badge-active-layers');
        if (badgeEl) badgeEl.textContent = `${activeCount}/8 CAMADAS ATIVAS`;
      };

      container.querySelectorAll('[data-3d-layer]').forEach(input => {
        input.addEventListener('change', () => {
          if (BioSim.Plant3D && BioSim.Plant3D.setLayer) {
            BioSim.Plant3D.setLayer(input.dataset['3dLayer'], input.checked);
          }
          updateLayerCountBadge();
        });
      });

      const btnAllLayers = container.querySelector('#btn-layers-all');
      if (btnAllLayers) {
        btnAllLayers.addEventListener('click', () => {
          container.querySelectorAll('[data-3d-layer]').forEach(inp => { inp.checked = true; });
          if (BioSim.Plant3D && BioSim.Plant3D.setAllLayers) {
            BioSim.Plant3D.setAllLayers(true);
          }
          updateLayerCountBadge();
        });
      }

      // 3. Modos de Câmera e Visualização (Seção 6)
      const viewNames = {
        iso: 'VISTA ISOMÉTRICA 3D',
        top: 'VISTA SUPERIOR',
        front: 'VISTA FRONTAL',
        side: 'VISTA LATERAL'
      };

      container.querySelectorAll('[data-camera-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.cameraMode;
          if (BioSim.Plant3D && BioSim.Plant3D.cameraMode) {
            BioSim.Plant3D.cameraMode(mode);
          }
          container.querySelectorAll('[data-camera-mode]').forEach(b => {
            b.classList.toggle('active', b.dataset.cameraMode === mode);
          });
          const badgeView = container.querySelector('#badge-active-view');
          if (badgeView && viewNames[mode]) badgeView.textContent = viewNames[mode];
        });
      });

      container.querySelectorAll('[data-camera-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!BioSim.Plant3D) return;
          const action = btn.dataset.cameraAction;
          if (action === 'zoom-in') BioSim.Plant3D.zoom(0.82);
          if (action === 'zoom-out') BioSim.Plant3D.zoom(1.22);
          if (action === 'focus' || action === 'focus-eq') {
            BioSim.Plant3D.focusEquipment(this.selectedId);
            const badgeView = container.querySelector('#badge-active-view');
            if (badgeView) badgeView.textContent = `FOCO · ${this.selectedId}`;
          }
          if (action === 'focus-area') {
            const eq = EQUIPMENT_CATALOG.find(e => e.id === this.selectedId);
            const areaToFocus = this.selectedArea || (eq ? eq.area : '300');
            this.selectArea(areaToFocus);
          }
          if (action === 'overview') {
            this.selectArea(null);
            BioSim.Plant3D.cameraMode('iso');
            container.querySelectorAll('[data-camera-mode]').forEach(b => {
              b.classList.toggle('active', b.dataset.cameraMode === 'iso');
            });
            const badgeView = container.querySelector('#badge-active-view');
            if (badgeView) badgeView.textContent = 'VISTA ISOMÉTRICA 3D';
          }
          if (action === 'toggle-layers-focus') {
            const layersCard = container.querySelector('#plant-layers-card');
            if (layersCard) {
              layersCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              layersCard.classList.remove('pulse-card');
              void layersCard.offsetWidth;
              layersCard.classList.add('pulse-card');
            }
          }
        });
      });

      const btnInspZoom = container.querySelector('#btn-insp-zoom');
      if (btnInspZoom) {
        btnInspZoom.addEventListener('click', () => {
          if (BioSim.Plant3D && BioSim.Plant3D.focusEquipment) {
            BioSim.Plant3D.focusEquipment(this.selectedId);
          }
        });
      }

      // 4. Seleção de Equipamento na Barra de Sequência de Processo
      container.querySelectorAll('[data-equipment-select]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.chooseEquipment(el.dataset.equipmentSelect, true);
        });
      });

      // 5. Seleção de Área Industrial (Barra de Sequência + Pills do Topo + Botão Limpar)
      container.querySelectorAll('[data-area-select]').forEach(box => {
        box.addEventListener('click', (e) => {
          if (e.target.closest('[data-equipment-select]')) return;
          const areaId = box.dataset.areaSelect;
          const nextArea = this.selectedArea === areaId ? null : areaId;
          this.selectArea(nextArea);
        });
      });

      container.querySelectorAll('[data-area-pill]').forEach(pill => {
        pill.addEventListener('click', () => {
          const val = pill.dataset.areaPill;
          this.selectArea(val === 'all' ? null : val);
        });
      });

      const btnClearArea = container.querySelector('#btn-clear-area-filter');
      if (btnClearArea) {
        btnClearArea.addEventListener('click', () => this.selectArea(null));
      }

      // 6. Filtro interativo na Legenda Permanente de Correntes
      container.querySelectorAll('[data-stream-filter]').forEach(item => {
        item.addEventListener('click', () => {
          if (!BioSim.Plant3D || !BioSim.Plant3D.filterStreamsByCategory) return;
          const cat = item.dataset.streamFilter;
          const activeCat = BioSim.Plant3D.filterStreamsByCategory(cat);
          container.querySelectorAll('[data-stream-filter]').forEach(el => {
            el.classList.toggle('is-active', activeCat && el.dataset.streamFilter === activeCat);
          });
        });
      });

      // 7. Ações do Menu Lateral Esquerdo CLAVIS
      container.querySelectorAll('[data-plant-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.plantNav;
          container.querySelectorAll('[data-plant-nav]').forEach(b => b.classList.toggle('sub-active', b === btn));
          if (act === 'simulation') {
            const playBtn = document.getElementById('btn-play-toggle');
            if (playBtn) playBtn.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (act === 'operation') {
            this.selectArea('300');
            this.chooseEquipment('R-301', true);
          } else if (act === 'results') {
            const chartsEl = document.getElementById('plant-results-charts');
            if (chartsEl) chartsEl.scrollIntoView({ behavior: 'smooth' });
          } else if (act === 'alarms') {
            this.chooseEquipment('R-301', true);
            const inspCard = container.querySelector('#plant-inspector-card');
            if (inspCard) inspCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else if (act === 'reports') {
            if (BioSim.App && BioSim.App.downloadCSV) BioSim.App.downloadCSV();
          } else if (act === 'settings') {
            const layersCard = container.querySelector('#plant-layers-card');
            if (layersCard) layersCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      });

      // 8. Seletor de rota downstream e botão "Abrir Biorreator R-301"
      const routeSel = container.querySelector('#downstream-route-select');
      if (routeSel) {
        routeSel.addEventListener('change', () => {
          this.onConfigChange({ downstreamRoute: routeSel.value });
        });
      }

      const openBtn = container.querySelector('#btn-open-reactor-from-plant');
      if (openBtn) {
        openBtn.addEventListener('click', () => this.onNavigateTab('reactor'));
      }
    },

    chooseEquipment(id, focus3D = true) {
      this.selectedId = id;
      this.syncSelectedEquipmentUI(id);
      if (BioSim.Plant3D && BioSim.Plant3D.select) {
        BioSim.Plant3D.select(id, focus3D);
      }
      this.updateInspector(this.lastSim, this.lastPt);
    },

    syncSelectedEquipmentUI(id) {
      if (!this.container) return;
      this.container.querySelectorAll('[data-equipment-select]').forEach(el => {
        el.classList.toggle('selected', el.dataset.equipmentSelect === id);
      });
    },

    onAreaSelectedFrom3D(areaId) {
      this.selectedArea = areaId;
      this.syncSelectedAreaUI(areaId);
      this.updateAreaInspector(this.lastSim, this.lastPt);
    },

    selectArea(areaId) {
      this.selectedArea = areaId || null;
      this.syncSelectedAreaUI(this.selectedArea);
      if (BioSim.Plant3D && BioSim.Plant3D.focusArea) {
        BioSim.Plant3D.focusArea(this.selectedArea);
      }
      if (this.selectedArea) {
        const areaMeta = AREA_METADATA[this.selectedArea];
        if (areaMeta && areaMeta.sequence.length && !areaMeta.sequence.includes(this.selectedId)) {
          this.selectedId = areaMeta.sequence[0];
          this.syncSelectedEquipmentUI(this.selectedId);
          this.updateInspector(this.lastSim, this.lastPt);
        }
      }
      const badgeView = this.container.querySelector('#badge-active-view');
      if (badgeView) {
        badgeView.textContent = this.selectedArea ? `ÁREA ${this.selectedArea} DESTACADA` : 'VISTA ISOMÉTRICA 3D';
      }
      this.updateAreaInspector(this.lastSim, this.lastPt);
    },

    syncSelectedAreaUI(areaId) {
      if (!this.container) return;
      this.container.querySelectorAll('[data-area-select]').forEach(box => {
        box.classList.toggle('active', box.dataset.areaSelect === areaId);
      });
      this.container.querySelectorAll('[data-area-pill]').forEach(pill => {
        const val = pill.dataset.areaPill;
        pill.classList.toggle('active', (!areaId && val === 'all') || val === areaId);
      });
    },

    renderStatic(sim, pt) {
      if (!sim || !pt || !this.container) return;
      this.lastSim = sim;
      this.lastPt = pt;

      // Atualizar relógio e badge de alarmes no menu lateral esquerdo
      const navClock = this.container.querySelector('#plant-nav-clock');
      if (navClock) {
        navClock.textContent = `t = ${pt.t.toFixed(1)} h · ${pt.phase}`;
      }
      const alarmBadge = this.container.querySelector('#plant-nav-alarm-badge');
      if (alarmBadge && sim.alarms) {
        const critCount = sim.alarms.filter(a => a.level !== 'ok').length;
        alarmBadge.textContent = String(critCount);
        alarmBadge.style.display = critCount > 0 ? 'inline-grid' : 'none';
      }

      // KPIs da Planta
      const setTxt = (id, val) => {
        const el = this.container.querySelector('#' + id);
        if (el) el.textContent = val;
      };
      setTxt('pl-kpi-ac', `${pt.Pe.toFixed(0)} mg/L`);
      setTxt('pl-kpi-mass', `${sim.summary.peakMassKg.toFixed(1)} kg`);
      setTxt('pl-kpi-clavk', `${sim.downstream.finalClavK_kg.toFixed(1)} kg`);
      setTxt('pl-kpi-recov', `${sim.downstream.overallRecoveryPct.toFixed(1)}%`);
      setTxt('pl-kpi-therm', `${pt.Q_tot.toFixed(0)} kW`);
      setTxt('pl-kpi-energy', `${sim.summary.energyPerKg} kWh/kg`);

      const thermEl = this.container.querySelector('#pl-kpi-therm');
      if (thermEl) {
        thermEl.classList.toggle('text-danger', pt.Q_spec > 3.0);
        thermEl.classList.toggle('text-cyan', pt.Q_spec <= 3.0);
      }

      // Sincronizar select downstream
      const routeSel = this.container.querySelector('#downstream-route-select');
      if (routeSel && routeSel.value !== sim.config.downstreamRoute) {
        routeSel.value = sim.config.downstreamRoute;
      }

      // Barras segmentadas de recuperação por etapa
      const barsEl = this.container.querySelector('#plant-downstream-bars');
      if (barsEl) {
        barsEl.innerHTML = sim.downstream.steps.map((st, idx) => {
          const pct = Math.min(100, Math.max(4, st.pct));
          const segCount = 20;
          const activeSegs = Math.round((pct / 100) * segCount);
          const color = idx < 3 ? '#14f1d9' : (idx < 5 ? '#38bdf8' : '#fbbf24');
          let segsHtml = '';
          for (let s = 0; s < segCount; s++) {
            segsHtml += `<span class="seg-tick" style="background:${s < activeSegs ? color : 'rgba(148,163,184,0.14)'}"></span>`;
          }
          return `
            <div class="seg-row">
              <div class="seg-row-head">
                <span class="seg-tag">${st.tag}</span>
                <span class="seg-name">${st.name}</span>
                <span class="seg-val">${st.massKg.toFixed(1)} kg <small>(${st.pct}%)</small></span>
              </div>
              <div class="seg-track">${segsHtml}</div>
            </div>
          `;
        }).join('');
      }

      const routeNoteEl = this.container.querySelector('#downstream-route-note');
      if (routeNoteEl) {
        routeNoteEl.textContent = sim.downstream.captureNote + (sim.downstream.solventM3 > 0
          ? ` | Solvente: ${sim.downstream.solventM3} m³ (Reciclo E-501: ${sim.downstream.solventRecycledM3} m³).`
          : ' | Sem solvente orgânico; eluição com NaCl 10%.');
      }

      // Atualizar inspetores laterais e cena 3D
      this.updateInspector(sim, pt);
      this.updateAreaInspector(sim, pt);
      if (BioSim.Plant3D && BioSim.Plant3D.update) {
        BioSim.Plant3D.update(sim, pt);
      }

      // Cards de Scale-up
      const suEl = this.container.querySelector('#scaleup-cards');
      if (suEl) {
        suEl.innerHTML = sim.scaleUp.map((sc, i) => `
          <div class="scaleup-card ${i === 2 ? 'scaleup-active' : ''}">
            <div class="scaleup-visual">
              <div class="scaleup-vessel" style="width:${34 + i * 26}px;height:${48 + i * 32}px">
                <div class="scaleup-liquid" style="height:${62 + i * 6}%"></div>
                <div class="scaleup-shaft"></div>
              </div>
            </div>
            <h4>${sc.scale}</h4>
            <div class="scaleup-vol">${sc.volume}</div>
            <div class="scaleup-grid">
              <div><span>Dt / Di</span><strong>${sc.Dt} / ${sc.Di}</strong></div>
              <div><span>Rotação N</span><strong>${sc.N}</strong></div>
              <div><span>P/V</span><strong>${sc.PV}</strong></div>
              <div><span>v_tip</span><strong class="${i === 2 ? 'text-amber' : ''}">${sc.vtip}</strong></div>
              <div><span>Cisalhamento γ̇</span><strong>${sc.gamma}</strong></div>
              <div><span>kLa</span><strong class="text-cyan">${sc.kLa}</strong></div>
              <div><span>Tempo mistura</span><strong>${sc.tMix}</strong></div>
            </div>
            <div class="scaleup-status">${sc.status}</div>
          </div>
        `).join('');
      }

      // Gráficos inferiores sincronizados
      const cProd = this.container.querySelector('#plant-chart-prod');
      if (cProd) {
        BioSim.Charts.drawTimeSeries(cProd, sim.series, {
          currentTime: pt.t,
          lines: [
            { key: 'Pe', color: '#fbbf24', width: 2.2 },
            { key: 'massAC_kg', color: '#14f1d9', width: 2.0 }
          ],
          normalizeEach: true
        });
      }
      const cFeed = this.container.querySelector('#plant-chart-feed');
      if (cFeed) {
        BioSim.Charts.drawTimeSeries(cFeed, sim.series, {
          currentTime: pt.t,
          lines: [
            { key: 'V', color: '#38bdf8', width: 2.2 },
            { key: 'X', color: '#10b981', width: 2.0 }
          ],
          normalizeEach: true
        });
      }
      const cTherm = this.container.querySelector('#plant-chart-therm');
      if (cTherm) {
        BioSim.Charts.drawTimeSeries(cTherm, sim.series, {
          currentTime: pt.t,
          lines: [{ key: 'Q_spec', color: '#f97316', width: 2.2 }],
          yMax: Math.max(4.5, sim.summary.maxQSpec * 1.1),
          threshold: { value: 3.0, color: '#ef4444', label: 'Limite serpentina 3 kW/m³' }
        });
      }
    },

    // 3. INTERAÇÃO COM OS EQUIPAMENTOS: Inspetor detalhado
    updateInspector(sim, pt) {
      if (!sim || !pt || !this.container) return;
      const eq = EQUIPMENT_CATALOG.find(e => e.id === this.selectedId) || EQUIPMENT_CATALOG[7];
      const setTxt = (id, val) => {
        const el = this.container.querySelector('#' + id);
        if (el) el.textContent = val;
      };

      setTxt('insp-tag', eq.id);
      setTxt('insp-area', `ÁREA ${eq.area} — ${eq.areaName.toUpperCase()}`);
      setTxt('insp-name', eq.name);
      setTxt('insp-spec', eq.spec);
      setTxt('insp-notes', eq.notes);

      // Estado operacional (Camada 06)
      const stateEl = this.container.querySelector('#insp-operating-state');
      if (stateEl) {
        const isAlarm = eq.id === 'R-301' && (pt.Q_spec > 3.0 || pt.isFlooded || pt.OD < 20.0);
        const isPaused = !!(BioSim.App && !BioSim.App.playing);
        const isStandby = !isPaused && eq.area === '500' && pt.t < 24;

        stateEl.classList.toggle('alarm', isAlarm);
        stateEl.classList.toggle('paused', (isPaused || isStandby) && !isAlarm);
        const label = stateEl.querySelector('span');
        if (label) {
          if (isAlarm) {
            label.textContent = pt.Q_spec > 3.0
              ? `EM ALARME TÉRMICO · Q/V = ${pt.Q_spec} kW/m³ (> 3,0)`
              : 'EM ALARME OPERACIONAL · VERIFICAR R-301';
          } else if (isPaused) {
            label.textContent = 'PARADO / SIMULAÇÃO PAUSADA';
          } else if (isStandby) {
            label.textContent = 'EM ESPERA (AGUARDANDO COLHEITA DO LOTE)';
          } else {
            label.textContent = 'EM OPERAÇÃO NORMAL (SIMULAÇÃO ATIVA)';
          }
        }
      }

      // Conexões diretas e Correntes de Entrada e Saída (com cores padronizadas)
      const connectionsEl = this.container.querySelector('#insp-connections');
      if (connectionsEl) {
        const incoming = PROCESS_STREAMS.filter(s => s.to === eq.id);
        const outgoing = PROCESS_STREAMS.filter(s => s.from === eq.id);

        const formatStreamRow = (dir, s) => {
          const peerId = dir === 'ENTRADA' ? s.from : s.to;
          const isRealEq = EQUIPMENT_CATALOG.some(item => item.id === peerId);
          const peerBadge = isRealEq
            ? `<button type="button" class="conn-eq-jump" data-jump-eq="${peerId}" title="Ir para ${peerId}">${peerId}</button>`
            : `<span class="conn-term">${peerId.replace('-OUT', '')}</span>`;

          return `
            <div class="insp-stream-row">
              <div class="insp-stream-top">
                <span class="stream-dir-badge ${dir === 'ENTRADA' ? 'dir-in' : 'dir-out'}">${dir} · ${s.id}</span>
                ${peerBadge}
              </div>
              <div class="insp-stream-desc">
                <i class="stream-dot" style="background:${s.color}"></i>
                <strong>${s.label}</strong>
                <small>(${s.typeLabel})</small>
              </div>
            </div>
          `;
        };

        const html = [
          ...incoming.map(s => formatStreamRow('ENTRADA', s)),
          ...outgoing.map(s => formatStreamRow('SAÍDA', s))
        ].join('');

        connectionsEl.innerHTML = html || '<div class="insp-connection-row"><span>CONEXÕES</span><strong>Unidade autônoma</strong></div>';

        connectionsEl.querySelectorAll('[data-jump-eq]').forEach(btn => {
          btn.addEventListener('click', () => {
            this.chooseEquipment(btn.dataset.jumpEq, true);
          });
        });
      }

      // Parâmetros operacionais ao vivo vinculados ao equipamento
      const metricsEl = this.container.querySelector('#insp-live-metrics');
      if (metricsEl) {
        let rows = [];
        if (eq.id === 'R-301') {
          rows = [
            ['Volume Útil Atual', `${pt.V.toFixed(2)} / 41,92 m³`],
            ['Agitação / Torque', `${pt.N} rpm | ${pt.torque} kN·m`],
            ['Oxigênio Dissolvido / kLa', `${pt.OD}% | ${pt.kLa} h⁻¹`],
            ['Biomassa (X) / Viscosidade', `${pt.X} g/L | ${pt.muAp} mPa·s`],
            ['Título AC / Massa no Vaso', `${pt.Pe} mg/L | ${pt.massAC_kg} kg`],
            ['Carga Térmica (Q/V)', `${pt.Q_spec} kW/m³ (${pt.Q_tot} kW)`]
          ];
        } else if (['V-101', 'V-102', 'P-101'].includes(eq.id)) {
          rows = [
            ['Meio Formulado', sim.media.shortName],
            ['Carga de Carbono Inicial', `${sim.media.C_mol_L} mol C/L`],
            ['Glicerol na Alimentação', `${sim.media.SG_feed} g/L`],
            ['Vazão Dosadora P-101 (F)', `${(pt.F * 1000).toFixed(0)} L/h`],
            ['Glicerol Residual (SG)', `${pt.SG} g/L (Complexo: ${pt.SC} g/L)`]
          ];
        } else if (['R-201', 'K-201', 'E-201', 'F-201'].includes(eq.id)) {
          const airFlowM3Min = (sim.config.vvm * pt.V).toFixed(1);
          rows = [
            ['Vazão de Ar Estéril', `${sim.config.vvm.toFixed(2)} vvm (${airFlowM3Min} m³/min)`],
            ['Retenção Filtro F-201', '0,2 µm PTFE hidrofóbico (LRV > 7)'],
            ['Demanda O₂ (OUR)', `${pt.OUR} mmol O₂/(L·h)`],
            ['Inóculo Semente R-201', '4,0% v/v (~1,08 m³ → 0,95 g/L)']
          ];
        } else if (['T-401', 'C-401'].includes(eq.id)) {
          rows = [
            ['Resfriamento de Colheita', `${pt.tempC} °C → 10,0 °C`],
            ['Volume de Lote no Pico', `${sim.summary.peakVolume} m³ @ ${sim.summary.peakTimeH} h`],
            ['Torta de Biomassa (S-08)', `${sim.downstream.biomassCakeKg} kg separados`],
            ['Viscosidade na Clarificação', `${pt.muAp} mPa·s (Máx: ${sim.summary.maxMuAp} mPa·s)`]
          ];
        } else {
          // Equipamentos da Área 500 (T-501 a DR-501)
          const stepMatch = sim.downstream.steps.find(st => st.tag === eq.id) ||
            (eq.id === 'DR-501' ? sim.downstream.steps[sim.downstream.steps.length - 1] : null);
          rows = [
            ['Rota Downstream Ativa', sim.downstream.routeLabel],
            ['Condição de Extração', `pH ${sim.config.extractionPH.toFixed(1)} | ${sim.config.extractionTemp.toFixed(0)} °C`],
            ['Solvente em Circuito', `${sim.downstream.solventM3} m³ (Reciclo: ${sim.downstream.solventRecycledM3} m³)`],
            ['Massa Equivalente na Etapa', stepMatch ? `${stepMatch.massKg} kg (${stepMatch.pct}%)` : `${sim.downstream.finalClavK_kg} kg Clav-K⁺`],
            ['Produto Final Seco (DR-501)', `${sim.downstream.finalClavK_kg} kg (${sim.downstream.overallRecoveryPct}% rec.)`]
          ];
        }
        metricsEl.innerHTML = rows.map(r => `<div class="insp-kv"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join('');
      }

      // Instrumentação associada (Camada 05)
      const instEl = this.container.querySelector('#insp-instruments');
      if (instEl) {
        instEl.innerHTML = (eq.instruments || [])
          .map(code => `<span class="inst-chip">${code}</span>`)
          .join('');
      }

      const openBtn = this.container.querySelector('#btn-open-reactor-from-plant');
      if (openBtn) {
        openBtn.style.display = eq.id === 'R-301' ? 'inline-flex' : 'none';
      }
    },

    // 5. VISUALIZAÇÃO POR ÁREA: Sequência operacional, correntes e indicadores da área
    updateAreaInspector(sim, pt) {
      if (!sim || !pt || !this.container) return;
      const titleEl = this.container.querySelector('#area-insp-title');
      const descEl  = this.container.querySelector('#area-insp-desc');
      const seqEl   = this.container.querySelector('#area-insp-sequence');
      const strEl   = this.container.querySelector('#area-insp-streams');
      const kpiEl   = this.container.querySelector('#area-insp-kpis');
      const clearBtn= this.container.querySelector('#btn-clear-area-filter');

      if (!this.selectedArea) {
        if (titleEl) titleEl.textContent = 'Visualização por Área · Visão Geral (100–500)';
        if (descEl) descEl.textContent = 'Selecione uma Área Industrial (100 a 500) na planta 3D, nos filtros superiores ou na sequência abaixo para destacar seus equipamentos, correntes e indicadores.';
        if (clearBtn) clearBtn.style.display = 'none';
        if (seqEl) seqEl.innerHTML = '';
        if (strEl) strEl.innerHTML = '';
        if (kpiEl) {
          kpiEl.innerHTML = `
            <div class="insp-kv"><span>Áreas Ativas</span><strong>5 Áreas (100 a 500) · 20 Equipamentos</strong></div>
            <div class="insp-kv"><span>Correntes Mapeadas</span><strong>25 Correntes PFD (5 classes de fluido)</strong></div>
          `;
        }
        return;
      }

      const meta = AREA_METADATA[this.selectedArea];
      if (!meta) return;
      if (clearBtn) clearBtn.style.display = 'inline-block';
      if (titleEl) titleEl.textContent = meta.title;
      if (descEl) descEl.textContent = meta.desc;

      // Sequência operacional da área selecionada
      if (seqEl) {
        seqEl.innerHTML = `
          <div class="insp-section-label">Sequência Operacional da Área ${this.selectedArea}</div>
          <div class="area-seq-chips">
            ${meta.sequence.map(eqId => `
              <button type="button" class="seq-tag ${eqId === this.selectedId ? 'selected' : ''}" data-area-eq="${eqId}">${eqId}</button>
            `).join('<i class="seq-arr">→</i>')}
          </div>
        `;
        seqEl.querySelectorAll('[data-area-eq]').forEach(btn => {
          btn.addEventListener('click', () => this.chooseEquipment(btn.dataset.areaEq, true));
        });
      }

      // Correntes associadas à área selecionada
      if (strEl) {
        const areaSet = new Set(meta.sequence);
        const relStreams = PROCESS_STREAMS.filter(s => areaSet.has(s.from) || areaSet.has(s.to));
        strEl.innerHTML = `
          <div class="insp-section-label">Correntes Associadas (${relStreams.length})</div>
          <div class="area-streams-list">
            ${relStreams.map(s => `
              <div class="area-stream-pill">
                <i style="background:${s.color}"></i>
                <b>${s.id}</b>
                <span>${s.from} → ${s.to.replace('-OUT', '')}: ${s.label}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Indicadores correspondentes à área selecionada
      if (kpiEl) {
        let areaKpis = [];
        if (this.selectedArea === '100') {
          areaKpis = [
            ['Meio Selecionado', sim.media.shortName],
            ['Vazão Fed-Batch (P-101)', `${(pt.F * 1000).toFixed(0)} L/h`],
            ['Carbono Total Inicial', `${sim.media.C_mol_L} mol C/L`]
          ];
        } else if (this.selectedArea === '200') {
          areaKpis = [
            ['Aeração Estéril (F-201)', `${sim.config.vvm.toFixed(2)} vvm`],
            ['Consumo O₂ (OUR)', `${pt.OUR} mmol/(L·h)`],
            ['Margem de kLa', `${pt.kLaMargin}× sobre piso 20%`]
          ];
        } else if (this.selectedArea === '300') {
          areaKpis = [
            ['Título AC / Massa R-301', `${pt.Pe} mg/L (${pt.massAC_kg} kg)`],
            ['Biomassa / OD Atual', `${pt.X} g/L | OD ${pt.OD}%`],
            ['Carga Térmica Q/V', `${pt.Q_spec} kW/m³`]
          ];
        } else if (this.selectedArea === '400') {
          areaKpis = [
            ['Temperatura T-401', '10,0 °C (Resfriado)'],
            ['Biomassa Separada C-401', `${sim.downstream.biomassCakeKg} kg`],
            ['Clarificado para Área 500', `${sim.downstream.steps[2].massKg} kg AC`]
          ];
        } else if (this.selectedArea === '500') {
          areaKpis = [
            ['Captura Extração (EX-401)', `${sim.downstream.steps[4].massKg} kg (${sim.downstream.steps[4].pct}%)`],
            ['Reciclo Solvente (E-501)', `${sim.downstream.solventRecycledM3} m³ Acetato Etila`],
            ['Clavulanato K⁺ Final (DR-501)', `${sim.downstream.finalClavK_kg} kg (${sim.downstream.overallRecoveryPct}%)`]
          ];
        }
        kpiEl.innerHTML = `<div class="insp-section-label">Indicadores Operacionais da Área ${this.selectedArea}</div>` +
          areaKpis.map(r => `<div class="insp-kv"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join('');
      }
    },

    drawFrame(dtSec, sim, pt) {
      if (!sim || !pt || !this.container || this.subMode === 'scaleup') return;
      if (BioSim.Plant3D && BioSim.Plant3D.available) {
        BioSim.Plant3D.drawFrame(dtSec, sim, pt);
      }
    }
  };

  BioSim.PlantView = PlantView;
})(window);
