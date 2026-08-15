# Local Budget App

A private, browser-based budgeting app for importing monthly bank and credit-card CSV statements.

## What it does now

- Upload CSV statements from your bank or credit card.
- Auto-detect common date, description, amount, debit, credit, and account columns.
- Auto-categorise transactions using editable keyword rules.
- Support two tags per transaction:
  - Category, such as `Groceries`, `Kids Sports`, or `Utilities`.
  - Person/project, such as `Connor`, `Family`, or `Home`.
- Deduplicate imported rows using transaction details.
- Store data locally in your browser with `localStorage`.
- Export/import an app backup JSON file.

## Privacy

Banking files are intentionally ignored by git:

- `data/statements/`
- `data/exports/`
- `*.csv`
- `*.ofx`
- `*.qif`

Avoid committing real bank exports. The app reads CSV files directly in the browser and does not upload them anywhere.

## Run Locally

Open `index.html` in your browser, or run a tiny local server from this folder:

```bash
python -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/
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
