import { vi } from 'vitest'

/**
 * A recording stand-in for the PostgREST query builder.
 *
 * The service layer chains `.from().select().eq().order().limit()` and either
 * awaits the builder directly or terminates with `.single()` / `.maybeSingle()`.
 * This captures the whole chain as one `RecordedOp` and hands it to a resolver,
 * so a test can assert on what the service *asked for* -- the attempt filter,
 * the row limit, the inserted payload -- rather than on a mocked return value.
 */
export type RecordedOp = {
  table: string
  method: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
  payload?: Record<string, unknown>
  columns?: string
  filters: Array<{ op: string; column: string; value: unknown }>
  order?: { column: string; ascending?: boolean }
  limit?: number
  single?: 'single' | 'maybeSingle'
}

export type QueryResult = { data?: unknown; error?: { message: string; code?: string } | null }

export type Resolver = (op: RecordedOp) => QueryResult

/**
 * A per-table override. Returning `undefined` means "not my case" and falls
 * through to the default row for that table, so a test can special-case one
 * operation (an insert, say) without restating the reads around it.
 */
export type TableResolver = (op: RecordedOp) => QueryResult | undefined

export function filterValue(op: RecordedOp, column: string): unknown {
  return op.filters.find((filter) => filter.column === column)?.value
}

export function createSupabaseStub(resolve: Resolver) {
  const ops: RecordedOp[] = []

  function createQuery(table: string) {
    const op: RecordedOp = { table, method: 'select', filters: [] }
    let methodSet = false

    const setMethod = (method: RecordedOp['method']) => {
      op.method = method
      methodSet = true
    }

    const builder = {
      select(columns?: string) {
        // `.select()` after an insert names the returning columns; it must not
        // reclassify the operation.
        if (!methodSet) setMethod('select')
        op.columns = columns
        return builder
      },
      insert(payload: Record<string, unknown>) {
        setMethod('insert')
        op.payload = payload
        return builder
      },
      update(payload: Record<string, unknown>) {
        setMethod('update')
        op.payload = payload
        return builder
      },
      upsert(payload: Record<string, unknown>) {
        setMethod('upsert')
        op.payload = payload
        return builder
      },
      delete() {
        setMethod('delete')
        return builder
      },
      eq(column: string, value: unknown) {
        op.filters.push({ op: 'eq', column, value })
        return builder
      },
      lt(column: string, value: unknown) {
        op.filters.push({ op: 'lt', column, value })
        return builder
      },
      ilike(column: string, value: unknown) {
        op.filters.push({ op: 'ilike', column, value })
        return builder
      },
      is(column: string, value: unknown) {
        op.filters.push({ op: 'is', column, value })
        return builder
      },
      order(column: string, options?: { ascending?: boolean }) {
        op.order = { column, ...options }
        return builder
      },
      limit(count: number) {
        op.limit = count
        return builder
      },
      single() {
        op.single = 'single'
        return builder
      },
      maybeSingle() {
        op.single = 'maybeSingle'
        return builder
      },
      then(
        onFulfilled?: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        ops.push(op)
        const result = resolve(op)
        return Promise.resolve({ data: null, error: null, ...result }).then(
          onFulfilled,
          onRejected,
        )
      },
    }

    return builder
  }

  return {
    client: { from: vi.fn((table: string) => createQuery(table)) },
    ops,
    /** Every recorded operation against one table, in call order. */
    opsFor(table: string) {
      return ops.filter((op) => op.table === table)
    },
  }
}
