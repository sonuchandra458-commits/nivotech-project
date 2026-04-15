let expenses    = [];
let selectedCat = 'food';
let isDark      = false;
let donutChart  = null;
let barChart    = null;


const CAT_META = {
  food:     { icon: '🍔', label: 'Food',     bg: 'food'     },
  shopping: { icon: '🛍', label: 'Shopping', bg: 'shopping' },
  travel:   { icon: '✈️', label: 'Travel',   bg: 'travel'   }
};


const HERO_BG = {
  food:     'var(--food-bg)',
  shopping: 'var(--shopping-bg)',
  travel:   'var(--travel-bg)'
};


const BG_LABELS = {
  food:     '🍔 Food mode',
  shopping: '🛍 Shopping mode',
  travel:   '✈️ Travel mode'
};


function init() {
 
  const saved = localStorage.getItem('et_expenses_v2');
  if (saved) {
    try { expenses = JSON.parse(saved); } catch (e) { expenses = []; }
  }


  const theme = localStorage.getItem('et_theme');
  if (theme === 'dark') {
    isDark = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeBtn();
  }

 
  const today = new Date();
  document.getElementById('date').value = today.toISOString().split('T')[0];

  buildMonthFilter();
  renderAll();
  updateHeroBg(selectedCat);
}


function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('et_theme', isDark ? 'dark' : 'light');
  updateThemeBtn();
  renderCharts(); 
}

function updateThemeBtn() {
  document.getElementById('theme-btn').textContent = isDark ? '☀️ Light' : '🌙 Dark';
}


function selectCat(cat) {
  selectedCat = cat;
  ['food', 'shopping', 'travel'].forEach(c => {
    const btn = document.getElementById('cat-' + c);
    btn.className = 'cat-btn ' + c + (c === cat ? ' active' : '');
  });
  updateHeroBg(cat);
}

function updateHeroBg(cat) {
  document.getElementById('hero').style.background = HERO_BG[cat];
  document.getElementById('bg-badge').textContent  = BG_LABELS[cat];
}


function buildMonthFilter() {
  const sel    = document.getElementById('filter-month');
  const months = getAvailableMonths();
  const cur    = selectedMonth();

  sel.innerHTML = '';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value       = m;
    opt.textContent = formatMonth(m);
    if (m === cur) opt.selected = true;
    sel.appendChild(opt);
  });


  if (!sel.value) {
    const today = new Date();
    const cm    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const opt   = document.createElement('option');
    opt.value       = cm;
    opt.textContent = formatMonth(cm);
    opt.selected    = true;
    sel.appendChild(opt);
  }
}

function getAvailableMonths() {
  const set   = new Set();
  const today = new Date();
  const cm    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  set.add(cm);
  expenses.forEach(e => { if (e.date) set.add(e.date.substring(0, 7)); });
  return [...set].sort().reverse();
}

function selectedMonth() {
  return document.getElementById('filter-month').value || (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  })();
}

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function addExpense() {
  const desc   = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const date   = document.getElementById('date').value;

 
  if (!desc)                      { showErr('Please enter a description.'); return; }
  if (!amount || amount <= 0)     { showErr('Please enter a valid amount.'); return; }
  if (!date)                      { showErr('Please select a date.'); return; }

  document.getElementById('err-msg').style.display = 'none';

  const exp = {
    id:     Date.now(),
    desc,
    amount: Math.round(amount * 100) / 100,
    date,
    cat:    selectedCat
  };

  expenses.unshift(exp);
  save();


  document.getElementById('desc').value   = '';
  document.getElementById('amount').value = '';


  const month = date.substring(0, 7);
  buildMonthFilter();
  document.getElementById('filter-month').value = month;

  renderAll();
}

function showErr(msg) {
  const err = document.getElementById('err-msg');
  err.textContent   = msg;
  err.style.display = 'block';
  setTimeout(() => { err.style.display = 'none'; }, 3000);
}


function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  save();
  buildMonthFilter();
  renderAll();
}


function save() {
  localStorage.setItem('et_expenses_v2', JSON.stringify(expenses));
}


function renderAll() {
  updateSummary();
  renderList();
  renderCharts();
  renderCatTable();
}

function getMonthExpenses() {
  const m = selectedMonth();
  return expenses.filter(e => e.date && e.date.startsWith(m));
}


