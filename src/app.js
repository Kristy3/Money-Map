const STORAGE_KEY = 'local-budget-app:v1';
const excludedCalculationCategories = ['Transfer', 'Work'];

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const defaultRules = [
  { id: makeId(), match: 'basketball, hoops, stadium sports', category: 'Kids Sports', purpose: 'Sport', person: 'Connor' },
  { id: makeId(), match: 'the him, him gift card', category: 'Gift Cards', purpose: 'General Spending', person: '' },
  { id: makeId(), match: 'pamper card, pamper gift card', category: 'Gift Cards', purpose: 'Wellness', person: '' },
  { id: makeId(), match: 'restaurant card, dining card', category: 'Gift Cards', purpose: 'Eating Out', person: '' },
  { id: makeId(), match: 'woolworths, coles, aldi, costco', category: 'Groceries', purpose: 'Household', person: 'Family' },
  { id: makeId(), match: 'salary, payroll, wages', category: 'Income', purpose: 'Income', person: 'Personal' },
  { id: makeId(), match: 'netflix, spotify, disney, apple.com/bill', category: 'Subscriptions', purpose: 'Entertainment', person: 'Family' },
  { id: makeId(), match: 'electricity, energy, water, council, gas', category: 'Utilities', purpose: 'Home', person: 'Home' },
  { id: makeId(), match: 'chemist, pharmacy, medical, doctor, dentist', category: 'Health', purpose: 'Wellness', person: 'Family' },
  { id: makeId(), match: 'uber, opal, petrol, bp, shell, caltex', category: 'Transport', purpose: 'Getting Around', person: 'Family' },
];

const initialState = {
  schemaVersion: 2,
  transactions: [],
  importHistory: [],
  debts: [],
  giftCards: [],
  accounts: [],
  properties: [],
  assets: [],
  superAccounts: [],
  liabilities: [],
  incomeSources: [],
  recurringExpenses: [],
  irregularExpenses: [],
  savingsGoals: [],
  financialGoals: [],
  insurancePolicies: [],
  netWorthSnapshots: [],
  settings: { emergencyTargetMonths: 6 },
  rules: defaultRules,
  categories: ['Groceries', 'Gift Cards', 'Gifts', 'Holiday', 'Kids Sports', 'School Fees', 'Transfer', 'Work', 'Insurance', 'Fees', 'Car', 'Tax', 'One-Off', 'Wellness', 'Subscriptions', 'Utilities', 'Health', 'Transport', 'Dining', 'Income', 'Uncategorised'],
  purposes: ['Household', 'General Spending', 'Wellness', 'Eating Out', 'Birthday', 'Charity', 'Donations', 'Lunch Orders', 'Driving Lessons', 'Clothing', 'Fuel', 'Tolls', 'Travel', 'Kids Activities', 'Eddies', 'Internet', 'Ventra', 'Apple Care', 'Sherwood', 'Dee Why', 'Berridale', 'Car', 'Tax Bill', 'School', 'Orthodontics', 'Medical', 'Amex Fees', 'Charging', 'Mobile Phone', 'Electricity', 'Parking', 'Servicing', 'Gym', 'Gaming', 'AI', 'Canada Alaska', 'USA 2026', 'Queensland 2027', 'Europe 2027', 'Sport', 'Entertainment', 'Home', 'Getting Around', 'Income'],
  people: ['Connor', 'Family', 'Home', 'Personal', 'Martin', 'Adam', 'Jacob', 'Kristy', 'Kids'],
};

let state = loadState();
let filters = { query: '', month: 'all', category: 'all', purpose: 'all', review: 'all' };
let activeScenario = 'current';

const el = {
  backupBtn: document.querySelector('#backupBtn'),
  backupInput: document.querySelector('#backupInput'),
  csvInput: document.querySelector('#csvInput'),
  notice: document.querySelector('#notice'),
  incomeMetric: document.querySelector('#incomeMetric'),
  spendingMetric: document.querySelector('#spendingMetric'),
  netMetric: document.querySelector('#netMetric'),
  countMetric: document.querySelector('#countMetric'),
  reviewMetric: document.querySelector('#reviewMetric'),
  heroMonth: document.querySelector('#heroMonth'),
  heroInsight: document.querySelector('#heroInsight'),
  importHistory: document.querySelector('#importHistory'),
  monthlyChart: document.querySelector('#monthlyChart'),
  categoryChart: document.querySelector('#categoryChart'),
  purposeChart: document.querySelector('#purposeChart'),
  giftCardDate: document.querySelector('#giftCardDate'),
  giftCardProvider: document.querySelector('#giftCardProvider'),
  giftCardAmount: document.querySelector('#giftCardAmount'),
  giftCardType: document.querySelector('#giftCardType'),
  giftCardPurpose: document.querySelector('#giftCardPurpose'),
  giftCardPerson: document.querySelector('#giftCardPerson'),
  giftCardNotes: document.querySelector('#giftCardNotes'),
  addGiftCardBtn: document.querySelector('#addGiftCardBtn'),
  giftCardSummary: document.querySelector('#giftCardSummary'),
  giftCardMatches: document.querySelector('#giftCardMatches'),
  giftCardList: document.querySelector('#giftCardList'),
  debtName: document.querySelector('#debtName'),
  debtDate: document.querySelector('#debtDate'),
  debtBalance: document.querySelector('#debtBalance'),
  addDebtBtn: document.querySelector('#addDebtBtn'),
  debtSummary: document.querySelector('#debtSummary'),
  debtChart: document.querySelector('#debtChart'),
  debtList: document.querySelector('#debtList'),
  recategoriseBtn: document.querySelector('#recategoriseBtn'),
  ruleMatch: document.querySelector('#ruleMatch'),
  ruleCategory: document.querySelector('#ruleCategory'),
  rulePurpose: document.querySelector('#rulePurpose'),
  rulePerson: document.querySelector('#rulePerson'),
  addRuleBtn: document.querySelector('#addRuleBtn'),
  ruleList: document.querySelector('#ruleList'),
  queryInput: document.querySelector('#queryInput'),
  monthSelect: document.querySelector('#monthSelect'),
  categorySelect: document.querySelector('#categorySelect'),
  purposeSelect: document.querySelector('#purposeSelect'),
  reviewSelect: document.querySelector('#reviewSelect'),
  categoryBars: document.querySelector('#categoryBars'),
  categories: document.querySelector('#categories'),
  purposes: document.querySelector('#purposes'),
  people: document.querySelector('#people'),
  transactionRows: document.querySelector('#transactionRows'),
  dropZone: document.querySelector('#dropZone'),
  nav: document.querySelector('.app-nav'),
  scenarioSelect: document.querySelector('#scenarioSelect'),
  netWorthHero: document.querySelector('#netWorthHero'),
  netWorthMetric: document.querySelector('#netWorthMetric'),
  netWorthChange: document.querySelector('#netWorthChange'),
  assetsMetric: document.querySelector('#assetsMetric'),
  liabilitiesMetric: document.querySelector('#liabilitiesMetric'),
  liquidCashMetric: document.querySelector('#liquidCashMetric'),
  monthlyIncomeMetric: document.querySelector('#monthlyIncomeMetric'),
  monthlyExpenseMetric: document.querySelector('#monthlyExpenseMetric'),
  monthlyBufferMetric: document.querySelector('#monthlyBufferMetric'),
  savingsRateMetric: document.querySelector('#savingsRateMetric'),
  incomeSourceNote: document.querySelector('#incomeSourceNote'),
  affordabilityHeadline: document.querySelector('#affordabilityHeadline'),
  affordabilityStatus: document.querySelector('#affordabilityStatus'),
  affordabilityBreakdown: document.querySelector('#affordabilityBreakdown'),
  affordabilityRatios: document.querySelector('#affordabilityRatios'),
  netWorthChart: document.querySelector('#netWorthChart'),
  forecastChart: document.querySelector('#forecastChart'),
  portfolioChart: document.querySelector('#portfolioChart'),
  forecastRows: document.querySelector('#forecastRows'),
  emergencySummary: document.querySelector('#emergencySummary'),
  emergencyTargetMonths: document.querySelector('#emergencyTargetMonths'),
  financialSignals: document.querySelector('#financialSignals'),
  snapshotBtn: document.querySelector('#snapshotBtn'),
  incomeList: document.querySelector('#incomeList'),
  expenseList: document.querySelector('#expenseList'),
  irregularExpenseList: document.querySelector('#irregularExpenseList'),
  accountList: document.querySelector('#accountList'),
  propertyList: document.querySelector('#propertyList'),
  assetList: document.querySelector('#assetList'),
  superList: document.querySelector('#superList'),
  liabilityList: document.querySelector('#liabilityList'),
  savingsGoalList: document.querySelector('#savingsGoalList'),
  financialGoalList: document.querySelector('#financialGoalList'),
  insuranceList: document.querySelector('#insuranceList'),
  propertyOffsetAccountId: document.querySelector('#propertyOffsetAccountId'),
  goalAccountId: document.querySelector('#goalAccountId'),
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? migrateState(JSON.parse(saved)) : cloneInitialState();
  } catch {
    return cloneInitialState();
  }
}

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialState));
}

