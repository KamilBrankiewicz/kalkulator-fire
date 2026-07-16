const FireChart = (() => {
  let growthChart = null;
  let compareChart = null;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // #rrggbb + przezroczystość → rgba (do wypełnienia pod linią)
  function withAlpha(hex, alpha) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function formatAmountShort(v) {
    if (Math.abs(v) >= 1000000) return (v / 1000000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' mln';
    if (Math.abs(v) >= 1000) return Math.round(v / 1000).toLocaleString('pl-PL') + ' tys.';
    return String(Math.round(v));
  }

  function baseOptions(xTitle) {
    const gridColor = withAlpha(cssVar('--border', '#333333'), 0.6) || cssVar('--border', '#333');
    const textColor = cssVar('--text-muted', cssVar('--text', '#ccc'));
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, maxTicksLimit: 9, font: { size: 11 } },
          title: xTitle
            ? { display: true, text: xTitle, color: textColor, font: { size: 11 } }
            : undefined,
        },
        y: {
          grid: { color: gridColor },
          border: { display: false },
          ticks: {
            color: textColor,
            font: { size: 11 },
            maxTicksLimit: 6,
            callback: (v) => formatAmountShort(v),
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: cssVar('--text', '#eee'),
            boxWidth: 14,
            boxHeight: 2,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString('pl-PL')} zł`,
          },
        },
      },
    };
  }

  function renderGrowthChart(canvas, series, target) {
    if (growthChart) growthChart.destroy();
    const labels = series.map((p) => Math.round(p.age * 10) / 10);
    const data = series.map((p) => Math.round(p.capital));
    const accent = cssVar('--accent', '#baff3d');

    growthChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Majątek netto',
            data,
            borderColor: accent,
            backgroundColor: withAlpha(accent, 0.14),
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2.5,
          },
          {
            label: 'Cel FIRE',
            data: series.map(() => Math.round(target)),
            borderColor: cssVar('--danger', '#ff5c8a'),
            backgroundColor: 'transparent',
            borderDash: [6, 6],
            pointRadius: 0,
            borderWidth: 1.5,
          },
        ],
      },
      options: baseOptions('Wiek'),
    });
    return growthChart;
  }

  function renderComparisonChart(canvas, scenarioSeries) {
    if (compareChart) compareChart.destroy();
    const palette = [
      cssVar('--accent', '#baff3d'),
      cssVar('--ikze-color', '#7c5cff'),
      cssVar('--ppk-color', '#ffb648'),
      cssVar('--danger', '#ff5c8a'),
    ];
    const maxLen = Math.max(...scenarioSeries.map((s) => s.series.length));
    const labels = Array.from({ length: maxLen }, (_, i) => i);

    const datasets = scenarioSeries.map((s, i) => ({
      label: s.name,
      data: s.series.map((p) => Math.round(p.capital)),
      borderColor: palette[i % palette.length],
      backgroundColor: 'transparent',
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2.5,
    }));

    compareChart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: baseOptions('Lata od dziś'),
    });
    return compareChart;
  }

  return { renderGrowthChart, renderComparisonChart };
})();
