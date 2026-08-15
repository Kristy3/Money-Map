const STORAGE_KEY = 'local-budget-app:v1';

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
  rules: defaultRules,
  categories: ['Groceries', 'Gift Cards', 'Holiday', 'Kids Sports', 'Subscriptions', 'Utilities', 'Health', 'Transport', 'Dining', 'Income', 'Uncategorised'],
  purposes: ['Household', 'General Spending', 'Wellness', 'Eating Out', 'Canada Alaska', 'USA 2026', 'Queensland 2027', 'Europe 2027', 'Sport', 'Entertainment', 'Home', 'Getting Around', 'Income'],
  people: ['Connor', 'Family', 'Home', 'Personal'],
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

function monthKey(date) {
  return date?.slice(0, 7) || 'No date';
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
      commit({ ...state, transactions: [...unique, ...state.transactions] });
      showNotice(`Imported ${unique.length} new transactions from ${file.name}. Skipped ${imported.length - unique.length} duplicates.`);
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
  select.innerHTML = [`<option value="all">${allLabel}</option>`, ...options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)].join('');
  select.value = options.includes(current) ? current : 'all';
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

function render() {
  const filtered = filteredTransactions();
  const expenses = filtered.filter((transaction) => transaction.amount < 0).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const income = filtered.filter((transaction) => transaction.amount > 0).reduce((sum, transaction) => sum + transaction.amount, 0);
  const net = income - expenses;
  const byCategory = filtered.reduce((groups, transaction) => {
    const key = transaction.category || 'Uncategorised';
    groups[key] = (groups[key] || 0) + transaction.amount;
    return groups;
  }, {});
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

  el.categories.innerHTML = state.categories.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  el.purposes.innerHTML = state.purposes.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  el.people.innerHTML = state.people.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');

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
        </div>
      </td>
      <td class="${transaction.amount < 0 ? 'negative' : 'positive'}">${money(transaction.amount)}</td>
      <td><input value="${escapeHtml(transaction.category)}" list="categories" data-transaction="${transaction.id}" data-field="category" /></td>
      <td><input value="${escapeHtml(transaction.purpose || '')}" list="purposes" data-transaction="${transaction.id}" data-field="purpose" placeholder="Optional" /></td>
      <td><input value="${escapeHtml(transaction.person)}" list="people" data-transaction="${transaction.id}" data-field="person" placeholder="Optional" /></td>
      <td>${escapeHtml(transaction.account)}</td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty">Upload a CSV statement to start building your budget.</td></tr>';
}

el.csvInput.addEventListener('change', (event) => handleFiles(event.target.files));
el.backupBtn.addEventListener('click', exportBackup);
el.backupInput.addEventListener('change', (event) => importBackup(event.target.files[0]));
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

render();
