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
  transactions: [],
  importHistory: [],
  debts: [],
  rules: defaultRules,
  categories: ['Groceries', 'Gift Cards', 'Gifts', 'Holiday', 'Kids Sports', 'Transfer', 'Work', 'Insurance', 'Fees', 'Car', 'Tax', 'One-Off', 'Wellness', 'Subscriptions', 'Utilities', 'Health', 'Transport', 'Dining', 'Income', 'Uncategorised'],
  purposes: ['Household', 'General Spending', 'Wellness', 'Eating Out', 'Birthday', 'Charity', 'Lunch Orders', 'Driving Lessons', 'Clothing', 'Fuel', 'Eddies', 'Internet', 'Ventra', 'Apple Care', 'Sherwood', 'Dee Why', 'Berridale', 'Car', 'Tax Bill', 'Amex Fees', 'Charging', 'Mobile Phone', 'Electricity', 'Parking', 'Servicing', 'Gym', 'Gaming', 'AI', 'Canada Alaska', 'USA 2026', 'Queensland 2027', 'Europe 2027', 'Sport', 'Entertainment', 'Home', 'Getting Around', 'Income'],
  people: ['Connor', 'Family', 'Home', 'Personal', 'Martin', 'Adam', 'Jacob', 'Kristy'],
};

let state = loadState();
let filters = { query: '', month: 'all', category: 'all', purpose: 'all' };

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
  categoryBars: document.querySelector('#categoryBars'),
  categories: document.querySelector('#categories'),
  purposes: document.querySelector('#purposes'),
  people: document.querySelector('#people'),
  transactionRows: document.querySelector('#transactionRows'),
  dropZone: document.querySelector('#dropZone'),
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? migrateState({ ...initialState, ...JSON.parse(saved) }) : cloneInitialState();
  } catch {
    return cloneInitialState();
  }
}

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialState));
}

function migrateState(savedState) {
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
  next.debts = (next.debts || []).map((debt) => ({
    id: makeId(),
    name: 'Debt',
    date: new Date().toISOString().slice(0, 10),
    balance: 0,
    ...debt,
    balance: Number(debt.balance) || 0,
  }));
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

function commit(nextState) {
  state = nextState;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
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

function shortMoney(value) {
  const abs = Math.abs(value || 0);
  if (abs >= 1000) return `$${Math.round(abs / 100) / 10}k`;
  return money(abs).replace('.00', '');
}

function monthKey(date) {
  return date?.slice(0, 7) || 'No date';
}

function isExcludedFromCalculations(transaction) {
  return excludedCalculationCategories.includes(transaction.category);
}

function addDebt() {
  const name = el.debtName.value.trim();
  const date = el.debtDate.value || new Date().toISOString().slice(0, 10);
  const balance = Number.parseFloat(el.debtBalance.value);
  if (!name || Number.isNaN(balance)) {
    showNotice('Add a debt name and balance first.');
    return;
  }

  commit({
    ...state,
    debts: [{ id: makeId(), name, date, balance }, ...state.debts],
  });
  el.debtName.value = '';
  el.debtDate.value = new Date().toISOString().slice(0, 10);
  el.debtBalance.value = '';
}

function deleteDebt(id) {
  commit({ ...state, debts: state.debts.filter((debt) => debt.id !== id) });
}

function filteredTransactions() {
  return state.transactions
    .filter((transaction) => filters.month === 'all' || monthKey(transaction.date) === filters.month)
    .filter((transaction) => filters.category === 'all' || transaction.category === filters.category)
    .filter((transaction) => filters.purpose === 'all' || transaction.purpose === filters.purpose)
    .filter((transaction) => {
      const haystack = `${transaction.description} ${transaction.category} ${transaction.purpose} ${transaction.person} ${transaction.account}`.toLowerCase();
      return haystack.includes(filters.query.toLowerCase());
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function updateTransaction(id, field, value) {
  const next = {
    ...state,
    transactions: state.transactions.map((transaction) => (transaction.id === id ? { ...transaction, [field]: value } : transaction)),
    categories: field === 'category' && value && !state.categories.includes(value) ? [...state.categories, value] : state.categories,
    purposes: field === 'purpose' && value && !state.purposes.includes(value) ? [...state.purposes, value] : state.purposes,
    people: field === 'person' && value && !state.people.includes(value) ? [...state.people, value] : state.people,
  };
  commit(next);
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
      commit({ ...initialState, ...JSON.parse(reader.result) });
      showNotice('Backup restored.');
    } catch {
      showNotice('That backup file could not be read.');
    }
  };
  reader.readAsText(file);
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
    <div class="chart-row">
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

function render() {
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
  const reviewCount = state.transactions.filter((transaction) => transaction.category === 'Uncategorised' || !transaction.purpose).length;
  const latestMonth = [...new Set(state.transactions.map((transaction) => monthKey(transaction.date)).filter((item) => item !== 'No date'))].sort().at(-1);
  const topCategory = Object.entries(byCategory)
    .filter(([, total]) => total < 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];

  el.incomeMetric.textContent = money(income);
  el.spendingMetric.textContent = money(expenses);
  el.netMetric.textContent = money(net);
  el.netMetric.className = net < 0 ? 'negative' : 'positive';
  el.countMetric.textContent = filtered.length;
  el.reviewMetric.textContent = reviewCount;
  el.heroMonth.textContent = latestMonth ? `Mapping ${latestMonth}` : 'Ready for your next import';
  el.heroInsight.textContent = topCategory
    ? `${topCategory[0]} is the biggest spend in this view at ${money(Math.abs(topCategory[1]))}.`
    : 'Upload a statement to build a clearer map of spending, purposes, and people.';

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
  renderDebts();
  renderImportHistory();

  el.transactionRows.innerHTML = filtered.length ? filtered.map((transaction) => `
    <tr>
      <td>${escapeHtml(transaction.date)}</td>
      <td>
        <strong>${escapeHtml(transaction.description)}</strong>
        <small>${escapeHtml(transaction.sourceFile)}</small>
        <div class="chip-row">
          <span class="${chipClass(transaction.category)}">${escapeHtml(transaction.category || 'Uncategorised')}</span>
          ${transaction.purpose ? `<span class="${chipClass(transaction.purpose)}">${escapeHtml(transaction.purpose)}</span>` : ''}
          ${transaction.person ? `<span class="${chipClass(transaction.person)}">${escapeHtml(transaction.person)}</span>` : ''}
          ${isExcludedFromCalculations(transaction) ? '<span class="chip chip-excluded">Excluded</span>' : ''}
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
  if (id && field) updateTransaction(id, field, event.target.value);
});
el.debtList.addEventListener('click', (event) => {
  const id = event.target.dataset.deleteDebt;
  if (id) deleteDebt(id);
});

render();