function migrateState(savedState) {
  const sourceVersion = Number(savedState.schemaVersion || 1);
  const next = {
    ...cloneInitialState(),
    ...savedState,
    purposes: savedState.purposes || cloneInitialState().purposes,
  };
  next.transactions = (next.transactions || []).map((transaction) => ({
    purpose: '',
    ...transaction,
  }));
  next.importHistory = Array.isArray(next.importHistory) && next.importHistory.length
    ? next.importHistory
    : importHistoryFromTransactions(next.transactions);
  next.giftCards = (next.giftCards || []).map((giftCard) => ({
    id: makeId(),
    date: new Date().toISOString().slice(0, 10),
    provider: '',
    amount: 0,
    cardType: '',
    category: 'Gift Cards',
    purpose: '',
    person: '',
    notes: '',
    status: 'Pending',
    matchedTransactionId: '',
    createdAt: new Date().toISOString(),
    ...giftCard,
    amount: Number(giftCard.amount) || 0,
  }));
  next.debts = (next.debts || []).map((debt) => ({
    id: makeId(),
    name: 'Debt',
    date: new Date().toISOString().slice(0, 10),
    balance: 0,
    ...debt,
    balance: Number(debt.balance) || 0,
  }));
  const financialCollections = [
    'accounts', 'properties', 'assets', 'superAccounts', 'liabilities', 'incomeSources', 'recurringExpenses',
    'irregularExpenses', 'savingsGoals', 'financialGoals', 'insurancePolicies', 'netWorthSnapshots',
  ];
  financialCollections.forEach((collection) => {
    next[collection] = Array.isArray(next[collection]) ? next[collection] : [];
  });
  if (sourceVersion < 2 && !next.liabilities.length && next.debts.length) {
    const latestLegacyDebts = {};
    next.debts.forEach((debt) => {
      if (!latestLegacyDebts[debt.name] || debt.date > latestLegacyDebts[debt.name].date) latestLegacyDebts[debt.name] = debt;
    });
    next.liabilities = Object.values(latestLegacyDebts).map((debt) => ({
      id: makeId(), name: debt.name, type: 'Other', currentBalance: Number(debt.balance) || 0,
      requiredRepayment: 0, repaymentFrequency: 'monthly', scenarioScope: 'both', soloPercent: 100,
      migratedFromDebtHistory: true,
    }));
  }
  financialCollections.filter((collection) => collection !== 'netWorthSnapshots').forEach((collection) => {
    next[collection] = next[collection].map((record) => ({ scenarioScope: 'both', soloPercent: 100, ...record }));
  });
  next.settings = { ...cloneInitialState().settings, ...(next.settings || {}) };
  next.schemaVersion = 2;
  const savedRules = (next.rules || []).map((rule) => ({
    purpose: '',
    ...rule,
  }));
  const savedMatches = new Set(savedRules.map((rule) => rule.match));
  const missingStarterRules = defaultRules.filter((rule) => !savedMatches.has(rule.match));
  next.rules = [...missingStarterRules, ...savedRules];
  next.categories = [...new Set([...cloneInitialState().categories, ...(next.categories || [])])];
  next.purposes = [...new Set([...cloneInitialState().purposes, ...(next.purposes || [])])];
  next.people = [...new Set([...cloneInitialState().people, ...(next.people || [])])];
  return next;
}

function importHistoryFromTransactions(transactions) {
  const grouped = transactions.reduce((groups, transaction) => {
    const fileName = transaction.sourceFile || 'Unknown CSV';
    const existing = groups[fileName] || {
      id: makeId(),
      fileName,
      importedAt: transaction.importedAt || '',
      importedCount: 0,
      duplicateCount: 0,
      totalRows: 0,
    };
    existing.importedCount += 1;
    existing.totalRows += 1;
    if (!existing.importedAt || transaction.importedAt > existing.importedAt) {
      existing.importedAt = transaction.importedAt || existing.importedAt;
    }
    groups[fileName] = existing;
    return groups;
  }, {});

  return Object.values(grouped).sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)));
}

function commit(nextState, renderOptions) {
  state = nextState;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render(renderOptions);
}

function showNotice(message) {
  el.notice.textContent = message;
  el.notice.classList.remove('hidden');
}

function normaliseHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers, candidates) {
  return headers.find((header) => candidates.some((candidate) => normaliseHeader(header).includes(candidate)));
}

function parseMoney(value) {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim();
  const isNegative = raw.startsWith('-') || /^\(.+\)$/.test(raw);
  const cleaned = raw.replace(/[,$()\s]/g, '').replace(/[^0-9.-]/g, '');
  const number = Number.parseFloat(cleaned);
  if (Number.isNaN(number)) return 0;
  return isNegative ? -Math.abs(number) : number;
}

function parseDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const parts = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!parts) return raw;
  const [, first, second, year] = parts;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const date = new Date(Number(fullYear), Number(second) - 1, Number(first));
  return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10);
}

function fingerprint(transaction) {
  return [
    transaction.date,
    transaction.description.toLowerCase().replace(/\s+/g, ' ').trim(),
    transaction.amount.toFixed(2),
    transaction.account.toLowerCase(),
  ].join('|');
}

function applyRules(description) {
  const text = description.toLowerCase();
  const rule = state.rules.find((candidate) =>
    candidate.match
      .split(',')
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean)
      .some((keyword) => text.includes(keyword))
  );

  return {
    category: rule?.category || 'Uncategorised',
    purpose: rule?.purpose || '',
    person: rule?.person || '',
    ruleId: rule?.id || '',
  };
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
}

function mapCsvRows(rows, fileName) {
  const headers = Object.keys(rows[0] || {});
  const dateColumn = findColumn(headers, ['date', 'transactiondate', 'posteddate']);
  const descColumn = findColumn(headers, ['description', 'details', 'merchant', 'narrative', 'payee']);
  const amountColumn = findColumn(headers, ['amount', 'value']);
  const debitColumn = findColumn(headers, ['debit', 'withdrawal', 'paidout']);
  const creditColumn = findColumn(headers, ['credit', 'deposit', 'paidin']);
  const accountColumn = findColumn(headers, ['account', 'card']);

  return rows
    .filter((row) => Object.values(row).some((value) => String(value || '').trim()))
    .map((row) => {
      const description = String(row[descColumn] || row.Description || row.Details || 'Unknown transaction').trim();
      const amount = amountColumn ? parseMoney(row[amountColumn]) : parseMoney(row[creditColumn]) - parseMoney(row[debitColumn]);
      const transaction = {
        id: makeId(),
        date: parseDate(row[dateColumn]),
        description,
        amount,
        account: String(row[accountColumn] || fileName.replace(/\.csv$/i, '') || 'Imported').trim(),
        sourceFile: fileName,
        importedAt: new Date().toISOString(),
        notes: '',
        ...applyRules(description),
      };
      return { ...transaction, fingerprint: fingerprint(transaction) };
    });
}

