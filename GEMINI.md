# PeopleHub Project Rules & Pre-Push Quality Gate

## Pre-Push Verification Requirement
Whenever preparing to push code to Git or trigger a deployment to Render:
1. Always prompt the user for confirmation to run the automated testing engine (`pre-push-test-engine` skill).
2. Execute `npm run test:engine` (or `node scripts/test-engine.js`) upon confirmation.
3. Review the 17-point verification scorecard across builds, live API authentication, business modules, and React client runtime integrity.
4. Only proceed with `git push origin main` if the overall verdict is `GO` (100% pass rate, 0 failures).
