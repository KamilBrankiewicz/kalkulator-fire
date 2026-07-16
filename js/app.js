const App = (() => {
  function init() {
    const defaults = Storage.getDefaults();
    UI.fillFormDefaults(defaults);
    UI.updateIkzeLimitHint(UI.readFormInputs());
    // natychmiastowy render (wyniki tekstowe) + powtórka po ustaleniu layoutu,
    // żeby wykres dostał właściwą szerokość; celowo setTimeout zamiast
    // requestAnimationFrame — rAF nie odpala w karcie działającej w tle
    UI.renderCalculatorResult(UI.readFormInputs());
    setTimeout(() => UI.renderCalculatorResult(UI.readFormInputs()), 150);

    document.querySelectorAll('#view-calculator input, #view-calculator select').forEach((el) => {
      el.addEventListener('input', onCalculatorInput);
      el.addEventListener('change', onCalculatorInput);
    });

    document.querySelectorAll('.bottom-nav button').forEach((btn) => {
      btn.addEventListener('click', () => UI.switchView(btn.dataset.view));
    });

    document.getElementById('save-scenario-btn').addEventListener('click', onSaveScenario);
    document.getElementById('save-defaults-btn').addEventListener('click', onSaveDefaults);
    document.getElementById('clear-data-btn').addEventListener('click', onClearData);

    document.getElementById('scenarios-list').addEventListener('click', onScenarioListClick);
    document.getElementById('scenarios-list').addEventListener('change', onScenarioListChange);

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', onThemeChange);

    registerServiceWorker();
  }

  function onCalculatorInput() {
    document.getElementById('ppk-fields').style.display = document.getElementById('ppkEnabled').checked
      ? 'block'
      : 'none';
    const inputs = UI.readFormInputs();
    UI.updateIkzeLimitHint(inputs);
    UI.renderCalculatorResult(inputs);
  }

  function onThemeChange() {
    const activeView = document.querySelector('.view.active').id;
    if (activeView === 'view-calculator') UI.renderCalculatorResult(UI.readFormInputs());
    if (activeView === 'view-compare') UI.renderCompareView();
  }

  function onSaveScenario() {
    const nameInput = document.getElementById('scenarioName');
    const name = nameInput.value.trim();
    if (!name) {
      UI.showToast('Podaj nazwę scenariusza.');
      return;
    }
    const inputs = UI.readFormInputs();
    const errors = Calc.validateInputs(inputs).filter((c) => c !== 'EXPENSES_EXCEED_INCOME');
    if (errors.length > 0) {
      UI.showToast('Popraw błędy w formularzu przed zapisem.');
      return;
    }
    Storage.saveScenario({ name, inputs });
    nameInput.value = '';
    UI.showToast('Scenariusz zapisany.');
  }

  function onSaveDefaults() {
    const settings = {
      nominalReturn: Number(document.getElementById('defaultNominalReturn').value) / 100,
      inflation: Number(document.getElementById('defaultInflation').value) / 100,
      swr: Number(document.getElementById('defaultSwr').value) / 100,
      retirementAgeTarget: Number(document.getElementById('defaultRetirementAge').value),
    };
    Storage.saveDefaults(settings);
    UI.showToast('Domyślne założenia zapisane.');
  }

  function onClearData() {
    if (!confirm('Na pewno usunąć wszystkie zapisane scenariusze? Tej operacji nie można cofnąć.')) return;
    Storage.getScenarios().forEach((s) => Storage.deleteScenario(s.id));
    Storage.saveCompareSelection([]);
    UI.renderScenariosList();
  }

  function onScenarioListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'load') {
      const scenario = Storage.getScenario(id);
      if (!scenario) return;
      loadScenarioIntoForm(scenario);
      UI.switchView('calculator');
    } else if (btn.dataset.action === 'delete') {
      if (!confirm('Usunąć ten scenariusz?')) return;
      Storage.deleteScenario(id);
      Storage.saveCompareSelection(Storage.getCompareSelection().filter((sid) => sid !== id));
      UI.renderScenariosList();
    }
  }

  function onScenarioListChange(e) {
    const checkbox = e.target.closest('.scenario-checkbox');
    if (!checkbox) return;
    let selection = Storage.getCompareSelection();
    if (checkbox.checked) selection = [...new Set([...selection, checkbox.dataset.id])];
    else selection = selection.filter((id) => id !== checkbox.dataset.id);
    Storage.saveCompareSelection(selection);
  }

  function loadScenarioIntoForm(scenario) {
    // scenariusze zapisane przed wprowadzeniem kont emerytalnych nie mają nowych pól
    const i = Object.assign(
      {
        balanceIKZE: 0, ikzeMonthly: 0, pitRate: 0.12, ikzeSelfEmployed: false,
        balanceIKE: 0, ikeMonthly: 0,
        ppkEnabled: false, grossSalary: 10000, balancePPK: 0, ppkEmployeePct: 0.02, ppkEmployerPct: 0.015,
        okiEnabled: false,
      },
      scenario.inputs
    );
    document.getElementById('currentAge').value = i.currentAge;
    document.getElementById('currentSavings').value = i.currentSavings;
    document.getElementById('monthlyIncome').value = i.monthlyIncome;
    document.getElementById('monthlyExpensesCurrent').value = i.monthlyExpensesCurrent;
    document.getElementById('monthlyExpensesRetirement').value = i.monthlyExpensesRetirement;
    document.getElementById('nominalReturn').value = (i.nominalReturn * 100).toFixed(1);
    document.getElementById('inflation').value = (i.inflation * 100).toFixed(1);
    document.getElementById('swr').value = (i.swr * 100).toFixed(1);
    document.getElementById('retirementAgeTarget').value = i.retirementAgeTarget;
    document.getElementById('balanceIKZE').value = i.balanceIKZE;
    document.getElementById('ikzeMonthly').value = i.ikzeMonthly;
    document.getElementById('pitRate').value = String(i.pitRate);
    document.getElementById('ikzeSelfEmployed').checked = i.ikzeSelfEmployed;
    document.getElementById('balanceIKE').value = i.balanceIKE;
    document.getElementById('ikeMonthly').value = i.ikeMonthly;
    document.getElementById('ppkEnabled').checked = i.ppkEnabled;
    document.getElementById('grossSalary').value = i.grossSalary;
    document.getElementById('balancePPK').value = i.balancePPK;
    document.getElementById('ppkEmployeePct').value = (i.ppkEmployeePct * 100).toFixed(1);
    document.getElementById('ppkEmployerPct').value = (i.ppkEmployerPct * 100).toFixed(1);
    document.getElementById('okiEnabled').checked = i.okiEnabled;
    document.getElementById('scenarioName').value = scenario.name;
    onCalculatorInput();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