function money(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value || 0);
}

function formatDateTime(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function monthKey(date) {
  return date?.slice(0, 7) || 'No date';
}

function isExcludedFromCalculations(transaction) {
  return excludedCalculationCategories.includes(transaction.category);
}

function addGiftCard() {
  const provider = el.giftCardProvider.value.trim();
  const amount = Number.parseFloat(el.giftCardAmount.value);
  const cardType = el.giftCardType.value.trim();
  const date = el.giftCardDate.value || new Date().toISOString().slice(0, 10);
  const purpose = el.giftCardPurpose.value.trim();
  const person = el.giftCardPerson.value.trim();
  const notes = el.giftCardNotes.value.trim();

  if (!provider || Number.isNaN(amount) || !cardType) {
    showNotice('Add a provider, amount, and card type for the gift card.');
    return;
  }

  commit({
    ...state,
    giftCards: [
      {
        id: makeId(),
        date,
        provider,
        amount,
        cardType,
        category: 'Gift Cards',
        purpose,
        person,
        notes,
        status: 'Pending',
        matchedTransactionId: '',
        createdAt: new Date().toISOString(),
      },
      ...(state.giftCards || []),
    ],
    purposes: purpose && !state.purposes.includes(purpose) ? [...state.purposes, purpose] : state.purposes,
    people: person && !state.people.includes(person) ? [...state.people, person] : state.people,
  });

  el.giftCardProvider.value = '';
  el.giftCardAmount.value = '';
  el.giftCardType.value = '';
  el.giftCardPurpose.value = '';
  el.giftCardPerson.value = '';
  el.giftCardNotes.value = '';
}

function updateGiftCardStatus(id, status) {
  commit({
    ...state,
    giftCards: (state.giftCards || []).map((giftCard) =>
      giftCard.id === id
        ? { ...giftCard, status, matchedTransactionId: status === 'Pending' ? '' : giftCard.matchedTransactionId }
        : giftCard
    ),
  });
}

function deleteGiftCard(id) {
  commit({ ...state, giftCards: (state.giftCards || []).filter((giftCard) => giftCard.id !== id) });
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return Number.POSITIVE_INFINITY;
  return Math.round((endDate - startDate) / 86400000);
}

function providerMatches(giftCard, transaction) {
  const text = `${transaction.description} ${transaction.account}`.toLowerCase();
  const providerWords = giftCard.provider
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  const knownGiftCardMerchants = ['woolworths', 'coles', 'qantas', 'marketplace', 'gift'];
  return [...providerWords, ...knownGiftCardMerchants].some((word) => text.includes(word));
}

function giftCardMatchCandidates(giftCard) {
  if (giftCard.status !== 'Pending') return [];

  return state.transactions
    .filter((transaction) => transaction.amount < 0)
    .filter((transaction) => !(state.giftCards || []).some((card) => card.matchedTransactionId === transaction.id))
    .map((transaction) => {
      const amountDifference = Math.abs(Math.abs(transaction.amount) - Math.abs(giftCard.amount));
      const dayDifference = daysBetween(giftCard.date, transaction.date);
      const merchantMatch = providerMatches(giftCard, transaction);
      let score = 0;
      if (amountDifference < 0.01) score += 60;
      else if (amountDifference <= 2) score += 35;
      else if (amountDifference <= 10) score += 15;
      if (dayDifference >= 0 && dayDifference <= 45) score += 25;
      if (dayDifference >= 0 && dayDifference <= 7) score += 10;
      if (merchantMatch) score += 20;
      return { transaction, amountDifference, dayDifference, merchantMatch, score };
    })
    .filter((candidate) => candidate.dayDifference >= -3 && candidate.dayDifference <= 60)
    .filter((candidate) => candidate.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function applyGiftCardMatch(giftCardId, transactionId) {
  const giftCard = state.giftCards.find((card) => card.id === giftCardId);
  if (!giftCard) return;

  commit({
    ...state,
    transactions: state.transactions.map((transaction) =>
      transaction.id === transactionId
        ? {
            ...transaction,
            category: 'Gift Cards',
            purpose: giftCard.purpose || transaction.purpose,
            person: giftCard.person || transaction.person,
            notes: [transaction.notes, `Matched gift card: ${giftCard.cardType}`].filter(Boolean).join(' | '),
          }
        : transaction
    ),
    giftCards: state.giftCards.map((card) =>
      card.id === giftCardId
        ? { ...card, status: 'Matched', matchedTransactionId: transactionId }
        : card
    ),
  });
  showNotice(`Matched ${giftCard.cardType} gift card to statement transaction.`);
}

function addDebt() {
  const name = el.debtName.value.trim();
  const date = el.debtDate.value || new Date().toISOString().slice(0, 10);
  const balance = Number.parseFloat(el.debtBalance.value);
  if (!name || Number.isNaN(balance)) {
    showNotice('Add a debt name and balance first.');
    return;
  }

  const existingLiability = state.liabilities.find((liability) => liability.name.toLowerCase() === name.toLowerCase());
  const liabilities = existingLiability
    ? state.liabilities.map((liability) => liability.id === existingLiability.id ? { ...liability, currentBalance: Math.abs(balance) } : liability)
    : [{ id: makeId(), name, type: 'Other', currentBalance: Math.abs(balance), requiredRepayment: 0, repaymentFrequency: 'monthly', scenarioScope: 'both', soloPercent: 100 }, ...state.liabilities];
  commitFinancial({
    ...state,
    debts: [{ id: makeId(), name, date, balance }, ...state.debts],
    liabilities,
  });
  el.debtName.value = '';
  el.debtDate.value = new Date().toISOString().slice(0, 10);
  el.debtBalance.value = '';
}

function deleteDebt(id) {
  commit({ ...state, debts: state.debts.filter((debt) => debt.id !== id) });
}

function needsReview(transaction) {
  return !transaction.category || transaction.category === 'Uncategorised' || !transaction.purpose;
}

function transactionMatchesFilters(transaction) {
  if (filters.month !== 'all' && monthKey(transaction.date) !== filters.month) return false;
  if (filters.category !== 'all' && transaction.category !== filters.category) return false;
  if (filters.purpose !== 'all' && transaction.purpose !== filters.purpose) return false;
  if (filters.review === 'needs-review' && !needsReview(transaction)) return false;
  if (filters.review === 'complete' && needsReview(transaction)) return false;

  const haystack = `${transaction.description} ${transaction.category} ${transaction.purpose} ${transaction.person} ${transaction.account}`.toLowerCase();
  return haystack.includes(filters.query.toLowerCase());
}

function filteredTransactions() {
  return state.transactions
    .filter(transactionMatchesFilters)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function updateTransaction(id, field, value) {
  let updatedTransaction;
  const next = {
    ...state,
    transactions: state.transactions.map((transaction) => {
      if (transaction.id !== id) return transaction;
      updatedTransaction = { ...transaction, [field]: value };
      return updatedTransaction;
    }),
    categories: field === 'category' && value && !state.categories.includes(value) ? [...state.categories, value] : state.categories,
    purposes: field === 'purpose' && value && !state.purposes.includes(value) ? [...state.purposes, value] : state.purposes,
    people: field === 'person' && value && !state.people.includes(value) ? [...state.people, value] : state.people,
  };
  commit(next, { renderTransactionRows: !updatedTransaction || !transactionMatchesFilters(updatedTransaction) });
  return updatedTransaction;
}

function addRule() {
  const match = el.ruleMatch.value.trim();
  const category = el.ruleCategory.value.trim();
  const purpose = el.rulePurpose.value.trim();
  const person = el.rulePerson.value.trim();
  if (!match || !category) return;

  commit({
    ...state,
    rules: [{ id: makeId(), match, category, purpose, person }, ...state.rules],
    categories: category && !state.categories.includes(category) ? [...state.categories, category] : state.categories,
    purposes: purpose && !state.purposes.includes(purpose) ? [...state.purposes, purpose] : state.purposes,
    people: person && !state.people.includes(person) ? [...state.people, person] : state.people,
  });
  el.ruleMatch.value = '';
  el.ruleCategory.value = '';
  el.rulePurpose.value = '';
  el.rulePerson.value = '';
}

function deleteRule(id) {
  commit({ ...state, rules: state.rules.filter((rule) => rule.id !== id) });
}

function recategoriseAll() {
  commit({
    ...state,
    transactions: state.transactions.map((transaction) => ({
      ...transaction,
      ...applyRules(transaction.description),
    })),
  });
  showNotice('Rules re-applied to all imported transactions.');
}

function handleFiles(files) {
  [...files].forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imported = mapCsvRows(parseCsv(reader.result), file.name);
      const existing = new Set(state.transactions.map((transaction) => transaction.fingerprint));
      const unique = imported.filter((transaction) => !existing.has(transaction.fingerprint));
      const duplicateCount = imported.length - unique.length;
      commit({
        ...state,
        transactions: [...unique, ...state.transactions],
        importHistory: [
          {
            id: makeId(),
            fileName: file.name,
            importedAt: new Date().toISOString(),
            importedCount: unique.length,
            duplicateCount,
            totalRows: imported.length,
          },
          ...(state.importHistory || []),
        ],
      });
      showNotice(`Imported ${unique.length} new transactions from ${file.name}. Skipped ${duplicateCount} duplicates.`);
    };
    reader.onerror = () => showNotice(`Could not import ${file.name}.`);
    reader.readAsText(file);
  });
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.local.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      commit(migrateState(JSON.parse(reader.result)));
      showNotice('Backup restored.');
    } catch {
      showNotice('That backup file could not be read.');
    }
  };
  reader.readAsText(file);
}

