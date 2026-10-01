/* The Evolution of the Earth's Atmosphere: LIVE CHARTS
   Doughnut, bar gauges and a line graph, all driven by AE.interp(s).
   The specification describes the early atmosphere in words ("mainly",
   "little or no", "small proportions") and today's in round figures (about
   80% and 20%). So the gauges show those words, the graph is marked only at
   about 80% and 20%, and the bar lengths are a rough guide from a simplified
   model rather than measurements.
   Slices are solid colours from AE.DATA.GASES. Colour is never the only
   signal: lines differ in dash, and every gas is named with its word. */
(function () {
  'use strict';
  var AE = window.AE = window.AE || {};
  var D = AE.DATA;
  var TEXT = '#edf2f8', MUTED = '#8693a5', LINE = '#182535', PANEL = '#091321';
  function colOf(id) { return D.GASES.filter(function (g) { return g.id === id; })[0].col; }
  var LINES = [
    { id: 'n2', label: 'Nitrogen (N₂)', col: colOf('n2'), dash: [2, 4] },
    { id: 'o2', label: 'Oxygen (O₂)', col: colOf('o2'), dash: [] },
    { id: 'co2', label: 'Carbon dioxide (CO₂)', col: colOf('co2'), dash: [8, 5] }
  ];

  function gaugeHTML() {
    return D.GASES.map(function (g) {
      return '<div class="gauge" data-gas="' + g.id + '">' +
        '<div class="gauge-head"><span class="gauge-name"><i class="sw" style="--c:' + g.col + '"></i>' + g.f + ' <small>' + g.name + '</small></span>' +
        '<output class="gauge-val" aria-live="off"></output></div>' +
        '<div class="gauge-track" aria-hidden="true"><div class="gauge-fill" style="--c:' + g.col + '"></div></div></div>';
    }).join('');
  }
  function wordsAt(x) { return AE.interp(x).words; }

  AE.Charts = {
    init: function (els) {
      var self = this, gases = D.GASES;
      this.els = els;
      this.valueEls = {}; this.fillEls = {};
      els.gauges.innerHTML = gaugeHTML();
      els.gauges.querySelectorAll('.gauge').forEach(function (n) {
        self.valueEls[n.dataset.gas] = n.querySelector('.gauge-val');
        self.fillEls[n.dataset.gas] = n.querySelector('.gauge-fill');
      });
      if (!window.Chart) { els.doughnut.parentNode.classList.add('no-chart'); return; }
      Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
      Chart.defaults.color = MUTED;
      Chart.defaults.animation = false;

      this.donut = new Chart(els.doughnut.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: gases.map(function (g) { return g.name; }),
          datasets: [{
            data: gases.map(function () { return 1; }),
            backgroundColor: gases.map(function (g) { return g.col; }),
            borderColor: PANEL, borderWidth: 2, hoverOffset: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '58%', animation: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function (c) { return ' ' + c.label + ': ' + (self.words ? self.words[gases[c.dataIndex].id] : ''); } } }
          }
        }
      });

      /* the moving marker on the line graph */
      var marker = {
        id: 'marker',
        afterDatasetsDraw: function (chart) {
          var x = chart.scales.x.getPixelForValue(self.s || 0), a = chart.chartArea, g = chart.ctx;
          g.save(); g.strokeStyle = TEXT; g.lineWidth = 2; g.setLineDash([5, 4]);
          g.beginPath(); g.moveTo(x, a.top); g.lineTo(x, a.bottom); g.stroke(); g.setLineDash([]);
          LINES.forEach(function (ln) {
            var y = chart.scales.y.getPixelForValue(self.v ? self.v.gas[ln.id] : 0);
            g.beginPath(); g.arc(x, y, 5, 0, 7); g.fillStyle = ln.col; g.fill(); g.lineWidth = 2; g.strokeStyle = PANEL; g.stroke();
          });
          g.restore();
        }
      };
      var pts = [], i, N = 100;
      for (i = 0; i <= N; i++) pts.push(AE.interp(i / N));
      var nodes = D.NODES.map(function (b, k) { return k / (D.NODES.length - 1); });
      this.line = new Chart(els.line.getContext('2d'), {
        type: 'line',
        data: {
          datasets: LINES.map(function (ln) {
            return { label: ln.label, gasId: ln.id, data: pts.map(function (p) { return { x: p.s, y: p.gas[ln.id] }; }),
              borderColor: ln.col, backgroundColor: ln.col, borderWidth: 3, borderDash: ln.dash, pointRadius: 0, tension: 0 };
          })
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
          interaction: { mode: 'nearest', intersect: false },
          scales: {
            x: {
              type: 'linear', min: 0, max: 1,
              afterBuildTicks: function (ax) { ax.ticks = nodes.map(function (n) { return { value: n }; }); },
              ticks: { color: MUTED, maxRotation: 0, font: { size: 11 }, callback: function (val) { var b = D.byaAt(val); return b < 0.005 ? 'Now' : (b >= 1 ? b.toFixed(1) : Math.round(b * 1000) + 'M'); } },
              grid: { color: LINE },
              title: { display: true, text: 'Billion years ago (M = million). Stretched scale, as on the timeline', color: MUTED, font: { size: 11 } }
            },
            /* only the two values the specification gives are marked */
            y: {
              min: 0, max: 100, grid: { color: function (c) { return c.tick && (c.tick.value === 20 || c.tick.value === 80) ? '#2b3a4e' : 'transparent'; } },
              afterBuildTicks: function (ax) { ax.ticks = [{ value: 20 }, { value: 80 }]; },
              ticks: { color: MUTED, callback: function (v) { return 'about ' + v + '%'; } },
              title: { display: true, text: 'Amount (simplified)', color: MUTED, font: { size: 11 } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: {
              title: function (it) { return D.formatBya(D.byaAt(it[0].parsed.x)); },
              label: function (c) { return ' ' + c.dataset.label + ': ' + wordsAt(c.parsed.x)[c.dataset.gasId]; }
            } }
          }
        },
        plugins: [marker]
      });
    },

    /* bigger axis text for the board in presenter mode */
    setFont: function (px) {
      if (!this.line) return;
      var o = this.line.options.scales;
      o.x.ticks.font = { size: px }; o.y.ticks.font = { size: px }; o.x.title.font = { size: px }; o.y.title.font = { size: px };
      o.x.title.display = px <= 12;   // the axis note is for the desk; on the board the timeline says it
      this.line.update('none');
    },

    /* called on every slider change with the interpolated state */
    update: function (v) {
      this.s = v.s; this.v = v; this.words = v.words;
      var gases = D.GASES;
      gases.forEach(function (gs) {
        var p = v.gas[gs.id];
        AE.Charts.valueEls[gs.id].textContent = v.words[gs.id];
        /* a rough guide only; a thin sliver keeps a small amount visible */
        AE.Charts.fillEls[gs.id].style.width = (p > 0.02 ? Math.max(p, 1.2) : 0) + '%';
      });
      if (this.donut) {
        this.donut.data.datasets[0].data = gases.map(function (gs) { return v.gas[gs.id]; });
        this.donut.update('none');
      }
      if (this.line) this.line.update('none');
      /* text alternative for the charts */
      if (this.els.summary) {
        this.els.summary.textContent = gases.map(function (gs) { return gs.name + ': ' + v.words[gs.id]; }).join('. ');
      }
    }
  };
})();
