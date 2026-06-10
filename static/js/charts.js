/**
 * charts.js — Multi-station price comparison chart.
 * Handles: station/fuel checkboxes, time range dropdown,
 *          panel collapse (desktop), filter drawer (mobile),
 *          API fetch for price data.
 * Depends on: app.js, window.CHARTS_STATIONS
 *
 * API endpoint expected: GET /api/prices/{station_id}?days={n}
 * Returns: [{ time: "Jun 8, 14:32", e5: 1.879, e10: 1.859, diesel: 1.679 }, ...]
 */
(function () {
  'use strict';

  /* Cache: { [stationId]: { [period]: [{timestamp, min_e5, max_e5, avg_e5, min_e10, ..., avg_diesel}] } } */
  const priceCache = {};
  let chart;

  /* ── DOM refs ────────────────────────────────────────────── */
  const panel          = document.getElementById('charts-panel');
  const collapseBtn    = document.getElementById('panel-collapse');
  const reopenBtn      = document.getElementById('panel-reopen');
  const filterBtn      = document.getElementById('charts-filter-btn');
  const overlay        = document.getElementById('drawer-overlay');
  const applyBtn       = document.getElementById('panel-apply');
  const rangeSelect    = document.getElementById('range-select');
  const subtitle       = document.getElementById('charts-subtitle');
  const chartCanvas    = document.getElementById('multi-chart');
  const stationChecks  = document.querySelectorAll('input[name="station"]');
  const fuelChecks     = document.querySelectorAll('#fuels-section input[name="fuel"]');

  /* ── State ───────────────────────────────────────────────── */
  let activePeriod = parseInt(rangeSelect.value, 10);

  /* ── Init ────────────────────────────────────────────────── */
  initChart();
  loadAndRender();

  /* ── Desktop: collapse / reopen panel ───────────────────── */
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      panel.classList.add('collapsed');
      if (reopenBtn) reopenBtn.hidden = false;
      if (chart) setTimeout(() => chart.resize(), 220); /* after CSS transition */
    });
  }
  if (reopenBtn) {
    reopenBtn.addEventListener('click', () => {
      panel.classList.remove('collapsed');
      reopenBtn.hidden = true;
      if (chart) setTimeout(() => chart.resize(), 220);
    });
  }

  /* ── Mobile: open / close filter drawer ─────────────────── */
  function openDrawer() {
    panel.classList.add('drawer-open');
    overlay.hidden = false;
    filterBtn.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    panel.classList.remove('drawer-open');
    overlay.hidden = true;
    filterBtn.setAttribute('aria-expanded', 'false');
  }
  if (filterBtn)  filterBtn.addEventListener('click', openDrawer);
  if (overlay)    overlay.addEventListener('click', closeDrawer);
  if (applyBtn)   applyBtn.addEventListener('click', () => { closeDrawer(); loadAndRender(); });

  /* ── Filter controls: re-render on change (desktop) ─────── */
  stationChecks.forEach(cb => cb.addEventListener('change', () => {
    if (window.innerWidth > 680) loadAndRender();
  }));
  fuelChecks.forEach(cb => cb.addEventListener('change', () => {
    if (window.innerWidth > 680) loadAndRender();
  }));
  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      activePeriod = parseInt(rangeSelect.value, 10);
      loadAndRender();
    });
  }

  /* ── Chart initialisation ────────────────────────────────── */
  function initChart() {
    if (!chartCanvas) return;
    chart = new Chart(chartCanvas, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        ...baseChartOptions(),
        plugins: {
          ...baseChartOptions().plugins,
          legend: {
            display: false,  /* legend lives in the left panel (checkboxes) */
          },
          tooltip: {
            mode: 'index', intersect: false,
            callbacks: {
              title:  items => items[0]?.label || '',
              label:  ctx   => ` ${ctx.dataset.label}: ${formatPrice(ctx.parsed.y)}`,
            },
          },
        },
      },
    });
  }

  /* ── Fetch + render ──────────────────────────────────────── */
  function formatTimestamp(ts) {
    const d = new Date(ts);
    if (activePeriod <= 24) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  async function loadAndRender() {
    if (!chart) return;

    /* Collect selected stations and fuels */
    const selectedStations = [...stationChecks].filter(cb => cb.checked).map(cb => cb.value);
    const selectedFuels    = [...fuelChecks].filter(cb => cb.checked).map(cb => cb.value);

    if (!selectedStations.length || !selectedFuels.length) {
      chart.data.datasets = [];
      chart.data.labels   = [];
      chart.update();
      subtitle.textContent = 'Select at least one station and fuel type.';
      return;
    }

    /* Fetch price data for all selected stations (cache per station+period) */
      const fetchPromises = selectedStations.map(id => fetchPrices(id, activePeriod));
      const results = await Promise.allSettled(fetchPromises);

      /* Build a merged timeline (union of all timestamps) */
      const timeSet = new Set();
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') r.value.forEach(p => timeSet.add(p.timestamp));
      });
      const labels = [...timeSet].sort();

      /* Build Chart.js datasets: one per (station × fuel) combination */
      const datasets = [];
      results.forEach((result, si) => {
        if (result.status !== 'fulfilled') return;
        const stationData = result.value;
        const stationId   = selectedStations[si];
        const checkbox    = document.querySelector(`input[name="station"][value="${stationId}"]`);
        if (!checkbox) return;

        const ci    = parseInt(checkbox.dataset.ci, 10) || 0;
        const color = STATION_COLORS[ci];
        const brand = checkbox.dataset.brand;

        selectedFuels.forEach(fuel => {
          /* Map station data to the merged timeline */
          const timeToPrice = Object.fromEntries(stationData.map(p => [p.timestamp, p[`avg_${fuel}`]]));
          const dataPoints  = labels.map(t => {
            const v = timeToPrice[t];
            return v != null ? parseFloat(v) : null;
          });

          datasets.push({
            label:           `${brand} ${FUEL_LABEL[fuel]}`,
            data:            dataPoints,
            borderColor:     color,
            borderDash:      FUEL_DASH[fuel],
            borderWidth:     2.5,
            backgroundColor: 'transparent',
            spanGaps:        true,
            tension:         0,
            _station: brand,
            _fuel:    fuel,
          });
        });
      });

      chart.data.labels   = labels.map(formatTimestamp);
      chart.data.datasets = datasets;
      chart.update();

      /* Update subtitle */
      const stationNames = selectedStations
        .map(id => document.querySelector(`input[name="station"][value="${id}"]`)?.dataset.brand)
        .filter(Boolean);
      const fuelNames = selectedFuels.map(f => FUEL_LABEL[f]);
      subtitle.textContent = `${stationNames.join(', ')} — ${fuelNames.join(', ')}`;
    }

  /* ── API fetch with caching ──────────────────────────────── */
  async function fetchPrices(stationId, period) {
    const key = `${stationId}:${period}`;
    if (priceCache[key]) return priceCache[key];

    const resp = await fetch(`/api/stations/${stationId}/prices/history?period=${period}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    priceCache[key] = data;
    return data;
  }

})();
