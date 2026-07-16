const UI = (() => {
  const ERROR_MESSAGES = {
    INVALID_AGE: 'Podaj wiek obecny w zakresie 16–90 lat.',
    NEGATIVE_VALUE: 'Kwoty nie mogą być ujemne.',
    INVALID_SWR: 'Safe Withdrawal Rate powinien być w zakresie 0–15%.',
    INVALID_RETURN: 'Stopa zwrotu powinna być w zakresie od -30% do 30%.',
    INVALID_INFLATION: 'Inflacja powinna być w zakresie 0–30%.',
    EXPENSES_EXCEED_INCOME:
      'Wydatki obecne przewyższają dochód — nie odkładasz nic na inwestycje. Wynik pokazuje tylko wzrost obecnego kapitału.',
    UNREACHABLE:
      'Przy tych założeniach cel FIRE nie zostanie osiągnięty w ciągu 80 lat. Zwiększ oszczędności lub obniż planowane wydatki.',
    PPK_NEEDS_SALARY: 'Aby uwzględnić PPK, podaj pensję brutto większą od zera.',
    SAVINGS_INSUFFICIENT:
      'Wpłaty na IKZE, IKE i PPK przekraczają Twoją miesięczną nadwyżkę (dochód minus wydatki). Zmniejsz wpłaty lub wydatki.',
    IKZE_OVER_LIMIT: 'Wpłata na IKZE przekracza roczny limit — nadwyżka została pominięta w obliczeniach.',
    IKE_OVER_LIMIT: 'Wpłata na IKE przekracza roczny limit — nadwyżka została pominięta w obliczeniach.',
  };

  const WARNING_CODES = new Set(['EXPENSES_EXCEED_INCOME', 'IKZE_OVER_LIMIT', 'IKE_OVER_LIMIT']);

  function readFormInputs() {
    return {
      currentAge: Number(document.getElementById('currentAge').value),
      currentSavings: Number(document.getElementById('currentSavings').value),
      monthlyIncome: Number(document.getElementById('monthlyIncome').value),
      monthlyExpensesCurrent: Number(document.getElementById('monthlyExpensesCurrent').value),
      monthlyExpensesRetirement: Number(document.getElementById('monthlyExpensesRetirement').value),
      nominalReturn: Number(document.getElementById('nominalReturn').value) / 100,
      inflation: Number(document.getElementById('inflation').value) / 100,
      swr: Number(document.getElementById('swr').value) / 100,
      retirementAgeTarget: Number(document.getElementById('retirementAgeTarget').value),
      balanceIKZE: Number(document.getElementById('balanceIKZE').value),
      ikzeMonthly: Number(document.getElementById('ikzeMonthly').value),
      pitRate: Number(document.getElementById('pitRate').value),
      ikzeSelfEmployed: document.getElementById('ikzeSelfEmployed').checked,
      balanceIKE: Number(document.getElementById('balanceIKE').value),
      ikeMonthly: Number(document.getElementById('ikeMonthly').value),
      ppkEnabled: document.getElementById('ppkEnabled').checked,
      grossSalary: Number(document.getElementById('grossSalary').value),
      balancePPK: Number(document.getElementById('balancePPK').value),
      ppkEmployeePct: Number(document.getElementById('ppkEmployeePct').value) / 100,
      ppkEmployerPct: Number(document.getElementById('ppkEmployerPct').value) / 100,
      okiEnabled: document.getElementById('okiEnabled').checked,
    };
  }

  function fillFormDefaults(defaults) {
    document.getElementById('nominalReturn').value = (defaults.nominalReturn * 100).toFixed(1);
    document.getElementById('inflation').value = (defaults.inflation * 100).toFixed(1);
    document.getElementById('swr').value = (defaults.swr * 100).toFixed(1);
    document.getElementById('retirementAgeTarget').value = defaults.retirementAgeTarget;
  }

  function formatMoney(n) {
    return Math.round(n).toLocaleString('pl-PL') + ' zł';
  }

  function formatAge(age) {
    if (age === null || age === undefined) return '—';
    return age.toFixed(1) + ' lat';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const BUCKET_COLORS = { taxable: 'var(--accent)', ike: 'var(--ike-color)', ikze: 'var(--ikze-color)', ppk: 'var(--ppk-color)' };

  function showError(codes) {
    const box = document.getElementById('error-box');
    if (!codes || codes.length === 0) {
      box.classList.remove('show');
      box.innerHTML = '';
      return;
    }
    box.innerHTML = codes
      .map((c) => `<div class="alert-row"><span class="alert-bullet"></span>${ERROR_MESSAGES[c] || c}</div>`)
      .join('');
    box.classList.add('show');
  }

  function clearResults() {
    document.getElementById('result-fire-number').textContent = '—';
    document.getElementById('result-fire-number-nominal').textContent = '';
    document.getElementById('result-fire-age').textContent = '—';
    document.getElementById('result-coast-age').textContent = '—';
    document.getElementById('result-sensitivity').textContent = '—';
    document.getElementById('bridge-warning').classList.remove('show');
    renderBreakdown(null);
  }

  function renderBreakdown(buckets) {
    const card = document.getElementById('breakdown-card');
    const bar = document.getElementById('breakdown-bar');
    const rows = document.getElementById('breakdown-rows');

    if (!buckets) {
      card.style.display = 'none';
      return;
    }
    const parts = [
      ['taxable', 'Opodatkowane/OKI', buckets.taxable],
      ['ike', 'IKE', buckets.ike],
      ['ikze', 'IKZE (po ryczałcie)', buckets.ikze],
      ['ppk', 'PPK', buckets.ppk],
    ].filter(([, , v]) => v > 0.5);

    if (parts.length === 0) {
      card.style.display = 'none';
      return;
    }

    const total = parts.reduce((sum, [, , v]) => sum + v, 0) || 1;
    card.style.display = 'block';
    bar.innerHTML = parts
      .map(
        ([key, , v]) =>
          `<div class="breakdown-segment" style="width:${Math.max(1, (v / total) * 100)}%;background:${BUCKET_COLORS[key]}"></div>`
      )
      .join('');
    rows.innerHTML = parts
      .map(
        ([key, label, v]) =>
          `<div class="breakdown-row"><span class="breakdown-dot" style="background:${BUCKET_COLORS[key]}"></span><span class="breakdown-label">${label}</span><strong>${formatMoney(v)}</strong></div>`
      )
      .join('');
  }

  function renderCalculatorResult(inputs) {
    const allErrors = Calc.validateInputs(inputs);
    const blockingErrors = allErrors.filter((c) => !WARNING_CODES.has(c));
    const warnings = allErrors.filter((c) => WARNING_CODES.has(c));

    if (blockingErrors.length > 0) {
      showError(blockingErrors);
      clearResults();
      return null;
    }

    const sim = Calc.simulateToFire(inputs);
    const coastAge = Calc.coastFireAge(inputs);
    const sensitivity = Calc.sensitivityRange(inputs);

    const messages = [...warnings];
    if (!sim.reached) messages.push('UNREACHABLE');
    showError(messages);

    document.getElementById('result-fire-number').textContent = formatMoney(sim.target);
    const nominalEl = document.getElementById('result-fire-number-nominal');
    if (sim.reached && inputs.inflation > 0) {
      const yearsToFire = sim.ageAtFire - inputs.currentAge;
      const nominal = sim.target * Math.pow(1 + inputs.inflation, yearsToFire);
      nominalEl.textContent = `w dzisiejszych zł · nominalnie ~${formatMoney(nominal)} w roku FIRE`;
    } else {
      nominalEl.textContent = sim.reached ? 'w dzisiejszych zł' : '';
    }
    document.getElementById('result-fire-age').textContent = sim.reached ? formatAge(sim.ageAtFire) : '—';
    document.getElementById('result-coast-age').textContent = coastAge ? formatAge(coastAge) : '—';
    document.getElementById('result-sensitivity').textContent =
      sensitivity.optimistic != null && sensitivity.pessimistic != null
        ? `${formatAge(sensitivity.optimistic)} – ${formatAge(sensitivity.pessimistic)}`
        : '—';
    renderBreakdown(sim.bucketsAtFire);
    document.getElementById('bridge-warning').classList.toggle('show', sim.reached && sim.limitedByBridge);

    FireChart.renderGrowthChart(document.getElementById('growth-chart'), sim.series, sim.target);

    return sim;
  }

  function updateIkzeLimitHint(inputs) {
    const limit = inputs.ikzeSelfEmployed ? Calc.LIMITS.ikzeSelfEmployed : Calc.LIMITS.ikze;
    document.getElementById('ikze-limit-hint').textContent =
      `Limit roczny IKZE: ${formatMoney(limit)} (~${formatMoney(limit / 12)}/mies.) · limit IKE: ${formatMoney(Calc.LIMITS.ike)}.`;
  }

  function switchView(viewName) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');
    document
      .querySelectorAll('.bottom-nav button')
      .forEach((b) => b.classList.toggle('active', b.dataset.view === viewName));

    if (viewName === 'scenarios') renderScenariosList();
    if (viewName === 'compare') renderCompareView();
    if (viewName === 'settings') renderSettingsForm();
  }

  function renderScenariosList() {
    const container = document.getElementById('scenarios-list');
    const scenarios = Storage.getScenarios().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const selected = new Set(Storage.getCompareSelection());

    if (scenarios.length === 0) {
      container.innerHTML = '<div class="empty-state">Brak zapisanych scenariuszy. Wróć do Kalkulatora i zapisz pierwszy.</div>';
      return;
    }

    container.innerHTML = scenarios
      .map((s) => {
        const sim = Calc.simulateToFire(s.inputs);
        const dateStr = new Date(s.updatedAt).toLocaleDateString('pl-PL');
        return `
        <div class="scenario-item">
          <input type="checkbox" data-id="${s.id}" ${selected.has(s.id) ? 'checked' : ''} class="scenario-checkbox" />
          <div class="info">
            <div class="name">${escapeHtml(s.name)}</div>
            <div class="meta">${dateStr} · cel ${formatMoney(sim.target)} · wiek ${
          sim.reached ? formatAge(sim.ageAtFire) : 'nieosiągalny'
        }</div>
          </div>
          <div class="actions">
            <button class="btn btn-small" data-action="load" data-id="${s.id}">Wczytaj</button>
            <button class="btn btn-small btn-danger" data-action="delete" data-id="${s.id}">Usuń</button>
          </div>
        </div>`;
      })
      .join('');
  }

  function renderCompareView() {
    const selectedIds = Storage.getCompareSelection();
    const scenarios = selectedIds.map((id) => Storage.getScenario(id)).filter(Boolean);
    const emptyEl = document.getElementById('compare-empty');
    const contentEl = document.getElementById('compare-content');

    if (scenarios.length < 2) {
      emptyEl.style.display = 'block';
      contentEl.style.display = 'none';
      return;
    }
    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';

    const rows = scenarios.map((s) => {
      const sim = Calc.simulateToFire(s.inputs);
      const coastAge = Calc.coastFireAge(s.inputs);
      return { name: s.name, inputs: s.inputs, sim, coastAge };
    });

    const table = document.getElementById('compare-table');
    table.innerHTML = `
      <tr><th></th>${rows.map((r) => `<th>${escapeHtml(r.name)}</th>`).join('')}</tr>
      <tr><td>Wiek obecny</td>${rows.map((r) => `<td>${r.inputs.currentAge}</td>`).join('')}</tr>
      <tr><td>Wydatki na emeryturze</td>${rows.map((r) => `<td>${formatMoney(r.inputs.monthlyExpensesRetirement)}/mies.</td>`).join('')}</tr>
      <tr><td>FIRE number</td>${rows.map((r) => `<td>${formatMoney(r.sim.target)}</td>`).join('')}</tr>
      <tr><td>Wiek FIRE</td>${rows.map((r) => `<td>${r.sim.reached ? formatAge(r.sim.ageAtFire) : 'nieosiągalny'}</td>`).join('')}</tr>
      <tr><td>Coast FIRE</td>${rows.map((r) => `<td>${r.coastAge ? formatAge(r.coastAge) : '—'}</td>`).join('')}</tr>
    `;

    FireChart.renderComparisonChart(
      document.getElementById('compare-chart'),
      rows.map((r) => ({ name: r.name, series: r.sim.series }))
    );
  }

  let toastTimer = null;
  function showToast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  function renderSettingsForm() {
    const d = Storage.getDefaults();
    document.getElementById('defaultNominalReturn').value = (d.nominalReturn * 100).toFixed(1);
    document.getElementById('defaultInflation').value = (d.inflation * 100).toFixed(1);
    document.getElementById('defaultSwr').value = (d.swr * 100).toFixed(1);
    document.getElementById('defaultRetirementAge').value = d.retirementAgeTarget;
  }

  return {
    readFormInputs,
    fillFormDefaults,
    renderCalculatorResult,
    updateIkzeLimitHint,
    switchView,
    renderScenariosList,
    renderCompareView,
    renderSettingsForm,
    formatMoney,
    formatAge,
    showError,
    showToast,
  };
})();
