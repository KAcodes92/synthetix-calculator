# Synthetix — Savings Estimator (Capex/Opex Calculator)

A simple, plain-language savings estimator: 6 questions, an industry toggle
(Banking & Financial Services / Insurance / Healthcare), a lead-gated
results reveal via HubSpot, and a fully visible, editable assumptions
panel. No build step — plain HTML/CSS/JS, same pattern as the Governance
Readiness Assessment.

## Latest revision — form-state copy fix

- **Removed the "Almost there / Quick details, then your results appear
  right below" text from the form card.** In real testing, HubSpot's own
  embed renders its own thank-you message ("Here are your results!")
  *inside* the iframe on submission — but our surrounding copy had no way
  to detect that and kept showing, so the two messages stacked awkwardly.
  Removing our redundant copy avoids the conflict entirely; the form and
  its own confirmation now speak for themselves.
- **Simplified the manual unlock link** from "Already submitted? Show my
  results →" to a plain **"Show my results →" button**, and promoted it
  from a small text link to a full secondary button — since real-world
  testing suggests the automatic postMessage detection isn't reliably
  firing for this specific HubSpot embed, this manual button is likely the
  *primary* way people will proceed, not just a rare fallback, so it now
  reads and looks like a normal next step rather than an edge-case escape
  hatch.
- If you want to debug the automatic detection further, add a temporary
  `console.log(event.data)` inside the `window.addEventListener("message", ...)`
  handler in `script.js`, submit the real form in a live deploy, and check
  the browser console for what HubSpot actually sends — the event
  name/shape can vary by portal configuration.

## Latest revision — enterprise UI pass + CTA removal

- **"Reply Let's meet" button removed.** The HubSpot form submission is now
  the only conversion point — results no longer end with a second CTA.
- **Two-panel dashboard layout.** Inputs live in a sticky left panel;
  results/gate live in a sticky right panel (on desktop, ≥900px). Stacks to
  a single column on mobile.
- **Sliding segmented control** for the industry toggle — a solid indicator
  animates between the three options rather than instantly swapping
  background color.
- **Animated number reveals.** Result values count up/down smoothly when
  they change, instead of jumping instantly — same easing curve as the
  Governance Assessment's gauge.
