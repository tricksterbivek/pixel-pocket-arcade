/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * SuiteReact multiplexed Suitelet.
 *
 * A single deployment URL serves two things (see ARCHITECTURE.md §4/§5):
 *   - GET with no `action`        -> the single-file React bundle (text/html)
 *   - GET with `action` / any POST -> a JSON data API ({ ok, data } | { ok, error })
 *
 * Auth is the browser's existing NetSuite session cookie, so NetSuite enforces
 * the logged-in user's record permissions on every N/query / N/record call.
 */
define(['N/file', 'N/query', 'N/record', 'N/log'], (file, query, record, log) => {
  // Absolute File Cabinet path of the generated single-file React bundle.
  const UI_HTML_PATH = 'SuiteScripts/SuiteReact/ui.html';

  // -------------------------------------------------------------------------
  // Record-type allow-list.
  //
  // Each entry maps a public `type` token (validated server-side) to the
  // SuiteQL table + the columns we expose. Keeping this server-side means a
  // caller can never query an arbitrary table.
  //
  // ADAPT POINT: table/column names below are the conservative, commonly-present
  // analytics-table columns for these record types. Confirm against your account
  // schema (Records Catalog / SuiteQL browser) and swap in custom fields as needed.
  // -------------------------------------------------------------------------
  const RECORD_TYPES = {
    customer: {
      recordType: record.Type.CUSTOMER,
      table: 'customer',
      // entityid = the "ID" shown in the UI; companyname for company customers.
      idColumn: 'id',
      // Columns returned by `list`, aliased to the stable API shape { id, name, email, date }
      // (see ARCHITECTURE.md §5.2). Add columns here to surface more in the dashboard.
      listSelect: 'id, COALESCE(companyname, entityid) AS name, email, datecreated AS date',
      // Free-text search targets for `q`.
      searchColumns: ['entityid', 'companyname', 'email'],
    },
    contact: {
      recordType: record.Type.CONTACT,
      table: 'contact',
      idColumn: 'id',
      listSelect: 'id, entityid AS name, email, datecreated AS date',
      searchColumns: ['entityid', 'firstname', 'lastname', 'email'],
    },
    transaction: {
      recordType: record.Type.SALES_ORDER, // generic detail/write target for the `transaction` family
      table: 'transaction',
      idColumn: 'id',
      // tranid = document number; entity = customer/vendor internal id; trandate = date.
      listSelect: 'id, tranid AS name, BUILTIN.DF(entity) AS entity, foreigntotal AS total, trandate AS date',
      searchColumns: ['tranid'],
    },
  };

  const ALLOWED_TYPES = Object.keys(RECORD_TYPES);

  // -------------------------------------------------------------------------
  // Validation / parsing helpers
  // -------------------------------------------------------------------------

  /** Resolve and validate a `type` token against the allow-list. */
  const resolveType = (type) => {
    if (!type) {
      throw new Error('missing type');
    }
    const cfg = RECORD_TYPES[String(type).toLowerCase()];
    if (!cfg) {
      throw new Error('invalid type');
    }
    return cfg;
  };

  /** Clamp a value to an integer within [min, max], falling back to `dflt`. */
  const clampInt = (raw, dflt, min, max) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) {
      return dflt;
    }
    return Math.min(max, Math.max(min, n));
  };

  /**
   * Parse the POST body as JSON. `context.request.body` is a string for
   * Suitelets; GET requests have no body.
   */
  const parseBody = (request) => {
    if (!request.body) {
      return {};
    }
    try {
      return JSON.parse(request.body) || {};
    } catch (e) {
      throw new Error('invalid JSON body');
    }
  };

  // -------------------------------------------------------------------------
  // Actions (see ARCHITECTURE.md §5)
  // -------------------------------------------------------------------------

  /**
   * action=list — paginated SuiteQL list of a record family.
   * Returns { rows, total, limit, offset }.
   *
   * Governance: two single-page SuiteQL runs (rows + COUNT) ~ 20 units total.
   */
  const actionList = (request) => {
    const params = request.parameters;
    const cfg = resolveType(params.type);

    const limit = clampInt(params.limit, 50, 1, 1000);
    const offset = clampInt(params.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const q = params.q ? String(params.q).trim() : '';

    // Build a parameterized WHERE clause for `q`. Every user value goes into the
    // `sqlParams` array as a `?` placeholder — never string-concatenated.
    const sqlParams = [];
    let where = '';
    if (q) {
      const like = `%${q.toUpperCase()}%`;
      const clauses = cfg.searchColumns.map((col) => {
        sqlParams.push(like);
        return `UPPER(${col}) LIKE ?`;
      });
      where = ` WHERE (${clauses.join(' OR ')})`;
    }

    // --- total (lean COUNT, reuses the same WHERE + params) ---
    const countSql = `SELECT COUNT(*) AS total FROM ${cfg.table}${where}`;
    const countResults = query
      .runSuiteQL({ query: countSql, params: sqlParams.slice() })
      .asMappedResults();
    const total = countResults.length ? Number(countResults[0].total) : 0;

    // --- page of rows ---
    // IMPORTANT: NetSuite SuiteQL supports `FETCH NEXT ... ROWS ONLY` but
    // SILENTLY IGNORES the `OFFSET` clause, so naive OFFSET/FETCH paging returns
    // the first page on every request. We use the documented ROWNUM technique
    // instead: sort in an inner subquery, assign ROWNUM in the middle (so it is
    // applied AFTER the ORDER BY), then filter the row range in the outer query.
    // Bounds are clamped ints, so they are safe to interpolate; the `q` filter
    // still flows through the parameterized `?` placeholders in the inner WHERE.
    const upperBound = offset + limit;
    const rowsSql =
      `SELECT * FROM (` +
        `SELECT ROWNUM AS rn, ordered_q.* FROM (` +
          `SELECT ${cfg.listSelect} FROM ${cfg.table}${where} ORDER BY ${cfg.idColumn}` +
        `) ordered_q` +
      `) WHERE rn > ${offset} AND rn <= ${upperBound}`;
    const rows = query
      .runSuiteQL({ query: rowsSql, params: sqlParams.slice() })
      .asMappedResults();
    // Drop the helper pagination column so it never leaks into the API shape.
    rows.forEach((r) => { delete r.rn; });

    return { rows, total, limit, offset };
  };

  /**
   * action=get — single record's fields.
   * Uses SuiteQL (lean) to fetch the one row by id. Returns { id, fields }.
   */
  const actionGet = (request) => {
    const params = request.parameters;
    const cfg = resolveType(params.type);
    const id = params.id;
    if (!id) {
      throw new Error('missing id');
    }

    const sql = `SELECT ${cfg.listSelect} FROM ${cfg.table} WHERE ${cfg.idColumn} = ?`;
    const results = query.runSuiteQL({ query: sql, params: [id] }).asMappedResults();
    if (!results.length) {
      throw new Error('not found');
    }

    // Suitelet query params are strings; coerce to a number to match the API contract.
    return { id: Number(id), fields: results[0] };
  };

  /**
   * action=update — POST { action, type, id, values }.
   * Loads the record, applies each field from `values`, saves. Returns { id }.
   */
  const actionUpdate = (request, body) => {
    const cfg = resolveType(body.type);
    const id = body.id;
    if (!id) {
      throw new Error('missing id');
    }
    const values = body.values;
    if (!values || typeof values !== 'object') {
      throw new Error('missing values');
    }

    const rec = record.load({ type: cfg.recordType, id });
    Object.keys(values).forEach((fieldId) => {
      rec.setValue({ fieldId, value: values[fieldId] });
    });
    // record.save() returns the internal id of the saved record — return the
    // confirmed id (a number) rather than echoing the input.
    const savedId = rec.save();

    return { id: savedId };
  };

  /**
   * Dispatch an action. `action` may arrive in the query string (GET/POST) or
   * the POST body — the query parameter takes precedence, body is the fallback.
   */
  const handleAction = (request) => {
    let action = request.parameters.action;
    // Parse the POST body at most once and thread it to body-based actions.
    const body = request.method === 'POST' ? parseBody(request) : {};
    if (!action) {
      // Allow the action to live in the JSON body (per §5.4).
      action = body.action;
    }

    switch (action) {
      case 'list':
        return actionList(request);
      case 'get':
        return actionGet(request);
      case 'update':
        return actionUpdate(request, body);
      default:
        // POST/GET reached the JSON branch but carried no usable action.
        throw new Error('missing action');
    }
  };

  // -------------------------------------------------------------------------
  // Entry point
  // -------------------------------------------------------------------------
  const onRequest = (context) => {
    const { request, response } = context;
    const action = request.parameters.action;

    // ---- DATA API branch (JSON) ----
    // Any POST, or any GET that carries an `action`, is a data request.
    if (request.method === 'POST' || action) {
      response.setHeader({ name: 'Content-Type', value: 'application/json' });
      try {
        const payload = handleAction(request);
        response.write(JSON.stringify({ ok: true, data: payload }));
      } catch (e) {
        // Log full detail server-side; return only a safe message to the client.
        log.error({
          title: 'SuiteReact data API error',
          details: (e && e.stack) || String(e),
        });
        response.write(
          JSON.stringify({ ok: false, error: String((e && e.message) || e) })
        );
      }
      return;
    }

    // ---- UI branch (HTML) ----  GET with no action.
    try {
      const html = file.load({ id: UI_HTML_PATH }).getContents();
      // Content-Type defaults to text/html for Suitelet writes.
      response.write(html);
    } catch (e) {
      log.error({
        title: 'SuiteReact UI bundle load failed',
        details: (e && e.stack) || String(e),
      });
      response.write(
        'SuiteReact UI bundle (ui.html) not found. Run the build + inject step and deploy.'
      );
    }
  };

  return { onRequest };
});
