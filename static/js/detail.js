/**
 * detail.js — Station detail page.
 * Handles: price history Chart.js, fuel checkboxes, time range, mini-map.
 * Depends on: app.js, window.PRICE_DATA, STATION_LAT, STATION_LNG, STATION_CI
 *
 * window.PRICE_DATA expected shape (JSON from backend):
 *   [{ time: "Jun 8, 14:32", e5: 1.879, e10: 1.859, diesel: 1.679 }, ...]
 */
(function () {
  'use strict';

  /* ── "Updated N min ago" live counter ────────────────────── */
  const updatedEl = document.getElementById('last-updated');
  if (updatedEl && updatedEl.dataset.ts) {
    function refreshUpdated() {
      updatedEl.textContent = 'Updated ' + (timeAgo(updatedEl.dataset.ts) || updatedEl.textContent);
    }
    refreshUpdated();
    setInterval(refreshUpdated, 60_000);
  }

  /* ── Mini-map (user location + station pin) ──────────────── */
  const miniMapEl = document.getElementById('mini-map');
  if (miniMapEl && window.STATION_LAT && window.STATION_LNG) {
    const stLat = window.STATION_LAT;
    const stLng = window.STATION_LNG;
    const ci    = window.STATION_CI ?? 0;
    const color = STATION_COLORS[ci];

    const miniMap = L.map('mini-map', {
      zoomControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false, keyboard: false,
    }).setView([stLat, stLng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19,
    }).addTo(miniMap);

    /* Station pin */
    const stIcon = L.divIcon({
      className: '',
      html: `<div class="leaflet-pin-dot" style="background:${color}"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 14],
    });
    L.marker([stLat, stLng], { icon: stIcon }).addTo(miniMap);

    /* User location (if available) */
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: uLat, longitude: uLng } = pos.coords;
        const userIcon = L.divIcon({
          className: '',
          html: `<div style="width:11px;height:11px;border-radius:50%;background:var(--accent);border:2px solid white;box-shadow:0 0 0 3px var(--accent-light)"></div>`,
          iconSize: [11, 11], iconAnchor: [5, 5],
        });
        L.marker([uLat, uLng], { icon: userIcon }).addTo(miniMap);

        /* Re-centre to show both points */
        const bounds = L.latLngBounds([[uLat, uLng], [stLat, stLng]]).pad(0.3);
        miniMap.fitBounds(bounds);

        /* Distance label */
        const dist = miniMap.distance([uLat, uLng], [stLat, stLng]);
        const km   = (dist / 1000).toFixed(1);
        const distDiv = document.createElement('div');
        distDiv.style.cssText = 'position:absolute;bottom:6px;right:8px;font-size:10px;color:var(--text-muted);background:rgba(255,255,255,.8);padding:1px 5px;border-radius:3px;z-index:500;font-family:var(--font-family)';
        distDiv.textContent = `${km} km`;
        miniMapEl.appendChild(distDiv);
      });
    }
  }

  /* ── Price history chart ─────────────────────────────────── */
  const chartCanvas = document.getElementById('price-chart');
  if (!chartCanvas) return;

  const data = window.PRICE_DATA || [];

  /* Build Chart.js dataset for one fuel type */
  function makeDataset(fuel) {
    return {
      label: FUEL_LABEL[fuel],
      data: data.map(p => p[fuel] != null ? parseFloat(p[fuel]) : null),
      borderColor: FUEL_STROKE[fuel],
      borderDash: FUEL_DASH[fuel],
      borderWidth: 2.5,
      backgroundColor: 'transparent',
      spanGaps: true,
      tension: 0.3,
    };
  }

  const chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: data.map(p => p.time),
      datasets: [makeDataset('e5'), makeDataset('e10'), makeDataset('diesel')],
    },
    options: {
      ...baseChartOptions(),
      plugins: {
        ...baseChartOptions().plugins,
        tooltip: {
          ...baseChartOptions().plugins.tooltip,
          callbacks: {
            title:  items => items[0]?.label || '',
            label:  ctx   => ` ${ctx.dataset.label}: ${formatPrice(ctx.parsed.y)}`,
          },
        },
      },
    },
  });

  /* Diesel hidden by default (matches checkbox state in template) */
  chart.data.datasets[2].hidden = true;
  chart.update('none');

  /* ── Fuel checkboxes ─────────────────────────────────────── */
  document.querySelectorAll('input[name="fuel"]').forEach(cb => {
    /* Sync initial state with Chart.js (diesel unchecked by default) */
    const idx = ['e5', 'e10', 'diesel'].indexOf(cb.value);
    if (idx >= 0) chart.data.datasets[idx].hidden = !cb.checked;

    cb.addEventListener('change', () => {
      const idx = ['e5', 'e10', 'diesel'].indexOf(cb.value);
      if (idx < 0) return;
      chart.data.datasets[idx].hidden = !cb.checked;
      chart.update();
    });
  });

  /* ── Time range dropdown ─────────────────────────────────── */
  const rangeSelect = document.getElementById('range-select');
  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      const days = parseInt(rangeSelect.value, 10);
      /* Fetch new data from API and rebuild chart */
      fetch(`/api/prices/${window.STATION_ID}?days=${days}`)
        .then(r => r.json())
        .then(newData => {
          chart.data.labels = newData.map(p => p.time);
          ['e5', 'e10', 'diesel'].forEach((fuel, i) => {
            chart.data.datasets[i].data = newData.map(p => p[fuel] != null ? parseFloat(p[fuel]) : null);
          });
          chart.update();
        })
        .catch(err => console.error('Failed to load price data:', err));
    });
  }

})();
