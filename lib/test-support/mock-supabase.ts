export type MockSupabaseQueryRequest = {
  action: "select" | "insert" | "upsert";
  table: string;
  select: string | null;
  payload?: unknown;
  options?: unknown;
  maybeSingle: boolean;
  filters: Array<
    | {
        type: "eq" | "gt" | "in";
        column: string;
        value: unknown;
      }
    | {
        type: "not";
        column: string;
        operator: string;
        value: unknown;
      }
    | {
        type: "order";
        column: string;
        options: unknown;
      }
    | {
        type: "limit";
        value: number;
      }
  >;
};

type MockSupabaseResponse = {
  data?: unknown;
  error?: unknown;
};

type MockSupabaseResponder = (
  request: MockSupabaseQueryRequest,
) => MockSupabaseResponse | Promise<MockSupabaseResponse>;

class MockSupabaseQuery implements PromiseLike<MockSupabaseResponse> {
  private request: MockSupabaseQueryRequest;
  private readonly responder: MockSupabaseResponder;

  constructor(table: string, responder: MockSupabaseResponder) {
    this.responder = responder;
    this.request = {
      action: "select",
      table,
      select: null,
      maybeSingle: false,
      filters: [],
    };
  }

  select(columns: string) {
    this.request.select = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.request.filters.push({ type: "eq", column, value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.request.filters.push({ type: "gt", column, value });
    return this;
  }

  in(column: string, value: unknown) {
    this.request.filters.push({ type: "in", column, value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    this.request.filters.push({ type: "not", column, operator, value });
    return this;
  }

  order(column: string, options: unknown) {
    this.request.filters.push({ type: "order", column, options });
    return this;
  }

  limit(value: number) {
    this.request.filters.push({ type: "limit", value });
    return this;
  }

  maybeSingle() {
    this.request.maybeSingle = true;
    return this;
  }

  insert(payload: unknown) {
    return Promise.resolve(
      this.responder({
        ...this.request,
        action: "insert",
        payload,
      }),
    );
  }

  upsert(payload: unknown, options?: unknown) {
    return Promise.resolve(
      this.responder({
        ...this.request,
        action: "upsert",
        payload,
        options,
      }),
    );
  }

  then<TResult1 = MockSupabaseResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: MockSupabaseResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.responder(this.request)).then(
      onfulfilled,
      onrejected,
    );
  }
}

export function createMockSupabaseClient(responder: MockSupabaseResponder) {
  return {
    from(table: string) {
      return new MockSupabaseQuery(table, responder);
    },
  };
}
