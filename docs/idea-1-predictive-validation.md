just bootstrap
  bun run dev
  bun run routes
  bun run categories
  bun run check

  What that verifies:

  - just bootstrap: installs Bun deps and prek
  - bun run dev: the mini React app starts
  - bun run routes: the shared router tree is readable
    by the CLI
  - bun run categories: the mocked Sentry bug
    categories load correctly
  - bun run check: format, lint, tests, and production
    build all pass

  Force The Idea To Prove Itself
  Create one intentionally risky file so the predictive
  check has something to catch:

  cat > src/app/risky-demo.jsx <<'EOF'
  export function RiskyDemo() {
    fetch("/api/demo");
    return null;
  }
  EOF

  Now run the predictive CLI directly:

  bun run src/cli.js check --catalog data/
  mock_sentry_bug_categories.json --no-staged src/app/
  risky-demo.jsx

  Expected result:

  - it should fail
  - it should report frontend-fetch-without-status-
    check

  Then simulate the real pre-commit hook:

  prek validate-config .pre-commit-config.yaml
  prek run --files src/app/risky-demo.jsx

  Expected result:

  - format/lint/test hooks run
  - predictive bug-fix guard fails on that file

  If You Want The Full End-To-End Demo

  just hooks-install
  git add src/app/risky-demo.jsx
  git commit -m "smoke test predictive hook"

  That should block the commit for the same reason.

  One practical note: just hooks-run can skip files in
  a brand-new repo with nothing tracked yet, so for
  demos prek run --files ... is the most reliable
  command.

  Create a fresh Bun-first repository for a hackathon
  prototype called `predictive-bug-fix`.

  Goal:
  Build a developer tool inspired by Sentry + Codex
  that shifts recurring production failures left into
  pre-commit. The repo should include:
  1. a Bun CLI,
  2. a mini React app,
  3. a `prek`-compatible pre-commit hook,
  4. a repo-local Codex skill.

  Core idea:
  - We will eventually ingest bug categories from
  Sentry.
  - For now, mock that feed as a local JSON file.
  - The hook should inspect changed files and fail on
  risky patterns that match the mocked Sentry
  categories.
  - The skill should help Codex inspect the same route
  tree and bug catalog to suggest fixes before commit.

  Requirements:
  - Do not use Python unless absolutely necessary.
  Prefer Bun/JavaScript only.
  - Use Bun for install, scripts, CLI, tests, and app
  runtime.
  - Use a small React app with React Router.
  - Put the route structure in a shared plain JS route
  manifest so both the app and CLI can traverse it.
  - Add a repo-local skill at `skills/predictive-bug-
  fix/SKILL.md`.

  Deliverables:
  - `package.json`
  - `Justfile`
  - `.pre-commit-config.yaml` for `prek`
  - `README.md`
  - `data/mock_sentry_bug_categories.json`
  - `src/cli.js`
  - `src/router/tree.js`
  - `src/app/*` for the mini React app
  - `tests/*`
  - `skills/predictive-bug-fix/SKILL.md`

  CLI behavior:
  - `check --catalog <path> [--advisory] [--no-staged]
  [files...]`
    - load the mocked bug catalog
    - inspect staged added lines when possible
    - fall back to provided files or working tree files
    - match risky regex patterns by file glob
    - print actionable findings and fail with exit code
  1 when findings exist
  - `categories`
    - print the mocked bug categories
  - `routes`
    - print the flattened router tree

  Mock catalog behavior:
  - Include a few frontend-focused categories such as:
    - fetch without status handling
    - route params used without fallback
    - timers introduced without cleanup
  - Each category should have:
    - `id`
    - `title`
    - `severity`
    - `description`
    - `why_it_matters`
    - `file_globs`
    - `match.added_line_regexes`
    - `suggested_fixes`
    - `suggested_tests`

  React app behavior:
  - Show a small dashboard with:
    - overview
    - issue inbox
    - route map
    - settings
  - The route map must be driven by the shared route
  manifest.
  - The UI should make it obvious that the app, CLI,
  and skill all use the same route tree.

  Pre-commit behavior:
  - Add local hooks for:
    - formatting
    - linting
    - predictive bug-fix guard
    - tests
    - merge-conflict check
  - Use Bun-based tooling.
  - Prefer Biome for format/lint.
  - Ensure the predictive hook runs against JS/JSX
  source files.

  Skill behavior:
  - The skill should instruct Codex to:
    - open the mocked bug catalog first
    - inspect the shared route tree
    - focus on flagged files and route branches
    - apply the smallest safe fix
    - add focused tests
    - rerun the predictive CLI and tests

  Testing:
  - Add Bun tests for:
    - route tree flattening
    - analyzer matching risky patterns
    - ignoring non-matching files

  Verification:
  After implementation, run and report the results of:
  - `bun install`
  - `bun run routes`
  - `bun run categories`
  - `bun run check`
  - `prek validate-config .pre-commit-config.yaml`
  - `prek run --files <representative files>`

  Also add one short README section explaining the
  pitch:
  “Sentry tells us what breaks in production; Codex
  helps prevent the same bug classes before commit.”

  Keep the implementation minimal but real. Prioritize
  a working prototype over polish.