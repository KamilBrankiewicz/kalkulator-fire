const Storage = (() => {
  const SCENARIOS_KEY = 'fire_scenarios';
  const SETTINGS_KEY = 'fire_settings';
  const SELECTION_KEY = 'fire_compare_selection';

  const DEFAULT_SETTINGS = {
    nominalReturn: 0.07,
    inflation: 0.035,
    swr: 0.04,
    retirementAgeTarget: 65,
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function genId() {
    return 'sc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getScenarios() {
    return readJSON(SCENARIOS_KEY, []).filter((s) => !s.deleted);
  }

  function getScenario(id) {
    return getScenarios().find((s) => s.id === id) || null;
  }

  function saveScenario(scenario) {
    const all = readJSON(SCENARIOS_KEY, []);
    const now = new Date().toISOString();
    const toSave = Object.assign({}, scenario);

    if (!toSave.id) {
      toSave.id = genId();
      toSave.createdAt = now;
    }
    toSave.updatedAt = now;
    toSave.deleted = false;

    const idx = all.findIndex((s) => s.id === toSave.id);
    if (idx >= 0) all[idx] = toSave;
    else all.push(toSave);

    writeJSON(SCENARIOS_KEY, all);
    return toSave;
  }

  function deleteScenario(id) {
    const all = readJSON(SCENARIOS_KEY, []);
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx].deleted = true;
      all[idx].updatedAt = new Date().toISOString();
      writeJSON(SCENARIOS_KEY, all);
    }
  }

  function getDefaults() {
    return Object.assign({}, DEFAULT_SETTINGS, readJSON(SETTINGS_KEY, {}));
  }

  function saveDefaults(settings) {
    writeJSON(SETTINGS_KEY, settings);
  }

  function getCompareSelection() {
    return readJSON(SELECTION_KEY, []);
  }

  function saveCompareSelection(ids) {
    writeJSON(SELECTION_KEY, ids);
  }

  return {
    getScenarios,
    getScenario,
    saveScenario,
    deleteScenario,
    getDefaults,
    saveDefaults,
    getCompareSelection,
    saveCompareSelection,
  };
})();