const frequencyLabels = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', quarterly: 'Quarterly',
  'half-yearly': 'Half-yearly', annual: 'Annual', 'one-off': 'One-off',
};

const scenarioScopeLabels = {
  both: 'Both scenarios', 'current-only': 'Current only', 'solo-only': 'Future / Solo only', percentage: 'Current + Solo percentage',
};

function initialiseFormOptions() {
  document.querySelectorAll('[data-frequency]').forEach((select) => {
    const selected = select.dataset.default || select.value || 'monthly';
    select.innerHTML = Object.entries(frequencyLabels).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
  });
  document.querySelectorAll('[data-scenario-scope]').forEach((select) => {
    select.innerHTML = Object.entries(scenarioScopeLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  });
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function withNetWorthSnapshots(nextState) {
  const hasFinancialData = ['accounts', 'properties', 'assets', 'superAccounts', 'liabilities'].some((collection) => nextState[collection]?.length);
  if (!hasFinancialData) return nextState;
  const date = todayKey();
  const snapshots = [...(nextState.netWorthSnapshots || [])];
  ['current', 'solo'].forEach((scenario) => {
    const summary = MoneyMapFinance.dashboardSummary(nextState, scenario);
    const snapshot = {
      id: snapshots.find((item) => item.date === date && item.scenario === scenario)?.id || makeId(),
      date,
      scenario,
      netWorth: summary.netWorth,
      cash: summary.cash,
      property: summary.propertyValue,
      investments: summary.investments,
      superannuation: summary.superannuation,
      liabilities: summary.totalLiabilities,
    };
    const index = snapshots.findIndex((item) => item.date === date && item.scenario === scenario);
    if (index >= 0) snapshots[index] = snapshot;
    else snapshots.push(snapshot);
  });
  return { ...nextState, netWorthSnapshots: snapshots };
}

function commitFinancial(nextState, message) {
  commit(withNetWorthSnapshots(nextState));
  if (message) showNotice(message);
}

function recordFromForm(form) {
  return [...form.elements].reduce((record, field) => {
    if (!field.name) return record;
    if (field.type === 'checkbox') record[field.name] = field.checked;
    else if (field.type === 'number') record[field.name] = field.value === '' ? 0 : Number(field.value);
    else record[field.name] = field.value.trim();
    return record;
  }, { id: makeId(), createdAt: new Date().toISOString(), active: true });
}

function validateSavingsAllocation(record) {
  if (!record.linkedAccountId) return '';
  const account = state.accounts.find((item) => item.id === record.linkedAccountId);
  const alreadyAllocated = state.savingsGoals
    .filter((goal) => goal.linkedAccountId === record.linkedAccountId)
    .reduce((sum, goal) => sum + (Number(goal.currentAmount) || 0), 0);
  return alreadyAllocated + (Number(record.currentAmount) || 0) > (Number(account?.balance) || 0)
    ? 'That would allocate more than the linked account balance across your goals.'
    : '';
}

function addFinancialRecord(form) {
  const collection = form.dataset.addRecord;
  if (!Array.isArray(state[collection])) return;
  const record = recordFromForm(form);
  if (collection === 'accounts' && record.isEmergencyFund) record.isLiquid = true;
  if (collection === 'properties' && record.offsetAccountId) record.offsetBalance = 0;
  if (collection === 'liabilities') record.currentBalance = Math.abs(Number(record.currentBalance) || 0);
  if (collection === 'savingsGoals') {
    const allocationError = validateSavingsAllocation(record);
    if (allocationError) {
      showNotice(allocationError);
      return;
    }
  }
  commitFinancial({ ...state, [collection]: [record, ...state[collection]] }, 'Financial record added.');
  form.reset();
  initialiseFormOptions();
  form.closest('details')?.removeAttribute('open');
}

function deleteFinancialRecord(collection, id) {
  if (!Array.isArray(state[collection])) return;
  commitFinancial({ ...state, [collection]: state[collection].filter((record) => record.id !== id) }, 'Financial record removed.');
}

function saveSnapshot() {
  commit(withNetWorthSnapshots(state));
  showNotice(`Net worth snapshot saved for ${new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date())}.`);
}

function formatPercent(value, digits = 0) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(date);
}

function scenarioLabel(record) {
  const label = scenarioScopeLabels[record.scenarioScope] || 'Both scenarios';
  return record.scenarioScope === 'percentage' ? `${label} (${record.soloPercent || 0}% solo)` : label;
}

function recordRow({ collection, id, title, meta, value, extra = '' }) {
  return `<article class="record-item"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span>${extra}</div><b>${escapeHtml(value)}</b><button type="button" data-delete-record="${escapeHtml(id)}" data-collection="${escapeHtml(collection)}">Remove</button></article>`;
}

function renderFinancialRecords() {
  el.incomeList.innerHTML = state.incomeSources.length ? state.incomeSources.map((item) => recordRow({ collection: 'incomeSources', id: item.id, title: item.name, meta: `${item.category} · ${frequencyLabels[item.frequency] || item.frequency} · ${item.incomeBasis || 'net'} · ${scenarioLabel(item)}`, value: `${money(item.amount)} → ${money(MoneyMapFinance.monthlyEquivalent(item.amount, item.frequency))}/mo` })).join('') : '<p class="empty-history">No income sources added. The overview will use your latest imported month until you add a plan.</p>';
  el.expenseList.innerHTML = state.recurringExpenses.length ? state.recurringExpenses.map((item) => recordRow({ collection: 'recurringExpenses', id: item.id, title: item.name, meta: `${item.category} · ${item.expenseType} · ${frequencyLabels[item.frequency] || item.frequency} · ${scenarioLabel(item)}`, value: `${money(MoneyMapFinance.monthlyEquivalent(item.amount, item.frequency))}/mo` })).join('') : '<p class="empty-history">No regular expenses added.</p>';
  el.irregularExpenseList.innerHTML = state.irregularExpenses.length ? state.irregularExpenses.map((item) => {
    const provision = Number(item.monthlyProvision) || MoneyMapFinance.monthlyEquivalent(item.amount, item.frequency);
    return recordRow({ collection: 'irregularExpenses', id: item.id, title: item.name, meta: `${item.category} · ${item.fundingMode === 'due-date' ? 'full cost in due month' : 'monthly provision'}${item.nextDueDate ? ` · due ${formatDate(item.nextDueDate)}` : ''}`, value: item.fundingMode === 'due-date' ? money(item.amount) : `${money(provision)}/mo` });
  }).join('') : '<p class="empty-history">No annual or irregular expenses added.</p>';
  el.accountList.innerHTML = state.accounts.length ? state.accounts.map((item) => recordRow({ collection: 'accounts', id: item.id, title: item.name, meta: `${item.institution || 'No institution'} · ${item.accountType} · ${item.isLiquid ? 'liquid' : 'not liquid'}${item.isEmergencyFund ? ' · emergency fund' : ''} · ${scenarioLabel(item)}`, value: money(item.balance) })).join('') : '<p class="empty-history">No cash or bank accounts added.</p>';
  el.propertyList.innerHTML = state.properties.length ? state.properties.map((item) => {
    const ownershipValue = Number(item.marketValue || 0) * Number(item.ownershipPercent || 100) / 100;
    const offset = item.offsetAccountId ? state.accounts.find((account) => account.id === item.offsetAccountId)?.balance || 0 : item.offsetBalance || 0;
    return recordRow({ collection: 'properties', id: item.id, title: item.name, meta: `${item.propertyType} · ${item.ownershipPercent || 100}% ownership · mortgage ${money(item.mortgageBalance)} · offset ${money(offset)}`, value: `Share ${money(ownershipValue)}` });
  }).join('') : '<p class="empty-history">No properties added.</p>';
  el.assetList.innerHTML = state.assets.length ? state.assets.map((item) => {
    const gain = Number(item.currentValue || 0) - Number(item.costBase || 0);
    return recordRow({ collection: 'assets', id: item.id, title: item.name, meta: `${item.assetClass}${item.ticker ? ` · ${item.ticker}` : ''} · ${scenarioLabel(item)}${item.excludeFromNetWorth ? ' · excluded from net worth' : ''}`, value: `${money(item.currentValue)} (${gain >= 0 ? '+' : ''}${money(gain)})` });
  }).join('') : '<p class="empty-history">No investments or other assets added.</p>';
  el.superList.innerHTML = state.superAccounts.length ? state.superAccounts.map((item) => recordRow({ collection: 'superAccounts', id: item.id, title: item.fund, meta: `${item.investmentOption || 'Investment option not set'} · ${scenarioLabel(item)}${item.beneficiaryStatus ? ` · ${item.beneficiaryStatus}` : ''}`, value: money(item.balance) })).join('') : '<p class="empty-history">No superannuation funds added.</p>';
  el.liabilityList.innerHTML = state.liabilities.length ? state.liabilities.map((item) => recordRow({ collection: 'liabilities', id: item.id, title: item.name, meta: `${item.type} · ${item.interestRate || 0}% · ${money(MoneyMapFinance.monthlyEquivalent(item.requiredRepayment, item.repaymentFrequency))}/mo${item.type === 'Credit Card' && item.creditLimit ? ` · ${money(item.creditLimit)} limit` : ''} · ${scenarioLabel(item)}`, value: money(item.currentBalance) })).join('') : '<p class="empty-history">No debts or credit cards added.</p>';

  const goalRows = (collection) => state[collection].map((goal) => {
    const metrics = MoneyMapFinance.goalMetrics(goal);
    return `<article class="goal-item"><div class="goal-heading"><div><strong>${escapeHtml(goal.name)}</strong><span>${escapeHtml(goal.goalType || '')}${goal.targetDate ? ` · ${escapeHtml(formatDate(goal.targetDate))}` : ''}</span></div><b>${formatPercent(metrics.progress)}</b></div><div class="progress-track"><i style="width:${metrics.progress * 100}%"></i></div><div class="goal-numbers"><span>${money(goal.currentAmount)} saved</span><span>${money(metrics.remaining)} remaining</span><span>${money(metrics.monthlyRequired)}/mo needed</span></div><button type="button" data-delete-record="${escapeHtml(goal.id)}" data-collection="${collection}">Remove</button></article>`;
  }).join('');
  el.savingsGoalList.innerHTML = state.savingsGoals.length ? goalRows('savingsGoals') : '<p class="empty-history">No savings goals added.</p>';
  el.financialGoalList.innerHTML = state.financialGoals.length ? goalRows('financialGoals') : '<p class="empty-history">No financial goals added.</p>';
  el.insuranceList.innerHTML = state.insurancePolicies.length ? state.insurancePolicies.map((item) => recordRow({ collection: 'insurancePolicies', id: item.id, title: `${item.policyType} · ${item.provider}`, meta: `${item.renewalDate ? `Renews ${formatDate(item.renewalDate)} · ` : ''}${item.reference || 'No reference'} · ${scenarioLabel(item)}`, value: `${money(MoneyMapFinance.monthlyEquivalent(item.premium, item.premiumFrequency))}/mo` })).join('') : '<p class="empty-history">No insurance policies added.</p>';

  const accountOptions = state.accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)} · ${money(account.balance)}</option>`).join('');
  const currentOffset = el.propertyOffsetAccountId.value;
  const currentGoalAccount = el.goalAccountId.value;
  el.propertyOffsetAccountId.innerHTML = `<option value="">No linked offset account</option>${state.accounts.filter((account) => account.isOffset || account.accountType === 'Offset').map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join('')}`;
  el.goalAccountId.innerHTML = `<option value="">No linked account</option>${accountOptions}`;
  el.propertyOffsetAccountId.value = currentOffset;
  el.goalAccountId.value = currentGoalAccount;
}

function renderOptions(select, options, allLabel) {
  const current = select.value;
  const sortedOptions = sortLabels(options);
  select.innerHTML = [`<option value="all">${allLabel}</option>`, ...sortedOptions.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)].join('');
  select.value = options.includes(current) ? current : 'all';
}

function renderValueOptions(options, currentValue, placeholder = '') {
  const values = sortLabels([...new Set([currentValue, ...options].filter((value) => value !== undefined && value !== null))]);
  const placeholderOption = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : '';
  return `${placeholderOption}${values.map((option) => `
    <option value="${escapeHtml(option)}" ${option === currentValue ? 'selected' : ''}>${escapeHtml(option)}</option>
  `).join('')}`;
}

function sortLabels(values) {
  return [...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
}

function chipClass(value) {
  return `chip chip-${String(value || 'empty').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function transactionChips(transaction) {
  return `
    <span class="${chipClass(transaction.category)}">${escapeHtml(transaction.category || 'Uncategorised')}</span>
    ${transaction.purpose ? `<span class="${chipClass(transaction.purpose)}">${escapeHtml(transaction.purpose)}</span>` : ''}
    ${transaction.person ? `<span class="${chipClass(transaction.person)}">${escapeHtml(transaction.person)}</span>` : ''}
    ${isExcludedFromCalculations(transaction) ? '<span class="chip chip-excluded">Excluded</span>' : ''}
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function sumBy(items, keyGetter, valueGetter) {
  return items.reduce((groups, item) => {
    const key = keyGetter(item) || 'Uncategorised';
    groups[key] = (groups[key] || 0) + valueGetter(item);
    return groups;
  }, {});
}

function renderHorizontalChart(container, entries, options = {}) {
  const sortedEntries = entries
    .filter(([, value]) => Math.abs(value) > 0)
    .sort((a, b) => (options.preserveOrder ? 0 : Math.abs(b[1]) - Math.abs(a[1])));
  const cleaned = options.preserveOrder
    ? sortedEntries.slice(-(options.limit || 8))
    : sortedEntries.slice(0, options.limit || 8);

  if (!cleaned.length) {
    container.className = 'chart empty-chart';
    container.textContent = options.emptyText || 'No chart data yet.';
    return;
  }

  const max = Math.max(...cleaned.map(([, value]) => Math.abs(value)), 1);
  container.className = 'chart';
  container.innerHTML = cleaned.map(([label, value], index) => `
    <div class="chart-row ${value < 0 ? 'is-negative' : ''}">
      <span>${escapeHtml(label)}</span>
      <div><i style="width: ${(Math.abs(value) / max) * 100}%; --bar-index: ${index};"></i></div>
      <b>${money(value)}</b>
    </div>
  `).join('');
}

function renderMonthlyChart(transactions) {
  const monthly = sumBy(
    transactions.filter((transaction) => transaction.amount < 0),
    (transaction) => monthKey(transaction.date),
    (transaction) => Math.abs(transaction.amount)
  );
  renderHorizontalChart(el.monthlyChart, Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])), {
    emptyText: 'Import transactions to see monthly spending.',
    limit: 12,
  });
}

function formatMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return value || '';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function renderDashboard() {
  const summary = MoneyMapFinance.dashboardSummary(state, activeScenario);
  const forecast = MoneyMapFinance.cashFlowForecast(state, activeScenario);
  const snapshots = (state.netWorthSnapshots || [])
    .filter((item) => item.scenario === activeScenario)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const currentSnapshot = snapshots.at(-1);
  const previousSnapshot = snapshots.length > 1 ? snapshots.at(-2) : null;
  const change = previousSnapshot ? summary.netWorth - Number(previousSnapshot.netWorth || 0) : 0;

  el.netWorthHero.textContent = summary.totalAssets || summary.totalLiabilities ? `Net worth ${money(summary.netWorth)}` : 'Build your complete Money Map';
  el.heroInsight.textContent = summary.income
    ? `${activeScenario === 'solo' ? 'Future / Solo' : 'Current'} monthly buffer is ${money(summary.buffer)}, with ${summary.emergencyRunway.toFixed(1)} months of essential costs accessible for emergencies.`
    : 'Add accounts, income and regular costs to see whether your money comfortably supports your life.';
  el.netWorthMetric.textContent = money(summary.netWorth);
  el.assetsMetric.textContent = money(summary.totalAssets);
  el.liabilitiesMetric.textContent = money(summary.totalLiabilities);
  el.liquidCashMetric.textContent = money(summary.liquidCash);
  el.monthlyIncomeMetric.textContent = money(summary.income);
  el.monthlyExpenseMetric.textContent = money(summary.expenses);
  el.monthlyBufferMetric.textContent = money(summary.buffer);
  el.monthlyBufferMetric.className = summary.buffer < 0 ? 'negative' : 'positive';
  el.savingsRateMetric.textContent = formatPercent(summary.savingsRate);
  el.incomeSourceNote.textContent = summary.source === 'plan' ? 'From your income plan' : `From ${summary.sourceMonth ? formatMonth(summary.sourceMonth) : 'latest transactions'}`;
  el.netWorthChange.textContent = previousSnapshot
    ? `${change >= 0 ? '+' : ''}${money(change)} since ${formatDate(previousSnapshot.date)}`
    : currentSnapshot ? `Snapshot saved ${formatDate(currentSnapshot.date)}` : 'No previous snapshot';

  const hasIncome = summary.income > 0;
  const comfortable = hasIncome && summary.buffer >= summary.income * 0.1;
  const tight = hasIncome && summary.buffer >= 0 && !comfortable;
  el.affordabilityHeadline.textContent = !hasIncome ? 'Add reliable income to complete the picture' : comfortable ? 'Your regular income supports this plan' : tight ? 'Your plan fits, with a narrow buffer' : 'Your planned costs exceed regular income';
  el.affordabilityStatus.textContent = !hasIncome ? 'Needs setup' : comfortable ? 'Comfortable' : tight ? 'Tight' : 'Deficit';
  el.affordabilityStatus.className = `status-badge ${!hasIncome ? 'neutral' : comfortable ? 'good' : tight ? 'warning' : 'danger'}`;
  el.affordabilityBreakdown.innerHTML = [
    ['Net monthly income', summary.income], ['Essential living costs', -summary.essential], ['Debt repayments', -summary.debtRepayments],
    ['Lifestyle spending', -summary.lifestyle], ['Sinking fund provisions', -summary.sinkingFunds],
    ['Savings and investments', -(summary.savings + summary.investments)], ['Remaining buffer', summary.buffer],
  ].map(([label, value], index) => `<div class="affordability-row ${index === 6 ? 'total' : ''}"><span>${escapeHtml(label)}</span><strong class="${value < 0 ? 'negative' : 'positive'}">${money(value)}</strong></div>`).join('');
  el.affordabilityRatios.innerHTML = [
    ['Essentials / income', summary.essentialRate], ['Housing / income', summary.housingRate], ['Savings / investing', summary.savingsRate],
    ['Debt / income', summary.debtToIncome], ['Emergency runway', `${summary.emergencyRunway.toFixed(1)} months`],
  ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${typeof value === 'number' ? formatPercent(value) : escapeHtml(value)}</strong></div>`).join('');

  renderHorizontalChart(el.netWorthChart, snapshots.map((item) => [formatDate(item.date), Number(item.netWorth)]), { preserveOrder: true, limit: 12, emptyText: 'Add financial records to start tracking net worth.' });
  renderHorizontalChart(el.forecastChart, forecast.map((item) => [formatMonth(item.month), item.surplus]), { preserveOrder: true, limit: 12, emptyText: 'Add income and expenses to build a forecast.' });
  const wealthMix = {
    'Liquid cash': summary.liquidCash,
    'Other cash': Math.max(0, summary.cash - summary.liquidCash),
    'Property equity': summary.propertyEquity,
    Investments: summary.investments,
    Superannuation: summary.superannuation,
    'Other assets': summary.otherAssets,
  };
  renderHorizontalChart(el.portfolioChart, Object.entries(wealthMix), { emptyText: 'Add assets to see your allocation.' });

  el.emergencySummary.innerHTML = `<div class="progress-heading"><div><span>Accessible emergency savings</span><strong>${money(summary.emergencyCash)}</strong></div><b>${summary.emergencyRunway.toFixed(1)} months</b></div><div class="progress-track"><i style="width:${summary.emergencyProgress * 100}%"></i></div><div class="goal-numbers"><span>Target ${money(summary.emergencyTarget)}</span><span>${money(summary.emergencyGap)} remaining</span><span>${formatPercent(summary.emergencyProgress)} complete</span></div>`;
  el.emergencyTargetMonths.value = summary.emergencyTargetMonths;

  const upcoming = [
    ...(state.insurancePolicies || []).filter((item) => item.renewalDate).map((item) => ({ label: `${item.policyType} renewal`, date: item.renewalDate })),
    ...(state.liabilities || []).filter((item) => item.type === 'Credit Card' && item.paymentDueDate).map((item) => ({ label: `${item.name} payment`, date: item.paymentDueDate })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  el.financialSignals.innerHTML = `
    <div><span>Debt-to-income</span><strong>${formatPercent(summary.debtToIncome)}</strong></div>
    <div><span>Superannuation</span><strong>${money(summary.superannuation)}</strong></div>
    <div><span>Investments</span><strong>${money(summary.investments)}</strong></div>
    <div><span>Property equity</span><strong>${money(summary.propertyEquity)}</strong></div>
    ${upcoming.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(formatDate(item.date))}</strong></div>`).join('')}
    ${!upcoming.length ? '<p class="empty-history">No upcoming insurance renewals or card payments recorded.</p>' : ''}
  `;

  el.forecastRows.innerHTML = forecast.map((item) => `<tr><td>${escapeHtml(formatMonth(item.month))}</td><td>${money(item.income)}</td><td>${money(item.essential)}</td><td>${money(item.lifestyle)}</td><td>${money(item.debtRepayments)}</td><td>${money(item.irregular)}</td><td>${money(item.savings + item.investments)}</td><td class="${item.surplus < 0 ? 'negative' : 'positive'}"><strong>${money(item.surplus)}</strong></td></tr>`).join('');
}

function latestDebtSnapshots() {
  const latest = {};
  state.debts.forEach((debt) => {
    if (!latest[debt.name] || debt.date > latest[debt.name].date) latest[debt.name] = debt;
  });
  return Object.values(latest).sort((a, b) => b.balance - a.balance);
}

function debtTimelineEntries() {
  const dates = [...new Set(state.debts.map((debt) => debt.date))].sort();
  const names = [...new Set(state.debts.map((debt) => debt.name))];

  return dates.map((date) => {
    const total = names.reduce((sum, name) => {
      const latestForDebt = state.debts
        .filter((debt) => debt.name === name && debt.date <= date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      return sum + (latestForDebt?.balance || 0);
    }, 0);
    return [date, total];
  });
}

function renderDebts() {
  const latest = latestDebtSnapshots();
  const totalDebt = latest.reduce((sum, debt) => sum + debt.balance, 0);
  el.debtSummary.innerHTML = latest.length
    ? `<span>Total latest debt</span><strong>${money(totalDebt)}</strong><small>${latest.length} tracked ${latest.length === 1 ? 'debt' : 'debts'}</small>`
    : '<span>No debts tracked yet</span><strong>$0.00</strong><small>Add a balance snapshot whenever you want.</small>';

  renderHorizontalChart(el.debtChart, debtTimelineEntries(), {
    emptyText: 'Add a debt balance to start tracking progress.',
    limit: 12,
    preserveOrder: true,
  });

  const rows = [...state.debts].sort((a, b) => b.date.localeCompare(a.date));
  el.debtList.innerHTML = rows.length ? rows.map((debt) => `
    <article class="debt-item">
      <div>
        <strong>${escapeHtml(debt.name)}</strong>
        <span>${escapeHtml(debt.date)}</span>
      </div>
      <b>${money(debt.balance)}</b>
      <button type="button" data-delete-debt="${escapeHtml(debt.id)}">Remove</button>
    </article>
  `).join('') : '';
}

function renderGiftCards() {
  const giftCards = [...(state.giftCards || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const pending = giftCards.filter((giftCard) => giftCard.status === 'Pending');
  const matched = giftCards.filter((giftCard) => giftCard.status === 'Matched');
  const pendingTotal = pending.reduce((sum, giftCard) => sum + giftCard.amount, 0);

  el.giftCardSummary.innerHTML = `
    <div class="gift-card-stat">
      <span>Pending value</span>
      <strong>${money(pendingTotal)}</strong>
    </div>
    <div class="gift-card-stat">
      <span>Pending</span>
      <strong>${pending.length}</strong>
    </div>
    <div class="gift-card-stat">
      <span>Matched</span>
      <strong>${matched.length}</strong>
    </div>
  `;

  const matchRows = pending.flatMap((giftCard) =>
    giftCardMatchCandidates(giftCard).map((candidate) => ({ giftCard, ...candidate }))
  );

  el.giftCardMatches.innerHTML = matchRows.length ? matchRows.map(({ giftCard, transaction, dayDifference, merchantMatch }) => `
    <article class="gift-card-match">
      <div>
        <strong>${escapeHtml(giftCard.cardType)}</strong>
        <span>${escapeHtml(giftCard.provider)} ${money(giftCard.amount)} bought ${escapeHtml(giftCard.date)}</span>
      </div>
      <div>
        <strong>${escapeHtml(transaction.description)}</strong>
        <span>${money(Math.abs(transaction.amount))} on ${escapeHtml(transaction.date)}${merchantMatch ? ' · merchant looks right' : ''}${Number.isFinite(dayDifference) ? ` · ${dayDifference} days later` : ''}</span>
      </div>
      <button type="button" data-match-gift-card="${escapeHtml(giftCard.id)}" data-match-transaction="${escapeHtml(transaction.id)}">Apply match</button>
    </article>
  `).join('') : '<p class="empty-history">No possible gift card matches right now.</p>';

  el.giftCardList.innerHTML = giftCards.length ? giftCards.map((giftCard) => `
    <article class="gift-card-item ${giftCard.status === 'Matched' ? 'is-matched' : ''}">
      <div>
        <strong>${escapeHtml(giftCard.cardType)}</strong>
        <span>${escapeHtml(giftCard.provider)} · ${escapeHtml(giftCard.date)}</span>
        <div class="chip-row">
          <span class="chip chip-gift-cards">${escapeHtml(giftCard.status)}</span>
          ${giftCard.purpose ? `<span class="${chipClass(giftCard.purpose)}">${escapeHtml(giftCard.purpose)}</span>` : ''}
          ${giftCard.person ? `<span class="${chipClass(giftCard.person)}">${escapeHtml(giftCard.person)}</span>` : ''}
        </div>
        ${giftCard.notes ? `<small>${escapeHtml(giftCard.notes)}</small>` : ''}
      </div>
      <b>${money(giftCard.amount)}</b>
      <div class="gift-card-actions">
        ${giftCard.status === 'Pending'
          ? `<button type="button" data-gift-status="${escapeHtml(giftCard.id)}" data-status="Used">Used</button>`
          : `<button type="button" data-gift-status="${escapeHtml(giftCard.id)}" data-status="Pending">Reopen</button>`}
        <button type="button" data-delete-gift-card="${escapeHtml(giftCard.id)}">Remove</button>
      </div>
    </article>
  `).join('') : '<p class="empty-history">No gift cards recorded yet.</p>';
}

function renderImportHistory() {
  const history = [...(state.importHistory || [])]
    .sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))
    .slice(0, 8);

  el.importHistory.innerHTML = history.length ? history.map((item) => `
    <article class="import-history-item">
      <div>
        <strong>${escapeHtml(item.fileName)}</strong>
        <span>${escapeHtml(formatDateTime(item.importedAt))}</span>
      </div>
      <div>
        <b>${item.importedCount || 0}</b>
        <span>new</span>
      </div>
      <div>
        <b>${item.duplicateCount || 0}</b>
        <span>duplicates</span>
      </div>
    </article>
  `).join('') : '<p class="empty-history">No CSV imports recorded yet.</p>';
}

function render({ renderTransactionRows = true } = {}) {
  const filtered = filteredTransactions();
  const calculated = filtered.filter((transaction) => !isExcludedFromCalculations(transaction));
  const expenses = calculated.filter((transaction) => transaction.amount < 0).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const income = calculated.filter((transaction) => transaction.amount > 0).reduce((sum, transaction) => sum + transaction.amount, 0);
  const net = income - expenses;
  const byCategory = calculated.reduce((groups, transaction) => {
    const key = transaction.category || 'Uncategorised';
    groups[key] = (groups[key] || 0) + transaction.amount;
    return groups;
  }, {});
  const byPurpose = sumBy(
    calculated.filter((transaction) => transaction.amount < 0),
    (transaction) => transaction.purpose || 'No purpose',
    (transaction) => Math.abs(transaction.amount)
  );
  const reviewCount = state.transactions.filter(needsReview).length;
  el.incomeMetric.textContent = money(income);
  el.spendingMetric.textContent = money(expenses);
  el.netMetric.textContent = money(net);
  el.netMetric.className = net < 0 ? 'negative' : 'positive';
  el.countMetric.textContent = filtered.length;
  el.reviewMetric.textContent = reviewCount;

  const months = [...new Set(state.transactions.map((transaction) => monthKey(transaction.date)))];
  renderOptions(el.monthSelect, months, 'All months');
  renderOptions(el.categorySelect, state.categories, 'All categories');
  renderOptions(el.purposeSelect, state.purposes, 'All purposes');

  el.categories.innerHTML = sortLabels(state.categories).map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  el.purposes.innerHTML = sortLabels(state.purposes).map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  el.people.innerHTML = sortLabels(state.people).map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');

  el.ruleList.innerHTML = state.rules.map((rule) => `
    <article class="rule">
      <button type="button" data-delete-rule="${escapeHtml(rule.id)}" title="Delete rule">Remove</button>
      <strong>${escapeHtml(rule.category)}</strong>
      ${rule.purpose ? `<span>${escapeHtml(rule.purpose)}</span>` : ''}
      ${rule.person ? `<span>${escapeHtml(rule.person)}</span>` : ''}
      <p>${escapeHtml(rule.match)}</p>
    </article>
  `).join('');

  el.categoryBars.innerHTML = Object.entries(byCategory)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
    .map(([name, total]) => `
      <div class="bar-row">
        <span>${escapeHtml(name)}</span>
        <div><i style="width: ${Math.min(100, (Math.abs(total) / Math.max(1, expenses)) * 100)}%"></i></div>
        <b>${money(total)}</b>
      </div>
    `).join('');

  renderMonthlyChart(calculated);
  renderHorizontalChart(el.categoryChart, Object.entries(byCategory).filter(([, total]) => total < 0).map(([name, total]) => [name, Math.abs(total)]), {
    emptyText: 'No spending categories yet.',
  });
  renderHorizontalChart(el.purposeChart, Object.entries(byPurpose), {
    emptyText: 'No purpose data yet.',
  });
  renderGiftCards();
  renderDebts();
  renderImportHistory();
  renderFinancialRecords();
  renderDashboard();

  if (renderTransactionRows) el.transactionRows.innerHTML = filtered.length ? filtered.map((transaction) => `
    <tr>
      <td>${escapeHtml(transaction.date)}</td>
      <td>
        <strong>${escapeHtml(transaction.description)}</strong>
        <small>${escapeHtml(transaction.sourceFile)}</small>
        <div class="chip-row">
          ${transactionChips(transaction)}
        </div>
      </td>
      <td class="${transaction.amount < 0 ? 'negative' : 'positive'}">${money(transaction.amount)}</td>
      <td>
        <select data-transaction="${transaction.id}" data-field="category">
          ${renderValueOptions(state.categories, transaction.category || 'Uncategorised')}
        </select>
      </td>
      <td>
        <select data-transaction="${transaction.id}" data-field="purpose">
          ${renderValueOptions(state.purposes, transaction.purpose || '', 'Optional')}
        </select>
      </td>
      <td>
        <select data-transaction="${transaction.id}" data-field="person">
          ${renderValueOptions(state.people, transaction.person || '', 'Optional')}
        </select>
      </td>
      <td>${escapeHtml(transaction.account)}</td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty">Upload a CSV statement to start building your budget.</td></tr>';
}

