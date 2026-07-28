// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * ESLint configuration for the Angular app.
 *
 * There was no linting here at all. As on the backend, the selection is
 * deliberately narrow — TypeScript's compiler already catches most of what a
 * linter would, and `strictTemplates` is on, so the value left is in the things
 * the compiler is happy with but a reviewer would not be:
 *
 *  - Unused imports and variables. Every list page in this app was recently
 *    rewritten from client-side filtering to server-side paging, which stranded
 *    imports (`forkJoin`, `computed`) and dead helper methods behind.
 *  - `@typescript-eslint/no-floating-promises` is *not* enabled: this codebase
 *    uses `.subscribe()` throughout rather than promises, so it would find
 *    nothing while requiring full type-aware linting (much slower in CI).
 *  - The Angular template rules catch the accessibility and control-flow mistakes
 *    that only show up in the browser.
 *
 * `no-explicit-any` is a warning, not an error. There are a handful of deliberate
 * `any`s at the API boundary (a settings blob whose shape the server owns), and
 * failing the build over them would push people towards silencing the rule
 * file-wide instead.
 */
module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**']
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // The app is standalone-components throughout, with `app-` selectors.
      '@angular-eslint/component-selector': ['error', {
        type: 'element',
        prefix: 'app',
        style: 'kebab-case'
      }],
      '@angular-eslint/directive-selector': ['error', {
        type: 'attribute',
        prefix: 'app',
        style: 'camelCase'
      }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error'
    }
  },
  {
    // Inline templates are extracted by the processor above and linted here.
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility
    ],
    rules: {
      // A contrast/label audit across all 15 themes is its own piece of work
      // (Part 4.2 of the improvement plan); these stay as warnings so the build
      // is not blocked by findings that need design decisions to resolve.
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/label-has-associated-control': 'warn'
    }
  }
);
