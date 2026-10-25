---
name: pre-push-test-engine
description: >-
  Use this skill whenever preparing to push changes to Git or deploy to Render/production, or when the user asks to run automated sanity tests across the PeopleHub monorepo. It interactively prompts the user for confirmation, executes the 17-point automated testing engine, presents the verification scorecard, and guards against broken releases.
---

# Pre-Push Automated Testing Engine & Quality Guard

This skill provides an automated, end-to-end testing gate for the PeopleHub monorepo. It ensures that no broken code, client-side React exceptions (such as Minified Error #310), or unverified API endpoints ever get pushed to Git or deployed to Render.

## When to Use

- Whenever code changes are ready to be pushed to Git or deployed to Render.
- Whenever the user asks to verify, test, or sanity-check the application before deployment.
- Whenever a major refactor or layout change has been made.

## Verification Procedure

### Step 1: Prompt for User Confirmation
Before pushing to Git or deploying, prompt the user for confirmation using the interactive `ask_question` tool:
- **Question**: "Would you like to run the automated pre-push testing engine before pushing to Git?"
- **Options**:
  1. "(Recommended) Yes, run full automated test engine now"
  2. "Skip testing and proceed directly with push"

### Step 2: Execute the Test Engine
Upon confirmation, execute the automated testing engine:
```powershell
npm run test:engine
```
*(Or directly `node scripts/test-engine.js`)*

### Step 3: Evaluate the 17-Point Scorecard
The engine evaluates 5 distinct suites:

1. **Suite 1: Compilation & Type Integrity**
   - Shared Types package compilation (`@people-hub/shared-types`)
   - Next.js production build (`next build` across all 15 static routes)
   - NestJS API TypeScript compilation (`apps/api/tsconfig.json`)

2. **Suite 2: Authentication & Access Control**
   - Super Admin login (`admin@peoplehub.com`) & token issuance
   - HR Manager login (`priya@garments.com`) & branch scope validation
   - Intruder security check (verifies HTTP 401 rejection on invalid credentials)

3. **Suite 3: Business Modules & Database Integrity**
   - Multi-tenant organization resolution
   - Masters catalog bundle (departments, designations, branches, shifts)
   - Workforce employee directory
   - Piece-rate operations catalog & floor work logs
   - Payroll salary structures & historical payslips
   - Accounts financial cashflow summary & journal transactions
   - Audit trail logging & security events

4. **Suite 4: React Runtime & Layout Integrity**
   - React Minified Error #310 (Hook Order Violation) static guard
   - Copyright footer placement (main body bottom, none in sidebar)
   - Piece-rate skills summary badge, details modal, and statutory Form 25 print ledger

5. **Suite 5: Version Control & Deployment Readiness**
   - Git working tree cleanliness and branch synchronization (`main`)

### Step 4: Decision & Release Gate
- **If Result is GO (0 failures, 100% pass rate)**:
  Output the scorecard summary and guide the user to push to GitHub / Render:
  ```powershell
  git push origin main
  ```
- **If Result is NO-GO (any test fails)**:
  Halt the release immediately. Highlight the failing test and error details, diagnose and fix the root cause, and re-run the engine until all 17 checks pass.
