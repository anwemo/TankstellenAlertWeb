/**
 * app.js — Shared utilities for TankstellenAlert
 * Loaded on every page before page-specific scripts.
 */

/* ── Design tokens (mirrors design-tokens.css for JS use) ────── */

const STATION_COLORS = [
  '#2563EB',  /* blue */
  '#DC2626',  /* red */
  '#059669',  /* green */
  '#D97706',  /* orange */
  '#7C3AED',  /* purple */
  '#0891B2',  /* cyan */
  '#EA580C',  /* dark orange */
  '#65A30D',  /* lime */
  '#DB2777',  /* pink */
  '#4F46E5',  /* indigo */
];

/** Chart.js stroke color per fuel type. */
const FUEL_STROKE = {
  e5:     '#5B9BD5',
  e10:    '#6AB55B',
  diesel: '#C8A000',
};

/** Chart.js border-dash pattern per fuel type (solid / dashed / dotted). */
const FUEL_DASH = {
  e5:     [10, 8],
  e10:    [],
  diesel: [3, 6],
};

/** Human-readable fuel labels. */
const FUEL_LABEL = { e5: 'E5', e10: 'E10', diesel: 'Diesel' };

/* ── Formatting helpers ──────────────────────────────────────── */

/** Format a price number to 3 decimal places, or return '—'. */
function formatPrice(n) {
  if (n == null || n === '') return '—';
  return parseFloat(n).toFixed(3) + ' €';
}

/** Human-readable "N min ago" / "Xh ago" from an ISO timestamp string. */
function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1h ago' : `${hrs}h ago`;
}

/** Default Chart.js options shared across all charts. */
function baseChartOptions(gridColor) {
  const gc = gridColor || getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#C8C9CA';
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${formatPrice(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gc },
        ticks: { font: { family: "'DM Sans', system-ui" }, color: '#8A8E9C', maxRotation: 0 },
      },
      y: {
        grid: { color: gc },
        ticks: {
          font: { family: "'DM Sans', system-ui" }, color: '#8A8E9C',
          callback: v => parseFloat(v).toFixed(3),
        },
      },
    },
    elements: { point: { radius: 0, hoverRadius: 4 } },
    interaction: { mode: 'index', intersect: false },
  };
}
