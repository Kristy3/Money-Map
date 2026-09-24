(function initMoneyMapFinance(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MoneyMapFinance = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const FREQUENCY_MONTHS = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    'half-yearly': 1 / 6,
    annual: 1 / 12,
    yearly: 1 / 12,
    'one-off': 0,
  };

  const EXCLUDED_TRANSACTION_CATEGORIES = new Set(['Transfer', 'Work']);
  const ESSENTIAL_CATEGORIES = new Set([
    'Car', 'Groceries', 'Health', 'Insurance', 'Kids Sports', 'School Fees', 'Tax', 'Transport', 'Utilities', 'Wellness',
  ]);

  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, number(value)));
  const sum = (items, getter = (item) => item) => items.reduce((total, item) => total + number(getter(item)), 0);

  function monthlyEquivalent(amount, frequency = 'monthly') {
    return number(amount) * (FREQUENCY_MONTHS[String(frequency).toLowerCase()] ?? 1);
  }

  function annualEquivalent(amount, frequency = 'monthly') {
    return monthlyEquivalent(amount, frequency) * 12;
  }

  function scenarioAllocation(record = {}, scenarioId = 'current') {
    if (record.allocations && record.allocations[scenarioId] !== undefined) {
      return clamp(record.allocations[scenarioId]);
    }
    const scope = record.scenarioScope || 'both';
    if (scope === 'both') return 1;
    if (scope === 'current-only') return scenarioId === 'current' ? 1 : 0;
    if (scope === 'solo-only') return scenarioId === 'solo' ? 1 : 0;
    if (scope === 'percentage') {
      return scenarioId === 'solo' ? clamp(number(record.soloPercent) / 100) : 1;
    }
    return 1;
  }

  function allocated(record, value, scenarioId) {
    return number(value) * scenarioAllocation(record, scenarioId);
  }

  function latestMonth(transactions = []) {
    return transactions
      .map((transaction) => String(transaction.date || '').slice(0, 7))
      .filter((month) => /^\d{4}-\d{2}$/.test(month))
      .sort()
      .at(-1) || '';
  }

  function transactionMonthlyActuals(state, scenarioId = 'current') {
    const month = latestMonth(state.transactions || []);
    const transactions = (state.transactions || []).filter((transaction) => {
      if (String(transaction.date || '').slice(0, 7) !== month) return false;
      if (EXCLUDED_TRANSACTION_CATEGORIES.has(transaction.category)) return false;
      return scenarioAllocation(transaction, scenarioId) > 0;
    });

    return transactions.reduce((totals, transaction) => {
      const amount = allocated(transaction, transaction.amount, scenarioId);
      if (amount > 0) totals.income += amount;
      if (amount < 0) {
        const expense = Math.abs(amount);
        if (ESSENTIAL_CATEGORIES.has(transaction.category)) totals.essential += expense;
        else totals.lifestyle += expense;
      }
      return totals;
    }, { month, income: 0, essential: 0, lifestyle: 0 });
  }

  function offsetForProperty(state, property, scenarioId) {
    if (property.offsetAccountId) {
      const account = (state.accounts || []).find((candidate) => candidate.id === property.offsetAccountId);
      return account ? allocated(account, account.balance, scenarioId) : 0;
    }
    return allocated(property, property.offsetBalance, scenarioId);
  }

  function propertyValues(state, scenarioId = 'current') {
    return (state.properties || []).reduce((totals, property) => {
      const allocation = scenarioAllocation(property, scenarioId);
      const ownership = clamp(number(property.ownershipPercent || 100) / 100);
      const value = number(property.marketValue) * ownership * allocation;
      const mortgage = number(property.mortgageBalance) * allocation;
      const offset = offsetForProperty(state, property, scenarioId);
      totals.value += value;
      totals.debt += mortgage;
      totals.offset += offset;
      totals.effectiveDebt += Math.max(0, mortgage - offset);
      totals.equity += value - mortgage + (property.offsetAccountId ? 0 : offset);
      return totals;
    }, { value: 0, debt: 0, offset: 0, effectiveDebt: 0, equity: 0 });
  }

  function investmentValue(asset) {
    if (number(asset.currentValue)) return number(asset.currentValue);
    return number(asset.units) * number(asset.unitPrice);
  }

  function liabilityIsRepresentedByProperty(state, liability) {
    if (!liability.linkedAsset && !liability.linkedPropertyId) return false;
    const linkedName = String(liability.linkedAsset || '').trim().toLowerCase();
    return (state.properties || []).some((property) => {
      const isLinked = liability.linkedPropertyId === property.id || (linkedName && linkedName === String(property.name || '').trim().toLowerCase());
      return isLinked && number(property.mortgageBalance) > 0;
    });
  }

  function balanceSheet(state, scenarioId = 'current') {
    const accounts = (state.accounts || []).filter((item) => !item.excludeFromNetWorth);
    const cash = sum(accounts, (account) => allocated(account, account.balance, scenarioId));
    const liquidCash = sum(accounts.filter((account) => account.isLiquid), (account) => allocated(account, account.balance, scenarioId));
    const emergencyCash = sum(accounts.filter((account) => account.isEmergencyFund && account.isLiquid), (account) => allocated(account, account.balance, scenarioId));
    const property = propertyValues(state, scenarioId);
    const otherAssets = (state.assets || []).filter((asset) => !asset.excludeFromNetWorth);
    const investments = sum(otherAssets.filter((asset) => asset.assetClass !== 'Vehicle' && asset.assetClass !== 'Other'), (asset) => allocated(asset, investmentValue(asset), scenarioId));
    const otherAssetValue = sum(otherAssets.filter((asset) => asset.assetClass === 'Vehicle' || asset.assetClass === 'Other'), (asset) => allocated(asset, investmentValue(asset), scenarioId));
    const superannuation = sum(state.superAccounts || [], (account) => allocated(account, account.balance, scenarioId));
    const liabilities = sum((state.liabilities || []).filter((liability) => !liability.excludeFromNetWorth && !liabilityIsRepresentedByProperty(state, liability)), (liability) => allocated(liability, liability.currentBalance, scenarioId));
    const totalAssets = cash + property.value + investments + otherAssetValue + superannuation;
    const totalLiabilities = property.debt + liabilities;

    return {
      cash,
      liquidCash,
      emergencyCash,
      propertyValue: property.value,
      propertyEquity: property.equity,
      effectiveMortgageDebt: property.effectiveDebt,
      investments,
      otherAssets: otherAssetValue,
      superannuation,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }

  function monthlyPlan(state, scenarioId = 'current') {
    const actuals = transactionMonthlyActuals(state, scenarioId);
    const incomeSources = (state.incomeSources || []).filter((item) => item.active !== false);
    const expenses = (state.recurringExpenses || []).filter((item) => item.active !== false);
    const irregular = (state.irregularExpenses || []).filter((item) => item.active !== false);
    const liabilities = (state.liabilities || []).filter((item) => item.active !== false);
    const properties = (state.properties || []).filter((item) => item.active !== false);
    const policies = (state.insurancePolicies || []).filter((item) => item.active !== false);
    const assets = (state.assets || []).filter((item) => item.active !== false);
    const superAccounts = (state.superAccounts || []).filter((item) => item.active !== false);

    const explicitIncome = sum(incomeSources, (item) => allocated(item, monthlyEquivalent(item.amount, item.frequency), scenarioId))
      + sum(properties, (item) => allocated(item, item.rentalIncome, scenarioId))
      + sum(assets, (item) => allocated(item, number(item.dividendIncome) / 12, scenarioId));
    const byType = expenses.reduce((totals, expense) => {
      const value = allocated(expense, monthlyEquivalent(expense.amount, expense.frequency), scenarioId);
      const type = expense.expenseType || 'essential';
      totals[type] = (totals[type] || 0) + value;
      return totals;
    }, {});
    const sinkingFunds = sum(irregular.filter((item) => (item.fundingMode || 'provision') === 'provision'), (item) => {
      const provision = number(item.monthlyProvision) || monthlyEquivalent(item.amount, item.frequency);
      return allocated(item, provision, scenarioId);
    });
    const debtRepayments = sum(liabilities.filter((item) => !liabilityIsRepresentedByProperty(state, item)), (item) => allocated(item, monthlyEquivalent(item.requiredRepayment, item.repaymentFrequency), scenarioId))
      + sum(properties, (item) => allocated(item, monthlyEquivalent(item.requiredRepayment, item.repaymentFrequency), scenarioId));
    const propertyExpenses = sum(properties, (item) => allocated(item, item.propertyExpenses, scenarioId));
    const insurancePremiums = sum(policies, (item) => allocated(item, monthlyEquivalent(item.premium, item.premiumFrequency), scenarioId));
    const superContributions = sum(superAccounts, (item) => allocated(item, item.personalContribution, scenarioId));
    const hasExplicitIncome = incomeSources.length > 0 || properties.some((item) => number(item.rentalIncome)) || assets.some((item) => number(item.dividendIncome));
    const hasPlan = hasExplicitIncome || expenses.length > 0 || irregular.length > 0;
    const income = hasExplicitIncome ? explicitIncome : actuals.income;
    const essential = expenses.length ? number(byType.essential) + propertyExpenses + insurancePremiums : actuals.essential + propertyExpenses + insurancePremiums;
    const lifestyle = expenses.length ? number(byType.lifestyle) : actuals.lifestyle;
    const savings = number(byType.savings);
    const investments = number(byType.investment) + superContributions;
    const housing = sum(expenses.filter((item) => item.isHousing), (item) => allocated(item, monthlyEquivalent(item.amount, item.frequency), scenarioId))
      + sum(properties, (item) => allocated(item, monthlyEquivalent(item.requiredRepayment, item.repaymentFrequency), scenarioId));
    const buffer = income - essential - lifestyle - debtRepayments - sinkingFunds - savings - investments;

    return {
      source: hasPlan ? 'plan' : 'latest-transactions',
      sourceMonth: actuals.month,
      income,
      essential,
      lifestyle,
      debtRepayments,
      sinkingFunds,
      savings,
      investments,
      housing,
      expenses: essential + lifestyle + debtRepayments + sinkingFunds + savings + investments,
      buffer,
      essentialRate: income ? essential / income : 0,
      housingRate: income ? housing / income : 0,
      savingsRate: income ? (savings + investments) / income : 0,
      debtToIncome: income ? debtRepayments / income : 0,
    };
  }

  function dashboardSummary(state, scenarioId = 'current') {
    const balances = balanceSheet(state, scenarioId);
    const plan = monthlyPlan(state, scenarioId);
    const runway = plan.essential > 0 ? balances.emergencyCash / plan.essential : 0;
    const targetMonths = number(state.settings?.emergencyTargetMonths || 6);
    const emergencyTarget = plan.essential * targetMonths;
    return {
      ...balances,
      ...plan,
      emergencyRunway: runway,
      emergencyTargetMonths: targetMonths,
      emergencyTarget,
      emergencyGap: Math.max(0, emergencyTarget - balances.emergencyCash),
      emergencyProgress: emergencyTarget ? Math.min(1, balances.emergencyCash / emergencyTarget) : 0,
    };
  }

  function monthSequence(startDate = new Date(), count = 12) {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
  }

  function dueInMonth(item, month) {
    const due = String(item.nextDueDate || '').slice(0, 7);
    if (!due) return false;
    if (due === month) return true;
    if (String(item.frequency).toLowerCase() !== 'annual') return false;
    return due.slice(5) === month.slice(5) && month >= due;
  }

  function cashFlowForecast(state, scenarioId = 'current', startDate = new Date()) {
    const plan = monthlyPlan(state, scenarioId);
    const irregular = (state.irregularExpenses || []).filter((item) => item.active !== false);
    return monthSequence(startDate, 12).map((month) => {
      const dueDateExpenses = sum(irregular.filter((item) => (item.fundingMode || 'provision') === 'due-date' && dueInMonth(item, month)), (item) => allocated(item, item.amount, scenarioId));
      const irregularProvision = plan.sinkingFunds;
      const expenses = plan.essential + plan.lifestyle + plan.debtRepayments + irregularProvision + dueDateExpenses + plan.savings + plan.investments;
      return {
        month,
        income: plan.income,
        essential: plan.essential,
        lifestyle: plan.lifestyle,
        debtRepayments: plan.debtRepayments,
        irregular: irregularProvision + dueDateExpenses,
        savings: plan.savings,
        investments: plan.investments,
        expenses,
        surplus: plan.income - expenses,
      };
    });
  }

  function goalMetrics(goal, today = new Date()) {
    const target = number(goal.targetAmount);
    const current = number(goal.currentAmount);
    const remaining = Math.max(0, target - current);
    const targetDate = new Date(goal.targetDate);
    const months = Number.isNaN(targetDate.getTime())
      ? 0
      : Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth());
    return {
      remaining,
      progress: target ? Math.min(1, current / target) : 0,
      monthlyRequired: months ? remaining / months : remaining,
    };
  }

  function portfolioAllocation(state, scenarioId = 'current') {
    const values = {};
    (state.assets || []).filter((asset) => !asset.excludeFromNetWorth).forEach((asset) => {
      const assetClass = asset.assetClass || 'Other';
      values[assetClass] = (values[assetClass] || 0) + allocated(asset, investmentValue(asset), scenarioId);
    });
    const superValue = sum(state.superAccounts || [], (account) => allocated(account, account.balance, scenarioId));
    if (superValue) values.Superannuation = superValue;
    return values;
  }

  return {
    FREQUENCY_MONTHS,
    monthlyEquivalent,
    annualEquivalent,
    scenarioAllocation,
    latestMonth,
    transactionMonthlyActuals,
    propertyValues,
    balanceSheet,
    monthlyPlan,
    dashboardSummary,
    cashFlowForecast,
    goalMetrics,
    portfolioAllocation,
  };
}));