function updateSummary() {
  ['shopping', 'food', 'travel'].forEach(cat => {
    const total = expenses
      .filter(e => e.cat === cat)
      .reduce((s, e) => s + e.amount, 0);
    document.getElementById('sum-' + cat).textContent =
      '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  });
  document.getElementById('month-label').textContent = formatMonth(selectedMonth());
}


function renderList() {
  const list     = document.getElementById('expense-list');
  const filtered = getMonthExpenses();
  const total    = filtered.reduce((s, e) => s + e.amount, 0);

  document.getElementById('filter-total').textContent =
    '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' total';
  document.getElementById('list-count').textContent =
    filtered.length + ' item' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="big">📭</div>
        No expenses this month.<br>Add your first expense above!
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(e => {
    const meta    = CAT_META[e.cat] || CAT_META.food;
    const dateStr = new Date(e.date + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return `
      <div class="exp-item" id="exp-${e.id}">
        <div class="exp-icon ${e.cat}">${meta.icon}</div>
        <div class="exp-info">
          <div class="exp-name">${escHtml(e.desc)}</div>
          <div class="exp-meta">${dateStr} &middot; ${meta.label}</div>
        </div>
        <div class="exp-amount ${e.cat}">
          ₹${e.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
        <button class="del-btn" onclick="deleteExpense(${e.id})" title="Delete">✕</button>
      </div>`;
  }).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function renderCatTable() {
  const filtered = getMonthExpenses();
  const total    = filtered.reduce((s, e) => s + e.amount, 0);
  const tbody    = document.getElementById('cat-table');

  if (!total) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--text2);padding:16px;">
          No data for this month
        </td>
      </tr>`;
    return;
  }

  const rows = ['food', 'shopping', 'travel']
    .map(cat => {
      const meta  = CAT_META[cat];
      const items = filtered.filter(e => e.cat === cat);
      const sum   = items.reduce((s, e) => s + e.amount, 0);
      const pct   = total > 0 ? Math.round(sum / total * 100) : 0;
      return { cat, meta, count: items.length, sum, pct };
    })
    .filter(r => r.count > 0)
    .sort((a, b) => b.sum - a.sum);

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><span class="cat-pill ${r.cat}">${r.meta.icon} ${r.meta.label}</span></td>
      <td>${r.count}</td>
      <td style="text-align:right;font-weight:700;">
        ₹${r.sum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
      <td style="text-align:right;color:var(--text2);">${r.pct}%</td>
    </tr>`).join('');
}


function renderCharts() {
  renderDonut();
  renderBar();
}

function getColors() {
  return {
    food:     { bg: 'rgba(255,160,0,0.85)',  border: '#ffa000' },
    shopping: { bg: 'rgba(233,30,99,0.85)',  border: '#e91e63' },
    travel:   { bg: 'rgba(46,125,50,0.85)',  border: '#2e7d32' }
  };
}


function renderDonut() {
  const filtered = getMonthExpenses();
  const cols     = getColors();
  const textCol  = isDark ? '#e8eaf6' : '#1a1a2e';

  const data   = ['food', 'shopping', 'travel'].map(c =>
    filtered.filter(e => e.cat === c).reduce((s, e) => s + e.amount, 0)
  );
  const labels = ['Food 🍔', 'Shopping 🛍', 'Travel ✈️'];

  if (donutChart) { donutChart.destroy(); donutChart = null; }

  const ctx = document.getElementById('donut-chart').getContext('2d');
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [cols.food.bg, cols.shopping.bg, cols.travel.bg],
        borderColor:      [cols.food.border, cols.shopping.border, cols.travel.border],
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textCol, padding: 16, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => ' ₹' + ctx.parsed.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          }
        }
      }
    }
  });
}


function renderBar() {
  const months = [];
  const d      = new Date();
  for (let i = 5; i >= 0; i--) {
    const tmp = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${tmp.getFullYear()}-${String(tmp.getMonth() + 1).padStart(2, '0')}`);
  }

  const cols    = getColors();
  const textCol = isDark ? '#e8eaf6' : '#1a1a2e';
  const gridCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const datasets = ['food', 'shopping', 'travel'].map((cat, i) => ({
    label: CAT_META[cat].icon + ' ' + CAT_META[cat].label,
    data: months.map(m =>
      expenses
        .filter(e => e.cat === cat && e.date && e.date.startsWith(m))
        .reduce((s, e) => s + e.amount, 0)
    ),
    backgroundColor: Object.values(getColors())[i].bg,
    borderRadius: 5,
    borderSkipped: false
  }));

  if (barChart) { barChart.destroy(); barChart = null; }

  const ctx = document.getElementById('bar-chart').getContext('2d');
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => {
        const [y, mo] = m.split('-');
        return new Date(+y, +mo - 1, 1).toLocaleString('default', { month: 'short' });
      }),
      datasets
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          ticks: { color: textCol },
          grid:  { color: gridCol }
        },
        y: {
          stacked: true,
          ticks: { color: textCol, callback: v => '₹' + v },
          grid:  { color: gridCol }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textCol, padding: 14, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              ' ' + ctx.dataset.label + ': ₹' +
              ctx.parsed.y.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          }
        }
      }
    }
  });
}


init();