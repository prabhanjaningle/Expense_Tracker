(() => {
  const $ = (s) => document.querySelector(s);
  const LS_KEY = "expense_manager_v1_fancy";

  const expenseForm = $("#expenseForm");
  const titleInput = $("#title");
  const amountInput = $("#amount");
  const categoryInput = $("#category");
  const dateInput = $("#date");
  const expenseIdInput = $("#expenseId");
  const expensesList = $("#expensesList");
  const totalAmountEl = $("#totalAmount");
  const monthAmountEl = $("#monthAmount");
  const transactionCountEl = $("#transactionCount");
  const monthFilter = $("#monthFilter");
  const clearAllBtn = $("#clearAll");
  const resetBtn = $("#resetBtn");

  let categoryChart = null;
  let monthlyChart = null;

  let state = { expenses: [] };

  function init() {
    loadState();
    seedIfEmpty();
    populateMonthFilter();
    renderFast();
    attachListeners();
    setDefaultDate();
  }

  function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    state = raw ? JSON.parse(raw) : { expenses: [] };
  }

  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function seedIfEmpty() {
    if (state.expenses.length === 0) {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const mkDate = (days) => {
        const c = new Date();
        c.setDate(d.getDate() - days);
        return `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`;
      };
      state.expenses = [
        { id: genId(), title: "Grocery", amount: 500, category: "Food", date: mkDate(3) },
        { id: genId(), title: "Electricity", amount: 1200, category: "Bills", date: mkDate(15) },
        { id: genId(), title: "Travel", amount: 300, category: "Transport", date: mkDate(6) },
      ];
      saveState();
    }
  }

  const genId = () => "id_" + Math.random().toString(36).slice(2, 10);

  function renderFast() {
    renderList();
    renderSummary();
    renderChartsFast();
  }

  function renderList() {
    const month = monthFilter.value;
    const items = state.expenses
      .filter((e) => month === "all" || e.date.startsWith(month))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = "";
    for (const e of items) {
      html += `
        <div class="expense-item" data-id="${e.id}" data-category="${e.category}">
          <div>
            <div class="expense-title">${e.title} 
              <span class="expense-cat">• ${e.category}</span>
            </div>
            <div style="font-size:12px;color:#94a3b8">${e.date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <strong>₹${e.amount}</strong>
            <button class="editBtn">Edit</button>
            <button class="delBtn">Delete</button>
          </div>
        </div>`;
    }

    expensesList.innerHTML = html;

    document.querySelectorAll(".editBtn").forEach((b) => b.onclick = onEdit);
    document.querySelectorAll(".delBtn").forEach((b) => b.onclick = onDelete);
  }

  function renderSummary() {
    let total = 0, monthTotal = 0;
    const month = monthFilter.value === "all" ? getCurrentMonth() : monthFilter.value;

    for (const e of state.expenses) {
      total += e.amount;
      if (e.date.startsWith(month)) monthTotal += e.amount;
    }

    totalAmountEl.textContent = `₹${total.toFixed(2)}`;
    monthAmountEl.textContent = `₹${monthTotal.toFixed(2)}`;
    transactionCountEl.textContent = state.expenses.length;
  }

  function renderChartsFast() {
    const catTotals = {};
    for (const e of state.expenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    }

    const catLabels = Object.keys(catTotals);
    const catData = Object.values(catTotals);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById("categoryChart"), {
      type: "pie",
      data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: ['#f97316','#3b82f6','#ef4444','#facc15','#8b5cf6','#06b6d4'] }] },
      options: {
        animation: false,
        responsive: true,
        plugins: { legend: { position: "bottom", labels: { color: '#fff', font: { weight: '600' } } }, tooltip: { backgroundColor: '#111827', titleColor:'#06b6d4', bodyColor:'#fff' } }
      }
    });

    const months = getLastNMonths(6);
    const monthlyData = months.map((m) =>
      state.expenses.filter((e) => e.date.startsWith(m)).reduce((s,e)=>s+e.amount,0)
    );

    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(document.getElementById("monthlyChart"), {
      type: "bar",
      data: { labels: months.map(formatMonth), datasets: [{ data: monthlyData, backgroundColor: 'linear-gradient(90deg,#06b6d4,#3b82f6)' }] },
      options: {
        animation: false,
        responsive: true,
        scales: { y: { beginAtZero:true, ticks:{color:'#fff', font:{weight:'500'}} }, x:{ticks:{color:'#fff', font:{weight:'500'}}} }
      }
    });
  }

  function attachListeners() {
    expenseForm.onsubmit = onSave;
    resetBtn.onclick = onReset;
    monthFilter.onchange = renderFast;
    clearAllBtn.onclick = onClearAll;
  }

  function onSave(e) {
    e.preventDefault();
    const id = expenseIdInput.value;

    const obj = {
      id: id || genId(),
      title: titleInput.value.trim(),
      amount: Number(amountInput.value),
      category: categoryInput.value,
      date: dateInput.value
    };

    if (id) {
      const i = state.expenses.findIndex((x) => x.id === id);
      state.expenses[i] = obj;
    } else {
      state.expenses.push(obj);
    }

    saveState();
    onReset();
    renderFast();
  }

  function onEdit(e) {
    const id = e.target.closest(".expense-item").dataset.id;
    const item = state.expenses.find((x) => x.id === id);

    expenseIdInput.value = item.id;
    titleInput.value = item.title;
    amountInput.value = item.amount;
    categoryInput.value = item.category;
    dateInput.value = item.date;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onDelete(e) {
    const id = e.target.closest(".expense-item").dataset.id;
    state.expenses = state.expenses.filter((x) => x.id !== id);
    saveState();
    renderFast();
  }

  function onReset() {
    expenseForm.reset();
    expenseIdInput.value = "";
  }

  function onClearAll() {
    if (!confirm("Clear all expenses?")) return;
    state.expenses = [];
    saveState();
    seedIfEmpty();
    renderFast();
  }

  function getCurrentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
  }

  function getLastNMonths(n) {
    const out = [];
    const d = new Date();
    for(let i=n-1;i>=0;i--){
      const temp = new Date(d);
      temp.setMonth(d.getMonth()-i);
      out.push(`${temp.getFullYear()}-${String(temp.getMonth()+1).padStart(2,"0")}`);
    }
    return out;
  }

  function formatMonth(ym){
    const [y,m] = ym.split("-");
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[Number(m)-1]} ${y}`;
  }

  function setDefaultDate(){
    const d = new Date();
    dateInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function populateMonthFilter() {
    const months = [...new Set(state.expenses.map(e=>e.date.slice(0,7)))].sort().reverse();
    monthFilter.innerHTML = `<option value="all">All</option>` + months.map(m=>`<option value="${m}">${formatMonth(m)}</option>`).join("");
  }

  init();
})();