- **Refined data visualization.** The comparison chart now shows the dollar
  value directly inside each bar, includes subtle gridlines, and adds a
  plain-English delta line ("That's roughly $X lower with the step-by-step
  plan") pulled directly from the two figures already shown — not a new
  invented metric.
- **Elevated visual system throughout:** soft card shadows, generous
  spacing, a gradient top-accent on the results card, hover states on
  result cards, a sticky translucent header with backdrop blur — aiming at
  the same visual bar as Stripe/Vercel-style enterprise SaaS tools rather
  than a plain web form.

## What changed in the previous revision (for reference)

- **Industry now actually changes the numbers.** Each industry carries its
  own starting assumptions (overrun %, maintenance-reduction %, cost per
  engineer, cost per audit hour) — switching the toggle resets these to
  that industry's defaults, so identical situational inputs produce
  different results across industries.
- **Copy simplified throughout** — plain, everyday language instead of
  finance/technical jargon.
- **Results are gated behind a HubSpot form** (see "How the HubSpot gate
  works" below).

## Files

```
index.html      Structure — intro, industry toggle, inputs, results, assumptions, CTAs
styles.css      Styling — same brand tokens as the Assessment tool
script.js       Bucket data, formulas, industry-aware copy, live recalculation
assets/logo.png Your Synthetix logo
vercel.json     Static-hosting config (clean URLs, no build command needed)
```

## Deploy via GitHub → Vercel

1. Push this folder as a new repo (or a subfolder of an existing one):
   ```
   git init
   git add .
   git commit -m "Capex/Opex Calculator"
   git branch -M main
   git remote add origin https://github.com/<your-org>/<repo-name>.git
   git push -u origin main
   ```
2. In Vercel: **New Project → Import Git Repository** → select the repo.
3. Framework preset: **Other**. Build command: blank. Output directory:
   root (`.`).
4. Deploy. No environment variables or API keys required — everything runs
   client-side.

## Before going live — replace these placeholders

| What | Where |
|---|---|
| Contact inbox for "Reply Let's meet" | `script.js`, `CONTACT_EMAIL` at the top |
| Industry-specific default assumptions | `script.js`, `INDUSTRIES` object, `defaults` per industry — see note below |

## How the HubSpot gate works

1. Visitor fills in the six situational questions (industry toggle,
   budget, approach, systems, engineers, evidence time, horizon).
2. Clicking **"See my results"** hides that prompt and reveals the HubSpot
   form (the exact embed code you provided — script tag in `<head>`, the
   `hs-form-frame` div in the body).
3. On submission, results are revealed. Detection works via a
   `window.addEventListener("message", ...)` listener checking for
   HubSpot's `hsFormCallback` / `onFormSubmitted` postMessage event, which
   both the classic and newer HubSpot embed scripts fire on submit.
4. **Fallback included:** a small "Already submitted? Show my results →"
   link sits below the form. If HubSpot's postMessage event doesn't fire
   in your specific portal/embed configuration (this can vary by HubSpot
   account settings), visitors aren't stuck — they can unlock manually.
   Test the automatic detection after deploying; if it works reliably,
   you can remove the fallback link, or just leave it as a safety net.
5. Once unlocked, all six inputs and the assumptions panel recalculate
   live, same as before — the gate only affects the *first* reveal.

## How the math works (and why it's a range, not a single number)

There's no validated benchmark data yet for cost/effort reduction — so
every default percentage in the Assumptions panel is a **placeholder for
your team or finance to validate**, not a sourced figure. That's why:

- Every output is a **range** (low–high), never a single confident number.
- Every assumption is **visible and editable** in the UI itself — nothing
  is buried in a footnote.
- A disclaimer stays visible near the results at all times.

This is deliberate, not a placeholder oversight: a tool that shows its work
is itself a small proof of the "governed, not just fast" positioning this
calculator sits inside.

**Before launch:** have finance/delivery review the four editable
assumptions in `index.html` (`a-overrunLow`, `a-overrunHigh`, `a-maintLow`,
`a-maintHigh`, `a-engCost`, `a-auditCost` — search for those IDs) and the
two fixed reference tables in `script.js` (`HOURS_SAVED_PER_CHANGE`,
`CHANGES_PER_YEAR`), and update the default `value` attributes / object
values to whatever your team is comfortable standing behind publicly.

## Content model

- **Industry copy and defaults** (regulator phrase, system label, and the
  six default assumption values) live in the `INDUSTRIES` object at the
  top of `script.js` — matches the same structure used in the Assessment
  tool's `script.js`, so copy changes don't require touching layout code.
  Switching the industry toggle resets the assumption fields to that
  industry's defaults, which is what makes the results actually differ by
  industry rather than just the surrounding text.
- **Bucket midpoints** (the representative dollar/headcount figure behind
  each dropdown range) live in `BUDGET_MIDPOINT` and `ENGINEER_MIDPOINT` —
  adjust these if your team wants different anchor points.
- **Formulas** live entirely in `recalculate()` in `script.js`, following
  the pseudocode in the original spec doc line for line.

## Design notes

Same instrument-panel visual language as the Assessment: Space Grotesk +
Inter + IBM Plex Mono, the same CSS variable tokens, the same segmented
control affordance for industry selection. The comparison bar chart
(Big-bang path vs. Governed path) uses the brand's primary gradient for the
governed path and a neutral graphite tone for the big-bang exposure bar —
deliberately not colored red/danger, since a big-bang approach isn't wrong,
just riskier.

Respects `prefers-reduced-motion` and keyboard focus throughout.
