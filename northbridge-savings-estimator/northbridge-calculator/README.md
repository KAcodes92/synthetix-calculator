# Savings Estimator — Northbridge (Portfolio Demo)

An enterprise-grade ROI calculator for a fictitious governed-AI-delivery
platform. Six-question configurator, industry- and engagement-aware math,
live recalculation, and a lead-gated results reveal — all client-side, no
build step, no framework.

**Northbridge is a fictitious company.** This project is a portfolio and
educational demonstration only. All figures are illustrative placeholders.

Built by **Kartikeya Awasthi** · © 2026

## What's new in this pass (portfolio rebrand + enterprise upgrade)

- **Rebranded end-to-end** — Synthetix → Northbridge, with a new inline-SVG
  bridge-arc mark (nav + footer) instead of an external logo asset, so there's
  nothing to swap in before deploy.
- **HubSpot removed.** The gated results now sit behind a small first-party
  form (first/last name, work email, company) instead of an embedded HubSpot
  form. On submit it relays to `awasthikartikeya92@gmail.com` via FormSubmit —
  see "Form submissions" below for the one-time activation step. If the relay
  fails, it falls back to opening the visitor's mail client so nothing is
  silently lost. A "Skip" link still lets anyone through without submitting.
- **Progress steps** — a Configure → Verify → Results indicator above the
  dashboard so the flow reads as a guided process, not a bare form.
- **Trust strip** under the hero — three short reassurances (runs in your
  browser, editable assumptions, no-commitment estimate) that a real
  enterprise tool would lead with.
- **Confidence tag** on the results card ("Directional estimate") with a
  tooltip pointing at the methodology panel — sets expectations before anyone
  reads a number.
- **Export actions** — "Email me this estimate" opens the visitor's own mail
  client pre-filled with their results (self-service, not a lead capture —
  no network call). "Save as PDF" builds a clean print-only summary and calls
  `window.print()`, with a dedicated print stylesheet that hides the nav,
  form, and chrome.
- **Footer rebuilt** — brand mark, `© 2026 · Designed & developed by
  Kartikeya Awasthi`, a contact link, and a fictitious-company / portfolio
  disclaimer.
- Added `input[type="text"]` and `.two-col` styles the new lead form needed
  (the original only styled `<select>`).

## Form submissions

Submissions relay to `awasthikartikeya92@gmail.com` via
[FormSubmit](https://formsubmit.co) — a free, no-account AJAX relay for
static sites, no server or API key involved.

**One-time activation (required):**

1. Deploy the site (or open `index.html` over `http://`, not `file://`)
2. Submit the lead form once with any details
3. FormSubmit emails `awasthikartikeya92@gmail.com` a confirmation link —
   click it
4. Every submission after that arrives silently

**Optional hardening.** That confirmation email includes a hashed endpoint
URL. Swap it in to keep the raw address out of the page source:

```js
// script.js — near the top of the gate-flow section
const LEAD_ENDPOINT = "https://formsubmit.co/ajax/YOUR_HASHED_TOKEN";
```

To use a different relay (Formspree, Web3Forms, Getform), replace
`LEAD_ENDPOINT` — all three accept the same JSON POST shape.

## Files

```
index.html      Structure — header, intro, steps, dashboard grid, lead form, results, footer
styles.css      Styling — brand tokens, cards, form, print stylesheet
script.js       Bucket data, formulas, industry/engagement-aware copy, lead relay, exports
vercel.json     Static-hosting config (clean URLs, no build command needed)
```

## Deploy via GitHub → Vercel

1. Push this folder as a new repo (or a subfolder of an existing one):
   ```
   git init
   git add .
   git commit -m "Northbridge savings estimator"
   git branch -M main
   git remote add origin https://github.com/<your-org>/<repo-name>.git
   git push -u origin main
   ```
2. In Vercel: **New Project → Import Git Repository** → select the repo.
3. Framework preset: **Other**. Build command: blank. Output directory:
   root (`.`).
4. Deploy. No environment variables or API keys required — everything runs
   client-side, and the lead relay needs only the one-time activation above.

## How the math works (and why it's a range, not a single number)

There's no validated benchmark data behind this — every default percentage
in the Assumptions panel is a **placeholder**, not a sourced figure. That's
why every output is a range, every assumption is visible and editable in the
UI itself, and a disclaimer stays visible near the results at all times. A
tool that shows its work is itself a small proof of the "governed, not just
fast" positioning this calculator sits inside.

Formulas live entirely in `recalculate()` in `script.js`. Industry copy and
defaults live in the `INDUSTRIES` object; engagement-type copy lives in
`ENGAGEMENT_TYPES`; bucket midpoints live in `BUDGET_MIDPOINT` and
`ENGINEER_MIDPOINT`.

## Design notes

Space Grotesk + Inter + IBM Plex Mono, the same CSS variable token system as
before, sliding segmented control for industry, animated number tweens for
result values (with a generation-token guard against stale in-flight
animations), and a dedicated print stylesheet for the PDF export path.
Respects `prefers-reduced-motion` and keyboard focus throughout.
