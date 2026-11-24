/* ============================================================================
 * BioSim — Biblioteca de Gráficos Científicos (High-DPI Canvas & SVG)
 * Inspiração visual: Dark Digital Twin SCADA (cyan/teal, amber/gold, violet)
 * ============================================================================ */

(function (global) {
  'use strict';

  const BioSim = global.BioSim || (global.BioSim = {});
  const Charts = BioSim.Charts || (BioSim.Charts = {});

  // Polyfill seguro de roundRect para navegadores mais antigos
  if (global.CanvasRenderingContext2D && !global.CanvasRenderingContext2D.prototype.roundRect) {
    global.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rad = typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 4);
      this.moveTo(x + rad, y);
      this.arcTo(x + w, y, x + w, y + h, rad);
      this.arcTo(x + w, y + h, x, y + h, rad);
      this.arcTo(x, y + h, x, y, rad);
      this.arcTo(x, y, x + w, y, rad);
      this.closePath();
      return this;
    };
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(100, Math.round(rect.width));
    const h = Math.max(60, Math.round(rect.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  /**
   * Gráfico de linha/área multi-série com cursor sincronizado ao tempo de reprodução
   */
  Charts.drawTimeSeries = function (canvas, series, opts) {
    if (!canvas || !series || series.length < 2) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const pad = {
      top: opts.padTop != null ? opts.padTop : 16,
      right: opts.padRight != null ? opts.padRight : 14,
      bottom: opts.padBottom != null ? opts.padBottom : 22,
      left: opts.padLeft != null ? opts.padLeft : 42
    };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;
    if (pw <= 10 || ph <= 10) return;

    const tMax = series[series.length - 1].t || 170;
    const lines = opts.lines || [];

    // Escalas Y (esquerda e opcionalmente direita normalizada por série)
    const normalizeEach = !!opts.normalizeEach;
    let globalMax = 0;
    if (!normalizeEach) {
      for (const ln of lines) {
        for (const p of series) {
          const v = p[ln.key] || 0;
          if (v > globalMax) globalMax = v;
        }
      }
      if (opts.yMax != null) globalMax = Math.max(globalMax, opts.yMax);
      if (globalMax <= 0) globalMax = 1;
      globalMax *= 1.08;
    }

    // Grade horizontal
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
    ctx.lineWidth = 1;
    const gridRows = opts.compact ? 2 : 4;
    ctx.font = '10px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let r = 0; r <= gridRows; r++) {
      const y = pad.top + (ph * r) / gridRows;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();

      if (!opts.hideYAxis) {
        const val = normalizeEach
          ? Math.round((1 - r / gridRows) * 100) + '%'
          : formatCompact(globalMax * (1 - r / gridRows));
        ctx.fillText(val, pad.left - 6, y);
      }
    }

    // Eixo X (tempo h)
    if (!opts.hideXAxis) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ticks = opts.compact ? [0, Math.round(tMax / 2), Math.round(tMax)] : [0, 30, 60, 90, 120, 150, Math.round(tMax)];
      for (const tk of ticks) {
        const x = pad.left + (tk / tMax) * pw;
        ctx.fillText(tk + 'h', x, pad.top + ph + 5);
      }
    }

    // Linha de limite/referência opcional (ex: OD 20%, Q/V 3 kW/m³)
    if (opts.threshold && !normalizeEach) {
      const yTh = pad.top + ph * (1 - opts.threshold.value / globalMax);
      if (yTh >= pad.top && yTh <= pad.top + ph) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = opts.threshold.color || '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pad.left, yTh);
        ctx.lineTo(pad.left + pw, yTh);
        ctx.stroke();
        if (opts.threshold.label) {
          ctx.fillStyle = opts.threshold.color || '#ef4444';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(opts.threshold.label, pad.left + pw - 2, yTh - 2);
        }
        ctx.restore();
      }
    }

    // Curvas e preenchimento gradiente
    for (const ln of lines) {
      let maxV = globalMax;
      if (normalizeEach) {
        maxV = ln.max || Math.max(1e-6, ...series.map(p => p[ln.key] || 0)) * 1.1;
      }

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < series.length; i++) {
        const p = series[i];
        const x = pad.left + (p.t / tMax) * pw;
        const y = pad.top + ph * (1 - Math.min(1, Math.max(0, (p[ln.key] || 0) / maxV)));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Gradiente suave sob a curva
      if (ln.fill !== false) {
        ctx.save();
        ctx.lineTo(pad.left + pw, pad.top + ph);
        ctx.lineTo(pad.left, pad.top + ph);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ph);
        grad.addColorStop(0, hexToRgba(ln.color, opts.compact ? 0.28 : 0.20));
        grad.addColorStop(1, hexToRgba(ln.color, 0.0));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // Linha principal luminosa
      ctx.strokeStyle = ln.color;
      ctx.lineWidth = ln.width || 2;
      if (ln.dashed) ctx.setLineDash([4, 3]);
      ctx.shadowColor = hexToRgba(ln.color, 0.45);
      ctx.shadowBlur = opts.compact ? 4 : 7;
      ctx.stroke();
      ctx.restore();
    }

    // Cursor vertical de tempo atual
    if (opts.currentTime != null) {
      const cx = pad.left + (Math.min(tMax, Math.max(0, opts.currentTime)) / tMax) * pw;
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, pad.top);
      ctx.lineTo(cx, pad.top + ph);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pontos brilhantes na interseção
      const curPt = findPointAtTime(series, opts.currentTime);
      if (curPt) {
        for (const ln of lines) {
          let maxV = globalMax;
          if (normalizeEach) {
            maxV = ln.max || Math.max(1e-6, ...series.map(p => p[ln.key] || 0)) * 1.1;
          }
          const cy = pad.top + ph * (1 - Math.min(1, Math.max(0, (curPt[ln.key] || 0) / maxV)));
          ctx.beginPath();
          ctx.arc(cx, cy, opts.compact ? 3 : 4, 0, Math.PI * 2);
          ctx.fillStyle = ln.color;
          ctx.shadowColor = ln.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.strokeStyle = '#070c12';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  /**
   * Mini sparkline com suporte a rótulos de eixo Y e marcas temporais X (estilo BioFactory Control Center)
   */
  Charts.drawSparkline = function (canvas, series, key, color, currentTime, yMinOpt, yMaxOpt, opts) {
    if (!canvas || !series || series.length < 2) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const showAxes = opts && opts.showAxes !== false;
    const pad = showAxes
      ? { top: 5, bottom: 14, left: 28, right: 6 }
      : { top: 4, bottom: 4, left: 2, right: 2 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;
    if (pw <= 10 || ph <= 8) return;

    const scale = (opts && opts.scale) || 1;
    let minV = yMinOpt != null ? yMinOpt * scale : Math.min(...series.map(p => (p[key] || 0) * scale));
    let maxV = yMaxOpt != null ? yMaxOpt * scale : Math.max(...series.map(p => (p[key] || 0) * scale));
    if (maxV - minV < 1e-4) { minV -= 0.5; maxV += 0.5; }
    const tMax = series[series.length - 1].t || 170;

    // Linhas de grade horizontais e rótulos Y
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= 2; r++) {
      const y = pad.top + (ph * r) / 2;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();

      if (showAxes) {
        const val = maxV - (r / 2) * (maxV - minV);
        const decimals = opts && opts.decimals != null ? opts.decimals : (maxV < 10 ? 1 : 0);
        ctx.fillStyle = '#64748b';
        ctx.font = '500 8.5px "JetBrains Mono", Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toFixed(decimals).replace('.', ','), pad.left - 5, y);
      }
    }

    // Marcas de tempo X (0 h, 24 h, 48 h, 72 h, 96 h / tMax)
    if (showAxes) {
      const xTicks = [0, 24, 48, 72, 96, Math.round(tMax)];
      ctx.fillStyle = '#64748b';
      ctx.font = '500 8px "JetBrains Mono", Consolas, monospace';
      ctx.textBaseline = 'top';
      xTicks.forEach((tk, i) => {
        if (tk > tMax) return;
        if (i === xTicks.length - 2 && tMax - tk < 20) return;
        const x = pad.left + (tk / tMax) * pw;
        ctx.textAlign = i === 0 ? 'left' : (tk >= tMax - 2 ? 'right' : 'center');
        ctx.fillText(`${tk} h`, x, pad.top + ph + 3);
      });
    }

    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const p = series[i];
      const x = pad.left + (p.t / tMax) * pw;
      const val = (p[key] || 0) * scale;
      const norm = (val - minV) / (maxV - minV);
      const y = pad.top + ph * (1 - Math.min(1, Math.max(0, norm)));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.save();
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ph);
    grad.addColorStop(0, hexToRgba(color, 0.30));
    grad.addColorStop(1, hexToRgba(color, 0.0));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.9;
    ctx.shadowColor = hexToRgba(color, 0.55);
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cursor de tempo atual
    if (currentTime != null) {
      const curPt = findPointAtTime(series, currentTime);
      if (curPt) {
        const cx = pad.left + (curPt.t / tMax) * pw;
        const val = (curPt[key] || 0) * scale;
        const norm = (val - minV) / (maxV - minV);
        const cy = pad.top + ph * (1 - Math.min(1, Math.max(0, norm)));
        ctx.beginPath();
        ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  /**
   * Gráfico Donut de Espectro de Produtos (Aba 3 — inspirado nas referências dark bio-UI)
   */
  Charts.drawDonut = function (canvas, segments, centerTitle, centerSub) {
    if (!canvas || !segments || !segments.length) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.39;
    const thickness = Math.max(10, r * 0.26);

    const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0) || 1;
    let startAngle = -Math.PI / 2;

    // Anel de fundo
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = thickness;
    ctx.stroke();

    for (const seg of segments) {
      if (seg.value <= 0) continue;
      const sweep = (seg.value / total) * Math.PI * 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle + 0.02, startAngle + sweep - 0.02);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.shadowColor = hexToRgba(seg.color, 0.45);
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
      startAngle += sweep;
    }

    // Texto central
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 18px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(centerTitle || '', cx, cy - 6);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillText(centerSub || '', cx, cy + 12);
  };

  function findPointAtTime(series, t) {
    if (!series || !series.length) return null;
    const tMax = series[series.length - 1].t || 1;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round((t / tMax) * (series.length - 1))));
    return series[idx];
  }

  function hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(20, 241, 217, ${alpha})`;
    const clean = hex.slice(1);
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function formatCompact(v) {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    if (v >= 100) return Math.round(v).toString();
    if (v >= 10) return v.toFixed(0);
    return v.toFixed(1);
  }

  Charts.findPointAtTime = findPointAtTime;
  Charts.hexToRgba = hexToRgba;
})(window);
