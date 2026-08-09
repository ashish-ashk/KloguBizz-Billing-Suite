const { zodToJsonSchema } = require('zod-to-json-schema');
const pkg = require('../../package.json');

/**
 * The API description, generated from the server itself (#63).
 *
 * ── Why this is generated and not written ─────────────────────────────
 *
 * A hand-written OpenAPI document is correct on the day it is written and wrong
 * within a week, because nothing forces it to change when a route does. It then
 * becomes actively harmful: an integrator trusts it, builds against a field that
 * no longer exists, and the failure surfaces in their code rather than ours.
 *
 * So this walks **Express's own router stack** — the same structure that
 * dispatches real requests — and reads the zod schemas off the `validate()`
 * middleware attached to each route. There is one definition of a request's
 * shape, the server enforces it, and the document describes it. They cannot
 * disagree because they are the same object.
 *
 * ── The half that matters more ────────────────────────────────────────
 *
 * A generated spec can only describe what it can see. The valuable part is
 * therefore not the endpoints it documents but the ones it **cannot**: every
 * body-taking route with no schema is listed under `x-undocumented`, by method
 * and path, with a count.
 *
 * That number is the point. It is a coverage metric for request validation that
 * nobody has to remember to compute — and unlike a hand-written document, which
 * is silent about its own gaps, this one names them.
 */

/** Methods that carry a request body worth describing. */
const BODY_METHODS = new Set(['post', 'put', 'patch']);

/**
 * Turns Express's path-to-regexp layers back into readable paths.
 *
 * Express does not keep the original string on a router layer — only the regexp
 * it compiled — so this reverses the compilation for the shapes this codebase
 * actually uses. It is deliberately narrow: a general-purpose regexp decompiler
 * would be far more code and would still be guessing, and every mount point here
 * is a plain literal prefix.
 */
function mountPathOf(layer) {
  if (layer.path) return layer.path;
  const source = layer.regexp?.source;
  if (!source) return '';
  if (source === '^\\/?$' || source === '^\\/?(?=\\/|$)') return '';
  const match = source
    .replace('^', '')
    .replace('\\/?(?=\\/|$)', '')
    .replace('(?:\\/(?=$))?$', '')
    .replace(/\\\//g, '/');
  return match.startsWith('/') ? match : `/${match}`;
}

/** `/invoices/:id` → `/invoices/{id}`, and the parameter list OpenAPI needs. */
function toOpenApiPath(path) {
  const parameters = [];
  const converted = path.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    parameters.push({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: name === 'id' ? 'Document id' : undefined
    });
    return `{${name}}`;
  });
  /**
   * A router's own `'/'` route mounts as `/api/v1/invoices/`.
   *
   * Normalised, because a trailing slash is not a different endpoint and leaving
   * it produces two entries for one route in the document — which reads as an
   * API with a duplicate rather than a generator with a rough edge.
   */
  const normalised = converted.length > 1 ? converted.replace(/\/$/, '') : converted;
  return { path: normalised, parameters };
}

/**
 * What a route requires of the caller, read from the guards mounted on it.
 *
 * Authentication is read from an explicit `isAuthGuard` tag, not from the
 * function's name. Name matching looked sufficient and was not: `protect` is
 * wrapped by `asyncHandler`, so what Express holds is anonymous, and the
 * document declared the entire authenticated API public.
 *
 * The *other* guards are still listed by name, best-effort, as `x-guards` — an
 * inline arrow is invisible there, which is why they are described as what the
 * stack shows rather than as a security guarantee.
 */
// App-level plumbing that is on every route and describes nothing about it.
const PLUMBING = new Set([
  'query', 'expressInit', 'jsonParser', 'urlencodedParser', 'corsMiddleware',
  'helmetMiddleware', 'requestContext', 'requestLogger', 'compression', 'serveStatic'
]);

function securityOf(handlers) {
  const security = handlers.some(h => h.isAuthGuard) ? [{ bearerAuth: [] }] : [];
  const guards = handlers
    .map(h => h.name)
    .filter(name => name && !PLUMBING.has(name) && name !== '<anonymous>');
  return { security, guards: [...new Set(guards)] };
}

