export function parseCustomerReference(value: unknown): [string?, (string | null)?] {
  if (value === undefined) return [];
  if (value === null) return [undefined, null];
  if (typeof value !== "string") return ["La referencia del cliente debe ser un texto."];
  const reference = value.trim();
  if (reference.length > 120) return ["La referencia del cliente admite hasta 120 caracteres."];
  if (/[\u0000-\u001f\u007f]/.test(reference)) return ["La referencia del cliente debe estar en una sola línea."];
  return [undefined, reference || null];
}
