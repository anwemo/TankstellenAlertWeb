/**
 * landing.js — Landing page: Leaflet map, fuel filter, station selection.
 * Depends on: app.js (STATION_COLORS, formatPrice), window.STATION_DATA
 */
(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────────── */
  let activeFuel   = 'e5';
  let selectedId   = null;
  const markers    = {};   /* { stationId: L.Marker } */
  let leafletMap;

  /* ── DOM refs ────────────────────────────────────────────── */
  const pageLanding  = document.getElementById('page-main');
  const stationList  = document.getElementById('station-list');
  const pills        = document.querySelectorAll('.fuel-pills .pill');
  const bottomSheet  = document.getElementById('bottom-sheet');
  const sheetBody    = document.getElementById('sheet-body');
  const mobTabs      = document.querySelectorAll('.mob-tab[data-view]');
  const statMin      = document.getElementById('stat-min');
  const statMax      = document.getElementById('stat-max');
  const statAvg      = document.getElementById('stat-avg');
  const statLabel    = document.getElementById('stats-fuel-label');

  /* ── Init ────────────────────────────────────────────────── */
  initMap();
  updateStats();

  /* Set default mobile view (map) */
  if (window.innerWidth <= 680) {
    pageLanding.dataset.view = 'map';
  }

  /* ── Fuel pill switching ─────────────────────────────────── */
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      activeFuel = pill.dataset.fuel;
      pills.forEach(p => {
        const active = p.dataset.fuel === activeFuel;
        p.classList.toggle('active', active);
        p.setAttribute('aria-pressed', active);
      });
      updateAllPrices();
      updateStats();
    });
  });

  /* ── Station row click ───────────────────────────────────── */
  stationList.addEventListener('click', e => {
    /* Allow clicks on "Details →" link to follow normally */
    if (e.target.closest('.btn-details')) return;
    const row = e.target.closest('.station-row');
    if (!row) return;
    selectStation(row.dataset.id === selectedId ? null : row.dataset.id);
  });

  /* ── Mobile tab switching ────────────────────────────────── */
  mobTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      mobTabs.forEach(t => {
        t.classList.toggle('active', t.dataset.view === view);
        t.setAttribute('aria-current', t.dataset.view === view ? 'true' : 'false');
      });
      pageLanding.dataset.view = view;
      /* Re-invalidate Leaflet size after CSS display change */
      if (view === 'map' && leafletMap) {
        requestAnimationFrame(() => leafletMap.invalidateSize());
      }
    });
  });

  /* ── Station selection ───────────────────────────────────── */
  function selectStation(id) {
    selectedId = id;

    /* Update list rows */
    document.querySelectorAll('.station-row').forEach(row => {
      const sel = row.dataset.id === id;
      row.classList.toggle('selected', sel);
      row.setAttribute('aria-selected', sel);
      const detBtn = row.querySelector('.btn-details');
      if (detBtn) {
        detBtn.tabIndex = sel ? 0 : -1;
        detBtn.setAttribute('aria-hidden', !sel);
      }
      /* Scroll selected row into view (list tab) */
      if (sel) row.scrollIntoView({ block: 'nearest' });
    });

    /* Update map markers */
    Object.entries(markers).forEach(([mid, marker]) => {
      const el  = marker.getElement();
      if (!el) return;
      const dot = el.querySelector('.leaflet-pin-dot');
      const lbl = el.querySelector('.leaflet-pin-label');
      if (dot) dot.classList.toggle('selected', mid === id);
      if (lbl) lbl.classList.toggle('selected', mid === id);
    });

    /* Mobile: update or hide bottom sheet */
    if (window.innerWidth <= 680) renderBottomSheet(id);
  }

  /* ── Update all displayed prices when fuel changes ───────── */
  function updateAllPrices() {
    document.querySelectorAll('.station-row').forEach(row => {
      const raw    = row.dataset[activeFuel];
      const isOpen = row.dataset.open === 'true';
      const el     = row.querySelector('.station-price');
      if (el) el.textContent = isOpen && raw ? formatPrice(raw) : '—';
    });

    /* Update Leaflet pin labels */
    Object.entries(markers).forEach(([id, marker]) => {
      const row = document.querySelector(`.station-row[data-id="${id}"]`);
      if (!row) return;
      const raw    = row.dataset[activeFuel];
      const isOpen = row.dataset.open === 'true';
      const el     = marker.getElement();
      if (!el) return;
      const lbl = el.querySelector('.leaflet-pin-label');
      if (lbl) {
        lbl.textContent = isOpen && raw ? formatPrice(raw) : 'closed';
        /* Match border color to station color */
        const ci = row.dataset.ci || 0;
        lbl.style.borderColor = STATION_COLORS[ci] || '';
      }
    });
  }

  /* ── Quick stats (cheapest / highest / avg) ──────────────── */
  function updateStats() {
    statLabel.textContent = `${FUEL_LABEL[activeFuel]} — today`;
    const open = (window.STATION_DATA || []).filter(s => s.is_open && s[`latest_${activeFuel}`]);
    if (!open.length) { [statMin, statMax, statAvg].forEach(el => el.textContent = '—'); return; }
    const prices = open.map(s => parseFloat(s[`latest_${activeFuel}`]));
    statMin.textContent = formatPrice(Math.min(...prices));
    statMax.textContent = formatPrice(Math.max(...prices));
    statAvg.textContent = formatPrice(prices.reduce((a, b) => a + b, 0) / prices.length);
  }

  /* ── Leaflet map initialisation ──────────────────────────── */
  function initMap() {
    const stations    = window.STATION_DATA || [];
    const withCoords  = stations.filter(s => s.lat && s.lng);
    if (!withCoords.length) return;

    /* Centre map on average position of all stations */
    const avgLat = withCoords.reduce((s, st) => s + st.lat, 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, st) => s + st.lng, 0) / withCoords.length;

    leafletMap = L.map('map', { zoomControl: true }).setView([avgLat, avgLng], 13);

    /* CartoDB Positron — neutral light tiles, no API key required */
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(leafletMap);

    /* Create a marker for each station */
    withCoords.forEach(station => {
      const ci    = station.color_index ?? 0;
      const color = STATION_COLORS[ci];
      const raw   = station[`latest_${activeFuel}`];
      const label = station.is_open && raw ? formatPrice(raw) : 'closed';

      const icon = L.divIcon({
        className: '',
        html: `<div class="leaflet-pin-wrap" data-id="${station.id}">
          <div class="leaflet-pin-label" style="border-color:${color}">${label}</div>
          <div class="leaflet-pin-dot${station.is_open ? '' : ' closed'}" style="background:${color}"></div>
        </div>`,
        iconSize:    [64, 44],
        iconAnchor:  [32, 44],
        popupAnchor: [0, -46],
      });

      const marker = L.marker([station.lat, station.lng], { icon }).addTo(leafletMap);

      marker.on('click', () => {
        const newId = selectedId === station.id ? null : station.id;
        selectStation(newId);
        /* On desktop, also scroll list to selected row */
        if (window.innerWidth > 680 && newId) {
          const row = document.querySelector(`.station-row[data-id="${newId}"]`);
          if (row) row.scrollIntoView({ block: 'nearest' });
        }
      });

      markers[station.id] = marker;
    });
  }

  /* ── Mobile bottom sheet ─────────────────────────────────── */
  function renderBottomSheet(id) {
    if (!id) { bottomSheet.hidden = true; return; }
    const st = (window.STATION_DATA || []).find(s => s.id === id);
    if (!st || !st.is_open) { bottomSheet.hidden = true; return; }

    const addr = [st.street, st.house_number].filter(Boolean).join(' ');
    sheetBody.innerHTML = `
      <div class="sheet-row">
        <div class="sheet-info">
          <strong class="sheet-brand">${st.brand}</strong>
          <span class="sheet-street">${addr}</span>
        </div>
        <span class="badge badge-open">OPEN</span>
        <a href="/station/${st.id}" class="btn-details">Details →</a>
      </div>
      <div class="price-cells">
        <div class="price-cell e5"><span class="val">${formatPrice(st.latest_e5)}</span><span class="lbl">E5</span></div>
        <div class="price-cell e10"><span class="val">${formatPrice(st.latest_e10)}</span><span class="lbl">E10</span></div>
        <div class="price-cell diesel"><span class="val">${formatPrice(st.latest_diesel)}</span><span class="lbl">Diesel</span></div>
      </div>`;
    bottomSheet.hidden = false;
  }

})();
