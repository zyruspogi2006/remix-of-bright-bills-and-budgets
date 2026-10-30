# Remix of Bright Bills And Budgets

Build a polished, complete personal budgeting web app called "Pennywise" for a student / everyday user in the Philippines. Use Lovable's default TypeScript + Tailwind + shadcn stack. Modern, premium, clean dashboard design, responsive desktop and mobile, accessible contrast, rounded cards, subtle shadows, warm off-white background, deep navy text, emerald/teal accent, tasteful icons and micro-interactions. Currency default PHP (₱), locale en-PH. IMPORTANT: do not use graphs or charts. Use progress bars, category rows, and clear numbers instead.

Implement working features, not a static mockup:
- Dashboard overview: current-month income, expenses, remaining balance, savings progress, budget-used progress, recent transactions, upcoming bills, quick actions.
- Transactions CRUD: add/edit/delete income and expenses with amount, date, category, account/payment method, note, recurring toggle; searchable and filterable by type/category/date; validate amounts and required fields.
- Budgets: set monthly overall and per-category budgets, show spent vs limit with progress bars and warnings when nearing/over budget.
- Savings goals: create/edit/delete goals with target, current amount, target date, add contributions, progress bars and estimated remaining.
- Bills / recurring expenses: create/edit/delete bills, due date, amount, category, mark paid/unpaid, upcoming and overdue indicators.
- Categories and settings: manage income/expense categories, default currency PHP with option to choose other currencies, monthly budget settings, theme light/dark, and clear demo data/reset controls with confirmation.
- Reports page without charts: date-range summaries, totals by category using ranked rows/progress bars, income vs expense comparison using text and progress indicators, monthly history list, export transactions to CSV, and full backup export/import as JSON with validation and confirmation.
- Navigation/sidebar and mobile bottom nav or drawer; useful empty states, toast notifications, dialog confirmations; keyboard accessible forms.
- Include sensible sample/demo data on first load, clearly distinguishable and removable. Make all calculations derived from transactions and budgets, consistent across pages. Month selector should work.
- Persistence: use browser localStorage robustly for all app data, with versioned storage key, safe parse/fallback/migration, and automatic save on changes. Add visible "Saved on this device" status and privacy note explaining data stays in this browser/device and doesn't sync across devices. No login or backend required; this should work immediately without connecting Supabase.
- Use reusable components, clean code, proper TypeScript types, and ensure all controls actually work. Add sensible responsive layouts and polished empty/loading/error states. Include README/help in settings explaining backup/import and local storage limitations.
Create the full functional app and verify interactions, not just the design.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca195f6f-6975-47cb-946c-be5bf58d4a29).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
