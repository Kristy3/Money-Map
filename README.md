# Money Map

A private, browser-based financial dashboard for budgeting, cash-flow planning, wealth tracking and scenario modelling.

## Core features

- Upload CSV statements from your bank or credit card.
- Auto-detect common date, description, amount, debit, credit, and account columns.
- Auto-categorise transactions using editable keyword rules.
- Support two tags per transaction:
  - Category, such as `Groceries`, `Kids Sports`, or `Utilities`.
  - Person/project, such as `Connor`, `Family`, or `Home`.
- Deduplicate imported rows using transaction details.
- Save data automatically to a private Money Map folder inside the local OneDrive sync folder.
- Keep browser `localStorage` as an immediate fallback if OneDrive is temporarily unavailable.
- Export/import an app backup JSON file.
- Track income, regular expenses and annual or irregular costs using weekly, fortnightly, monthly or annual frequencies.
- Track cash accounts, offsets, properties, investments, other assets, superannuation, debts and credit cards.
- Calculate net worth, liquidity, property equity, monthly buffer, savings rate, debt-to-income and emergency runway.
- Maintain savings goals, financial goals and an insurance register.
- Build a rolling 12-month cash-flow forecast.
- Compare Current and Future / Solo scenarios without duplicating records.
- Store net-worth snapshots for trend tracking.

## Architecture

Money Map is a local application with a small localhost-only Node.js server. It does not use an external API, hosted application server or third-party database.

- `index.html` contains the five dashboard views.
- `src/app.js` handles local state, migration, CSV import and interface rendering.
- `src/finance.js` contains the central financial calculation rules.
- `server.js` serves the app only on `127.0.0.1` and saves the data file into OneDrive.
- The primary data file is `OneDrive\Money Map\money-map-data.json`.
- Up to 30 rotating recovery copies are kept in `OneDrive\Money Map\Backups`.
- Browser data remains under `local-budget-app:v1` in `localStorage` as a fallback and for automatic migration.
- `schemaVersion` safely migrates older backups and browser data to the current model.
- `tests/finance.test.js` validates the important calculation rules.
- `tests/storage.test.js` validates atomic saving, conflict protection and backup retention.

## Calculation rules

- Credit limits never count as liabilities; only outstanding balances do.
- Superannuation counts toward net worth but never liquid or emergency cash.
- Property values respect ownership percentage.
- Linked offset accounts count once as cash and reduce effective mortgage debt.
- A mortgage linked by property name is not counted again as a separate liability.
- Work reimbursements and transfers are excluded from transaction income and spending.
- Irregular costs use either a monthly provision or their due-month cost, never both.
- Savings-goal allocations do not create extra assets and cannot exceed their linked account balance.
- Future / Solo values use scenario scope or percentage allocation on the original record.

## Privacy

Banking files are intentionally ignored by git:

- `data/statements/`
- `data/exports/`
- `*.csv`
- `*.ofx`
- `*.qif`

Avoid committing real bank exports. The app reads CSV files directly in the browser and does not copy the original files into OneDrive. The OneDrive database does contain the imported transaction records, categories, plans and other information needed by Money Map.

The server binds only to `127.0.0.1`, so it is not exposed to other computers on the network. Secure the Microsoft account with multi-factor authentication because the OneDrive JSON database is not separately encrypted.

## Run Locally

Double-click:

```text
start-money-map.cmd
```

Keep the command window open while using Money Map. It opens:

```text
http://127.0.0.1:5173/
```

You can also start it from PowerShell while inside this folder:

```powershell
node server.js
```

On the first run, existing data from the same Edge address is migrated automatically into OneDrive. Later changes save automatically. The status beside the Backup button confirms whether the data is saved to OneDrive or only in the browser.

To use Money Map on another Windows computer, sync OneDrive, clone or pull this repository, and use the same launcher. Avoid editing on two computers at exactly the same time. If both copies change, Money Map asks which one to keep rather than silently overwriting data.

## Tests

With Node.js installed:

```bash
npm test
npm run check
```

## GitHub Setup

When you are ready to sync:

```bash
git init
git add .
git commit -m "Initial local budget app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Confirm with `git status` before pushing. Your statement CSV files should remain untracked because of `.gitignore`.