el.csvInput.addEventListener('change', (event) => handleFiles(event.target.files));
el.backupBtn.addEventListener('click', exportBackup);
el.backupInput.addEventListener('change', (event) => importBackup(event.target.files[0]));
el.giftCardDate.value = new Date().toISOString().slice(0, 10);
el.addGiftCardBtn.addEventListener('click', addGiftCard);
el.debtDate.value = new Date().toISOString().slice(0, 10);
el.addDebtBtn.addEventListener('click', addDebt);
el.addRuleBtn.addEventListener('click', addRule);
el.recategoriseBtn.addEventListener('click', recategoriseAll);
el.queryInput.addEventListener('input', (event) => {
  filters.query = event.target.value;
  render();
});
el.monthSelect.addEventListener('change', (event) => {
  filters.month = event.target.value;
  render();
});
el.categorySelect.addEventListener('change', (event) => {
  filters.category = event.target.value;
  render();
});
el.purposeSelect.addEventListener('change', (event) => {
  filters.purpose = event.target.value;
  render();
});
el.reviewSelect.addEventListener('change', (event) => {
  filters.review = event.target.value;
  render();
});
el.dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  el.dropZone.classList.add('dragging');
});
el.dropZone.addEventListener('dragleave', () => {
  el.dropZone.classList.remove('dragging');
});
el.dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  el.dropZone.classList.remove('dragging');
  handleFiles([...event.dataTransfer.files].filter((file) => file.name.toLowerCase().endsWith('.csv')));
});
el.ruleList.addEventListener('click', (event) => {
  const id = event.target.dataset.deleteRule;
  if (id) deleteRule(id);
});
el.transactionRows.addEventListener('change', (event) => {
  const id = event.target.dataset.transaction;
  const field = event.target.dataset.field;
  if (id && field) {
    const row = event.target.closest('tr');
    const updatedTransaction = updateTransaction(id, field, event.target.value);
    const chipRow = row?.querySelector('.chip-row');
    if (chipRow && updatedTransaction && transactionMatchesFilters(updatedTransaction)) {
      chipRow.innerHTML = transactionChips(updatedTransaction);
    }
  }
});
el.giftCardMatches.addEventListener('click', (event) => {
  const giftCardId = event.target.dataset.matchGiftCard;
  const transactionId = event.target.dataset.matchTransaction;
  if (giftCardId && transactionId) applyGiftCardMatch(giftCardId, transactionId);
});
el.giftCardList.addEventListener('click', (event) => {
  const statusId = event.target.dataset.giftStatus;
  const status = event.target.dataset.status;
  const deleteId = event.target.dataset.deleteGiftCard;
  if (statusId && status) updateGiftCardStatus(statusId, status);
  if (deleteId) deleteGiftCard(deleteId);
});
el.debtList.addEventListener('click', (event) => {
  const id = event.target.dataset.deleteDebt;
  if (id) deleteDebt(id);
});

el.nav.addEventListener('click', (event) => {
  const target = event.target.dataset.viewTarget;
  if (!target) return;
  document.querySelectorAll('[data-view-target]').forEach((button) => button.classList.toggle('active', button.dataset.viewTarget === target));
  document.querySelectorAll('[data-view]').forEach((view) => {
    const active = view.dataset.view === target;
    view.hidden = !active;
    view.classList.toggle('active', active);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelectorAll('[data-add-record]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    addFinancialRecord(form);
  });
});

document.addEventListener('click', (event) => {
  const id = event.target.dataset.deleteRecord;
  const collection = event.target.dataset.collection;
  if (id && collection) deleteFinancialRecord(collection, id);
});

el.scenarioSelect.addEventListener('change', (event) => {
  activeScenario = event.target.value;
  renderDashboard();
});

el.emergencyTargetMonths.addEventListener('change', (event) => {
  const emergencyTargetMonths = Math.max(1, Number(event.target.value) || 6);
  commit({ ...state, settings: { ...state.settings, emergencyTargetMonths } });
});

el.snapshotBtn.addEventListener('click', saveSnapshot);

initialiseFormOptions();
render();
