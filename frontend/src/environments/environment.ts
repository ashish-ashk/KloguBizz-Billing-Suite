/**
 * Default environment — the deployed backend.
 *
 * Do **not** edit this to develop locally. `ng serve` and
 * `ng build --configuration development` replace this file with
 * `environment.development.ts` (see `fileReplacements` in `angular.json`), which
 * points at `http://localhost:5000/api/v1`.
 *
 * This file previously carried a commented-out localhost line that had to be
 * swapped in by hand at the start of every local session and swapped back before
 * every commit — a footgun in both directions. The file replacement removes the
 * need to touch it at all.
 */
export const environment = {
  production: false,
  apiUrl: 'https://klogubizz-billing-suite.onrender.com/api/v1'
};
