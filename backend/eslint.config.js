/**
 * ESLint configuration (flat config, ESLint 9+).
 *
 * There was no linting in either package. The rules below are deliberately
 * narrow: the aim is to catch the classes of mistake that actually bit this
 * codebase, not to relitigate style in a review. Formatting is Prettier's job and
 * is kept out of here entirely.
 *
 * The three that matter most:
 *  - `no-unused-vars` catches the imports left behind by a refactor. This repo has
 *    had several (a `toCsv` import surviving the move to streaming, a `forkJoin`
 *    left after a rewrite) — harmless individually, but they are how you end up
 *    unable to tell what a file actually depends on.
 *  - `eqeqeq` / `no-implicit-coercion` catch the sloppy numeric handling that
 *    produced NaN totals before the validation layer existed.
 *  - `no-constant-binary-expression` and `no-unsafe-optional-chaining` catch
 *    conditions that silently never fire, which is how a guard becomes decorative.
 *
 * `require-atomic-updates` was tried and removed. It flagged ten places and was
 * right about none of them: `req.user = await ...` in auth middleware (every
 * request has its own `req`; there is nothing to race with) and the
 * assign-after-await in the two module-level caches and the scheduler guards. A
 * rule that fires only false positives does not make the code safer — it teaches
 * everyone to stop reading the linter's output, which costs more than it saves.
 * Real read-modify-write races are prevented where they actually occur, in the
 * database: see the aggregation-pipeline update in `invoiceNumberService`.
 */
module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly'
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      // Correctness
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', {
        args: 'after-used',
        // Express error middleware must declare `next` to be recognised as such,
        // even though it does not call it.
        argsIgnorePattern: '^(next|_)',
        caughtErrors: 'none'
      }],
      'no-implicit-coercion': ['error', { boolean: false }],
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'no-promise-executor-return': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',

      // Async hygiene — an unhandled rejection in a controller is a 500 with no
      // stack, which is what the structured logger exists to prevent.
      'no-async-promise-executor': 'error',
      'prefer-promise-reject-errors': 'error',

      // Leftovers
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error'
    }
  },
  {
    // The seed script and the migration CLI legitimately write to stdout: they are
    // command-line tools, and their output is the point.
    files: ['src/seed/**/*.js', 'src/migrations/runner.js'],
    rules: { 'no-console': 'off' }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly'
      }
    },
    rules: { 'no-console': 'off' }
  }
];
