const test = require('node:test');
const assert = require('node:assert/strict');
const finance = require('../src/finance.js');

const blank = () => ({
  transactions: [], accounts: [], properties: [], assets: [], superAccounts: [], liabilities: [],
  incomeSources: [], recurringExpenses: [], irregularExpenses: [], settings: { emergencyTargetMonths: 6 },
});

test('converts common Australian payment frequencies', () => {
  assert.equal(finance.monthlyEquivalent(1200, 'annual'), 100);
  assert.equal(finance.monthlyEquivalent(100, 'weekly'), 5200 / 12);
  assert.equal(finance.monthlyEquivalent(1000, 'fortnightly'), 26000 / 12);
});

test('offset cash is not double counted when linked to an account', () => {
  const state = blank();
  state.accounts.push({ id: 'offset', balance: 50000, isLiquid: true, scenarioScope: 'both' });
  state.properties.push({ marketValue: 800000, ownershipPercent: 100, mortgageBalance: 500000, offsetAccountId: 'offset', scenarioScope: 'both' });
  const result = finance.balanceSheet(state);
  assert.equal(result.totalAssets, 850000);
  assert.equal(result.totalLiabilities, 500000);
  assert.equal(result.netWorth, 350000);
  assert.equal(result.effectiveMortgageDebt, 450000);
});

test('credit limit is never treated as a liability', () => {
  const state = blank();
  state.liabilities.push({ type: 'Credit Card', currentBalance: 2400, creditLimit: 20000, scenarioScope: 'both' });
  assert.equal(finance.balanceSheet(state).totalLiabilities, 2400);
});

test('super counts toward net worth but not liquid or emergency cash', () => {
  const state = blank();
  state.superAccounts.push({ balance: 200000, scenarioScope: 'both' });
  const result = finance.balanceSheet(state);
  assert.equal(result.netWorth, 200000);
  assert.equal(result.liquidCash, 0);
  assert.equal(result.emergencyCash, 0);
});

test('ownership percentage applies to property value', () => {
  const state = blank();
  state.properties.push({ marketValue: 900000, ownershipPercent: 50, mortgageBalance: 300000, scenarioScope: 'both' });
  const result = finance.balanceSheet(state);
  assert.equal(result.propertyValue, 450000);
  assert.equal(result.propertyEquity, 150000);
});

test('linked mortgage is not counted twice', () => {
  const state = blank();
  state.properties.push({ id: 'home', name: 'Family Home', marketValue: 800000, ownershipPercent: 100, mortgageBalance: 500000, requiredRepayment: 3000, repaymentFrequency: 'monthly', scenarioScope: 'both' });
  state.liabilities.push({ name: 'Home loan', linkedAsset: 'Family Home', currentBalance: 500000, requiredRepayment: 3000, repaymentFrequency: 'monthly', scenarioScope: 'both' });
  assert.equal(finance.balanceSheet(state).totalLiabilities, 500000);
  assert.equal(finance.monthlyPlan(state).debtRepayments, 3000);
});

test('emergency runway uses accessible emergency cash and essential costs', () => {
  const state = blank();
  state.accounts.push({ balance: 18000, isLiquid: true, isEmergencyFund: true, scenarioScope: 'both' });
  state.incomeSources.push({ amount: 8000, frequency: 'monthly', scenarioScope: 'both' });
  state.recurringExpenses.push({ amount: 3000, frequency: 'monthly', expenseType: 'essential', scenarioScope: 'both' });
  assert.equal(finance.dashboardSummary(state).emergencyRunway, 6);
});

test('solo scenario respects percentage allocations', () => {
  const state = blank();
  state.incomeSources.push({ amount: 10000, frequency: 'monthly', scenarioScope: 'percentage', soloPercent: 60 });
  state.recurringExpenses.push({ amount: 4000, frequency: 'monthly', expenseType: 'essential', scenarioScope: 'percentage', soloPercent: 50 });
  const result = finance.monthlyPlan(state, 'solo');
  assert.equal(result.income, 6000);
  assert.equal(result.essential, 2000);
  assert.equal(result.buffer, 4000);
});

test('provisioned irregular expense is not counted again on its due date', () => {
  const state = blank();
  state.incomeSources.push({ amount: 5000, frequency: 'monthly', scenarioScope: 'both' });
  state.irregularExpenses.push({ amount: 1200, frequency: 'annual', nextDueDate: '2026-11-01', fundingMode: 'provision', scenarioScope: 'both' });
  const forecast = finance.cashFlowForecast(state, 'current', new Date(2026, 9, 1));
  assert.equal(forecast[0].irregular, 100);
  assert.equal(forecast[1].irregular, 100);
});

test('due-date irregular expense appears only in the due month', () => {
  const state = blank();
  state.incomeSources.push({ amount: 5000, frequency: 'monthly', scenarioScope: 'both' });
  state.irregularExpenses.push({ amount: 1200, frequency: 'annual', nextDueDate: '2026-11-01', fundingMode: 'due-date', scenarioScope: 'both' });
  const forecast = finance.cashFlowForecast(state, 'current', new Date(2026, 9, 1));
  assert.equal(forecast[0].irregular, 0);
  assert.equal(forecast[1].irregular, 1200);
});

test('transfers and work reimbursements are excluded from transaction actuals', () => {
  const state = blank();
  state.transactions = [
    { date: '2026-09-01', amount: 5000, category: 'Income' },
    { date: '2026-09-02', amount: -1000, category: 'Transfer' },
    { date: '2026-09-03', amount: 500, category: 'Work' },
    { date: '2026-09-04', amount: -400, category: 'Groceries' },
  ];
  const result = finance.transactionMonthlyActuals(state);
  assert.equal(result.income, 5000);
  assert.equal(result.essential, 400);
});

test('negative cash flow is retained in forecast', () => {
  const state = blank();
  state.incomeSources.push({ amount: 3000, frequency: 'monthly', scenarioScope: 'both' });
  state.recurringExpenses.push({ amount: 3500, frequency: 'monthly', expenseType: 'essential', scenarioScope: 'both' });
  assert.equal(finance.cashFlowForecast(state)[0].surplus, -500);
});

test('savings goals report progress without creating duplicate assets', () => {
  const state = blank();
  state.accounts.push({ id: 'savings', balance: 10000, isLiquid: true, scenarioScope: 'both' });
  state.savingsGoals = [{ linkedAccountId: 'savings', targetAmount: 20000, currentAmount: 8000, targetDate: '2027-09-01' }];
  assert.equal(finance.balanceSheet(state).totalAssets, 10000);
  assert.equal(finance.goalMetrics(state.savingsGoals[0], new Date(2026, 8, 1)).remaining, 12000);
});

test('null and zero values produce finite dashboard totals', () => {
  const state = blank();
  state.accounts.push({ balance: null, isLiquid: true, scenarioScope: 'both' });
  state.incomeSources.push({ amount: 0, frequency: 'monthly', scenarioScope: 'both' });
  const result = finance.dashboardSummary(state);
  Object.values(result).filter((value) => typeof value === 'number').forEach((value) => assert.equal(Number.isFinite(value), true));
});
