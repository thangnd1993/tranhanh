/** Exact integers, including VND amounts, cross JSON boundaries as base-10 strings. */
export type IntegerString = `${bigint}`;

/** One-based pages; endpoints validate positive integers and cap pageSize explicitly. */
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Opaque cursors for large histories; each endpoint declares a stable ordering and allowed filters. */
export interface CursorResult<T> {
  items: T[];
  nextCursor: string | null;
}
