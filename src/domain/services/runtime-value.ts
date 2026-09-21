export type RuntimeValue<T> = T | (() => T);

export const resolveRuntimeValue = <T>(value: RuntimeValue<T>): T => (
  typeof value === "function" ? (value as () => T)() : value
);
