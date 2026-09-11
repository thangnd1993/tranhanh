/** Express JSON replacer: preserve arbitrary integer precision without modifying BigInt.prototype. */
export function bigintJsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString(10) : value;
}