/** Collects every route Express will dispatch, with the middleware on it. */
function collectRoutes(app) {
  const routes = [];

  /**
   * `inherited` carries router-level middleware down to the routes beneath it.
   *
   * Without it the security section is wrong in the direction that matters most:
   * almost every router in this codebase applies `protect` once with
   * `router.use(protect, requireTenant)` rather than repeating it on each route,
   * so a per-route-only reading finds no guard and documents the entire
   * authenticated API as public. A description that says an endpoint needs no
   * token is worse than one that says nothing.
   */
  const walk = (stack, prefix, inherited) => {
    const routerLevel = [...inherited];

    for (const layer of stack || []) {
      if (layer.route) {
        const handlers = [...routerLevel, ...layer.route.stack.map(s => s.handle)];
        for (const [method, enabled] of Object.entries(layer.route.methods)) {
          if (enabled) routes.push({ method, path: `${prefix}${layer.route.path}`, handlers });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        walk(layer.handle.stack, `${prefix}${mountPathOf(layer)}`, routerLevel);
      } else if (typeof layer.handle === 'function') {
        /**
         * A bare `router.use(fn)`. Accumulated in declaration order, so a guard
         * applies to the routes *below* it and not to those above — which is what
         * Express does, and getting it backwards would document unguarded routes
         * as guarded.
         *
         * Anonymous functions are kept, deliberately. Requiring a name skipped
         * `protect` — which `asyncHandler` wraps, leaving it nameless — and the
         * document declared every authenticated route public. A layer's name is
         * useful for *labelling* it; it is not a condition for it existing.
         */
        routerLevel.push(layer.handle);
      }
    }
  };

  /**
   * Express 4 keeps the stack on `_router`; Express 5 exposes `router`.
   *
   * Checked in that order and not the reverse: Express 4's `app.router` is a
   * getter that *throws* a migration error rather than returning undefined, so
   * probing for the new name first crashes on the version this project actually
   * runs.
   */
  walk(app._router?.stack || app.router?.stack, '', []);
  return routes;
}

/** A stable, readable name for a schema component. */
function componentNameFor(method, path) {
  const cleaned = path
    .replace(/^\/api\/v1\//, '')
    .replace(/[{}]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `${method.charAt(0).toUpperCase()}${method.slice(1)}${cleaned}Request`;
}

/**
 * Builds the document.
 *
 * @param {object} app  The Express application, after routes are mounted.
 */
function buildOpenApiDocument(app) {
  const routes = collectRoutes(app).filter(route => route.path.startsWith('/api/v1'));
  const paths = {};
  const schemas = {};
  const undocumented = [];
  const validatedElsewhere = [];

  for (const route of routes) {
    const { path, parameters } = toOpenApiPath(route.path);
    const { security, guards } = securityOf(route.handlers);
    const validator = route.handlers.find(h => h.zodSchema);

    let requestBody;
    if (validator && validator.zodSource === 'body') {
      const name = componentNameFor(route.method, path);
      try {
        schemas[name] = zodToJsonSchema(validator.zodSchema, { target: 'openApi3', $refStrategy: 'none' });
        requestBody = {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } }
        };
      } catch {
        // A schema the converter cannot express is still a documented endpoint;
        // it simply loses its body shape. Failing the whole document over one
        // exotic refinement would be a poor trade.
        requestBody = { required: true, content: { 'application/json': { schema: { type: 'object' } } } };
      }
    } else if (BODY_METHODS.has(route.method)) {
      const elsewhere = route.handlers.find(h => h.validatedElsewhere);
      if (elsewhere) {
        // Validated, just not by a zod schema. Recorded with its reason rather
        // than left in the gap list, where a permanent entry would train people
        // to ignore the list.
        validatedElsewhere.push({ endpoint: `${route.method.toUpperCase()} ${path}`, by: elsewhere.validatedElsewhere });
      } else {
        // The list that makes this worth generating — see the header.
        undocumented.push(`${route.method.toUpperCase()} ${path}`);
      }
    }

    paths[path] = paths[path] || {};
    paths[path][route.method] = {
      summary: `${route.method.toUpperCase()} ${path}`,
      tags: [path.split('/')[3] || 'root'],
      ...(parameters.length ? { parameters } : {}),
      ...(requestBody ? { requestBody } : {}),
      ...(security.length ? { security } : {}),
      ...(guards.length ? { 'x-guards': guards } : {}),
      responses: {
        200: { description: 'Success' },
        400: { description: 'The request failed validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: { description: 'Not authenticated, or the session has expired' },
        403: { description: 'Authenticated, but not permitted' }
      }
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'KloguBizz API',
      version: pkg.version || '1.0.0',
      description: 'Generated from the running server: every request shape below is the zod schema '
        + 'the API actually enforces, read off the route table at startup. '
        + 'See `x-undocumented` for endpoints that accept a body without a schema.'
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        ...schemas,
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            requestId: { type: 'string' },
            details: {
              type: 'array',
              items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } }
            }
          }
        }
      }
    },
    paths,
    /**
     * Deliberately at the top level and deliberately not empty.
     *
     * A document that quietly omitted these would read as complete. Naming them
     * turns "we have API docs" into "we have API docs, and here are the twelve
     * endpoints they do not cover" — which is the only version of the claim that
     * is true.
     */
    /**
     * Deliberately at the top level and deliberately not empty.
     *
     * Split by method, because the raw count overstates the problem and an
     * overstated number gets ignored. A `POST /invoices/{id}/restore` is an
     * *action* — it takes no body at all, and demanding a schema for it would be
     * ceremony. A `PUT` or `PATCH` almost always carries one, so an unvalidated
     * one is a real gap: `PUT /superadmin/plans/{code}` wrote whatever arrived
     * straight through until this was generated and the list named it.
     */
    'x-undocumented': {
      count: undocumented.length,
      /** The ones that almost certainly carry a body. Fix these first. */
      likelyGaps: undocumented.filter(entry => entry.startsWith('PUT') || entry.startsWith('PATCH')).sort(),
      /** Action-style posts. Many legitimately take no body. */
      actions: undocumented.filter(entry => entry.startsWith('POST')).sort(),
      /** Validated by something other than a zod schema, with the reason. */
      validatedElsewhere,
      note: 'These accept a request body with no zod schema, so their shape is enforced only by the '
        + 'controller. `likelyGaps` are PUT/PATCH routes, which almost always carry a body — adding '
        + 'validate(schema) documents and validates them at once. `actions` are POSTs, many of which '
        + 'take no body and need nothing.'
    }
  };
}

module.exports = { buildOpenApiDocument, collectRoutes };
