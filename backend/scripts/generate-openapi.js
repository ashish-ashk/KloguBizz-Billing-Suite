/**
 * Writes the API description to docs/openapi.json.
 *
 * A generated artefact that is *committed*, deliberately. The endpoint at
 * `/api/v1/openapi.json` is the live truth, but a file in the repository is what
 * makes a change to the API visible in a diff: adding a field to a zod schema
 * shows up as a change to the document in the same commit, and a route that
 * quietly stops validating its body shows up as a new line in `x-undocumented`.
 * A spec that only exists at runtime cannot be reviewed.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const fs = require('fs');
const path = require('path');
const app = require('../server');
const { buildOpenApiDocument } = require('../src/services/openApiService');

const doc = buildOpenApiDocument(app);
const out = path.join(__dirname, '..', '..', 'docs', 'openapi.json');
fs.writeFileSync(out, JSON.stringify(doc, null, 2));

const gaps = doc['x-undocumented'];
console.log(`Wrote ${out}`);
console.log(`  ${Object.keys(doc.paths).length} paths, ${Object.keys(doc.components.schemas).length - 1} request schemas`);
console.log(`  ${gaps.count} endpoints accept a body with no schema`);
console.log(`  ${gaps.likelyGaps.length} of them are PUT/PATCH, which almost always carry one:`);
for (const endpoint of gaps.likelyGaps) console.log(`    ${endpoint}`);
process.exit(0);
