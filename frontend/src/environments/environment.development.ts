/**
 * Local development environment.
 *
 * `environment.ts` used to be the file you edited to develop locally: it shipped
 * pointing at the deployed Render backend with the `localhost` line commented
 * out, so every local session began by flipping a comment and — the actual
 * problem — was supposed to end by flipping it back. Forgetting meant either
 * committing a config that pointed the deployed app at `localhost:5000`, or
 * spending an afternoon debugging against production data by accident.
 *
 * Angular's `fileReplacements` now does it: `ng serve` and
 * `ng build --configuration development` substitute this file for
 * `environment.ts` automatically. Nothing to remember, and nothing to undo.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1'
};
