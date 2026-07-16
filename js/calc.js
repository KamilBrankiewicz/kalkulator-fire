const Calc = (() => {
  const MAX_YEARS = 80;
  const BELKA = 0.19;
  const IKZE_EXIT_TAX = 0.1;
  const IKE_UNLOCK_AGE = 60;
  const PPK_UNLOCK_AGE = 60;
  const IKZE_UNLOCK_AGE = 65;

  // Limity roczne 2026 (aktualizować raz w roku)
  const LIMITS = {
    ike: 28260,
    ikze: 11304,
    ikzeSelfEmployed: 16956,
    ppkStateAnnual: 240,
    okiExempt: 100000,
  };

  function realReturnRate(nominal, inflation) {
    return (1 + nominal) / (1 + inflation) - 1;
  }

  function fireNumber(monthlyExpensesRetirement, swr) {
    return (monthlyExpensesRetirement * 12) / swr;
  }

  function ikzeLimit(p) {
    return p.ikzeSelfEmployed ? LIMITS.ikzeSelfEmployed : LIMITS.ikze;
  }

  // Scenariusze zapisane przed wprowadzeniem kont emerytalnych nie mają nowych pól
  const PARAM_DEFAULTS = {
    balanceIKZE: 0, ikzeMonthly: 0, pitRate: 0.12, ikzeSelfEmployed: false,
    balanceIKE: 0, ikeMonthly: 0,
    ppkEnabled: false, grossSalary: 0, balancePPK: 0, ppkEmployeePct: 0.02, ppkEmployerPct: 0.015,
    okiEnabled: false,
  };

  function withDefaults(p) {
    return Object.assign({}, PARAM_DEFAULTS, p);
  }

  function validateInputs(rawParams) {
    const p = withDefaults(rawParams);
    const errors = [];
    if (!(p.currentAge >= 16 && p.currentAge <= 90)) errors.push('INVALID_AGE');
    if (
      p.currentSavings < 0 || p.balanceIKE < 0 || p.balanceIKZE < 0 || p.balancePPK < 0 ||
      p.monthlyIncome < 0 || p.monthlyExpensesCurrent < 0 || p.monthlyExpensesRetirement < 0 ||
      p.ikeMonthly < 0 || p.ikzeMonthly < 0
    ) {
      errors.push('NEGATIVE_VALUE');
    }
    if (!(p.swr > 0 && p.swr <= 0.15)) errors.push('INVALID_SWR');
    if (p.nominalReturn < -0.3 || p.nominalReturn > 0.3) errors.push('INVALID_RETURN');
    if (p.inflation < 0 || p.inflation > 0.3) errors.push('INVALID_INFLATION');
    if (p.monthlyExpensesCurrent > p.monthlyIncome) errors.push('EXPENSES_EXCEED_INCOME');
    if (p.ppkEnabled && !(p.grossSalary > 0)) errors.push('PPK_NEEDS_SALARY');

    if (p.ikzeMonthly * 12 > ikzeLimit(p)) errors.push('IKZE_OVER_LIMIT');
    if (p.ikeMonthly * 12 > LIMITS.ike) errors.push('IKE_OVER_LIMIT');

    const surplus = (p.monthlyIncome - p.monthlyExpensesCurrent) * 12;
    const wrappers = annualContributions(p);
    if (wrappers.fromSurplus > Math.max(0, surplus)) errors.push('SAVINGS_INSUFFICIENT');

    return errors;
  }

  // Roczne wpłaty na poszczególne konta (z przycięciem do limitów)
  function annualContributions(p) {
    const ikze = Math.min(p.ikzeMonthly * 12, ikzeLimit(p));
    const ike = Math.min(p.ikeMonthly * 12, LIMITS.ike);
    const ppkEmployee = p.ppkEnabled ? p.grossSalary * 12 * p.ppkEmployeePct : 0;
    const ppkEmployer = p.ppkEnabled ? p.grossSalary * 12 * p.ppkEmployerPct : 0;
    const ppkState = p.ppkEnabled ? LIMITS.ppkStateAnnual : 0;
    return { ikze, ike, ppkEmployee, ppkEmployer, ppkState, fromSurplus: ikze + ike + ppkEmployee };
  }

  // Wartość netto konta opodatkowanego / OKI: Belka 19% od zysków,
  // przy OKI zyski przypadające na aktywa do 100 tys. zł są zwolnione.
  function netTaxable(balance, basis, okiEnabled) {
    const gains = Math.max(0, balance - basis);
    if (gains === 0 || balance === 0) return balance;
    let taxedGains = gains;
    if (okiEnabled) {
      const taxedShare = Math.max(0, (balance - LIMITS.okiExempt) / balance);
      taxedGains = gains * taxedShare;
    }
    return balance - BELKA * taxedGains;
  }

  function netBuckets(b, p) {
    return {
      taxable: netTaxable(b.taxable, b.taxableBasis, p.okiEnabled),
      ike: b.ike, // wypłata po 60 bez podatku
      ikze: b.ikze * (1 - IKZE_EXIT_TAX), // ryczałt 10% przy wypłacie po 65
      ppk: b.ppk, // wypłata po 60 wg zasad ustawowych bez podatku
    };
  }

  function totalNet(b, p) {
    const n = netBuckets(b, p);
    return n.taxable + n.ike + n.ikze + n.ppk;
  }

  // Symulacja akumulacji rok po roku — zwraca serię punktów ze stanami kubełków.
  function simulateAccumulation(p) {
    const r = realReturnRate(p.nominalReturn, p.inflation);
    const c = annualContributions(p);
    const surplus = Math.max(0, (p.monthlyIncome - p.monthlyExpensesCurrent) * 12);
    const ikzeRefund = c.ikze * p.pitRate;
    const toTaxable = Math.max(0, surplus - c.fromSurplus) + ikzeRefund;

    let b = {
      taxable: p.currentSavings,
      taxableBasis: p.currentSavings,
      ike: p.balanceIKE,
      ikze: p.balanceIKZE,
      ppk: p.balancePPK,
    };

    const series = [
      { year: 0, age: p.currentAge, buckets: Object.assign({}, b), capital: totalNet(b, p) },
    ];

    for (let year = 1; year <= MAX_YEARS; year++) {
      b = {
        taxable: b.taxable * (1 + r) + toTaxable,
        taxableBasis: b.taxableBasis + toTaxable,
        ike: b.ike * (1 + r) + c.ike,
        ikze: b.ikze * (1 + r) + c.ikze,
        ppk: b.ppk * (1 + r) + c.ppkEmployee + c.ppkEmployer + c.ppkState,
      };
      series.push({ year, age: p.currentAge + year, buckets: Object.assign({}, b), capital: totalNet(b, p) });
    }
    return series;
  }

  // Test pomostu: czy środki dostępne przed odblokowaniem kont emerytalnych
  // wystarczą na wydatki od wieku A do momentu pełnego dostępu (65 lat)?
  function bridgeFeasible(point, p) {
    const r = realReturnRate(p.nominalReturn, p.inflation);
    const annualExpenses = p.monthlyExpensesRetirement * 12;
    const n = netBuckets(point.buckets, p);

    let accessible = n.taxable;
    let ike = n.ike;
    let ppk = n.ppk;
    let ikze = n.ikze;

    let age = point.age;
    if (age >= IKZE_UNLOCK_AGE) return true;
    if (age >= IKE_UNLOCK_AGE) {
      accessible += ike + ppk;
      ike = 0;
      ppk = 0;
    }

    while (age < IKZE_UNLOCK_AGE) {
      accessible -= annualExpenses;
      if (accessible < 0) return false;
      accessible *= 1 + r;
      ike *= 1 + r;
      ppk *= 1 + r;
      ikze *= 1 + r;
      age += 1;
      if (age >= IKE_UNLOCK_AGE && ike + ppk > 0) {
        accessible += ike + ppk;
        ike = 0;
        ppk = 0;
      }
    }
    return true;
  }

  function simulateToFire(rawParams) {
    const p = withDefaults(rawParams);
    const target = fireNumber(p.monthlyExpensesRetirement, p.swr);
    const series = simulateAccumulation(p);
    let limitedByBridge = false;

    for (let i = 0; i < series.length; i++) {
      const point = series[i];
      if (point.capital < target) continue;

      if (!bridgeFeasible(point, p)) {
        limitedByBridge = true;
        continue;
      }

      let ageAtFire = point.age;
      // interpolacja miesięczna tylko gdy wiążący jest cel (nie pomost)
      if (i > 0 && series[i - 1].capital < target && bridgeFeasible(series[i - 1], p)) {
        const prev = series[i - 1].capital;
        const growth = point.capital - prev;
        const fraction = growth > 0 ? (target - prev) / growth : 0;
        ageAtFire = series[i - 1].age + Math.min(Math.max(fraction, 0), 1);
      }

      return {
        series: series.slice(0, i + 1),
        ageAtFire,
        target,
        reached: true,
        limitedByBridge,
        bucketsAtFire: netBuckets(point.buckets, p),
      };
    }

    return { series, ageAtFire: null, target, reached: false, limitedByBridge, bucketsAtFire: null };
  }

  // Coast FIRE: najwcześniejszy wiek, w którym zgromadzone kubełki same
  // dorosną (bez dalszych wpłat) do celu w docelowym wieku emerytalnym.
  function coastFireAge(rawParams) {
    const p = withDefaults(rawParams);
    const r = realReturnRate(p.nominalReturn, p.inflation);
    const target = fireNumber(p.monthlyExpensesRetirement, p.swr);
    const targetRetAge = p.retirementAgeTarget || 65;
    const series = simulateAccumulation(p);

    for (const point of series) {
      const years = targetRetAge - point.age;
      if (years <= 0) break;
      const factor = Math.pow(1 + r, years);
      const grown = {
        taxable: point.buckets.taxable * factor,
        taxableBasis: point.buckets.taxableBasis,
        ike: point.buckets.ike * factor,
        ikze: point.buckets.ikze * factor,
        ppk: point.buckets.ppk * factor,
      };
      if (totalNet(grown, p) >= target) return point.age;
    }
    return null;
  }

  function sensitivityRange(p, deltaPp = 0.02) {
    const pessimistic = simulateToFire(Object.assign({}, p, { nominalReturn: p.nominalReturn - deltaPp }));
    const optimistic = simulateToFire(Object.assign({}, p, { nominalReturn: p.nominalReturn + deltaPp }));
    return { pessimistic: pessimistic.ageAtFire, optimistic: optimistic.ageAtFire };
  }

  return {
    LIMITS,
    realReturnRate,
    fireNumber,
    validateInputs,
    annualContributions,
    simulateToFire,
    coastFireAge,
    sensitivityRange,
  };
})();
