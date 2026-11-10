export interface ErpInventoryQuery {
  query: string;
  warehouseCode: string;
  stock: "all" | "positive" | "zero" | "negative";
  page: number;
  pageSize: number;
  sortBy: "code" | "ean" | "description" | "unit" | "warehouseCode" | "stock";
  sortDirection: "asc" | "desc";
}

export function normalizeInventoryWarehouseCode(value: unknown): string {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f-\u009f]/.test(value)) {
    throw new Error("El código de almacén no es válido.");
  }
  const code = value.trim();
  if (!code || Array.from(code).length > 6) throw new Error("El código de almacén debe tener entre 1 y 6 caracteres.");
  return /^\d+$/.test(code) ? code.padStart(2, "0") : code;
}

export function parseErpInventoryQuery(input: Record<string, unknown>): ErpInventoryQuery {
  const text = (key: string, fallback = ""): string => {
    const value = input[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string") throw new Error(`El parámetro ${key} no es válido.`);
    return value.trim();
  };
  const query = text("query").normalize("NFC").toUpperCase();
  if (query.length > 160) throw new Error("La búsqueda admite hasta 160 caracteres.");
  const warehouseCode = input.warehouseCode === undefined || input.warehouseCode === ""
    ? "" : normalizeInventoryWarehouseCode(input.warehouseCode);
  const stock = text("stock", "all");
  if (!["all", "positive", "zero", "negative"].includes(stock)) throw new Error("El filtro de existencia no es válido.");
  const integer = (key: string, fallback: string) => {
    const value = text(key, fallback);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      throw new Error(`El parámetro ${key} debe ser un entero positivo.`);
    }
    return Number(value);
  };
  const page = integer("page", "1");
  const pageSize = integer("pageSize", "25");
  if (![10, 25, 50, 100].includes(pageSize)) throw new Error("El tamaño de página debe ser 10, 25, 50 o 100.");
  if (!Number.isSafeInteger((page - 1) * pageSize)) throw new Error("La página está fuera del rango permitido.");
  const sortBy = text("sortBy", "code");
  if (!["code", "ean", "description", "unit", "warehouseCode", "stock"].includes(sortBy)) throw new Error("La columna de orden no es válida.");
  const sortDirection = text("sortDirection", "asc");
  if (!["asc", "desc"].includes(sortDirection)) throw new Error("La dirección de orden no es válida.");
  return { query, warehouseCode, stock, page, pageSize, sortBy, sortDirection } as ErpInventoryQuery;
}
