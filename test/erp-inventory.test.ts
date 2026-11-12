import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import express from "express";
import type { AddressInfo } from "node:net";
import { ErpInventoryAdapter, ErpInventoryGatewayError } from "../src/infrastructure/http/erp-inventory.adapter";
import { ErpInventoryUseCase, ErpInventoryVisibilityError } from "../src/domain/use-cases/erp-inventory.use-case";
import { parseErpInventoryQuery, normalizeInventoryWarehouseCode, parseErpInventoryVisibility } from "../src/domain/dtos/request/erp-inventory-query.dto";
import type { ErpInventoryPage } from "../src/domain/contracts/erp-inventory.port";

const query = parseErpInventoryQuery({});
const fixture = (): ErpInventoryPage => ({ items: [
  { id: "1::06", code: "06401952", ean: "TSC40", description: "Tubo", unit: "M", warehouseCode: "06", stock: 0 },
  { id: "2::98", code: "010001", ean: "TSC40", description: "Otro tubo", unit: "M", warehouseCode: "98", stock: -2 },
  { id: "3::none", code: "010002", ean: "", description: "Sin almacén", unit: "PZ", warehouseCode: null, stock: null },
], page: 1, pageSize: 25, total: 3, totalPages: 1 });

test("inventory adapter authenticates only server-to-server and allowlists response fields", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(new Headers(options?.headers).get("x-internal-api-key"), "fixture-secret");
    assert.equal(new URL(String(url)).pathname, "/api/erp/products/inventory");
    assert.equal(new URL(String(url)).searchParams.get("query"), "TSC 40");
    const body = fixture();
    Object.assign(body.items[0], { averageCost: 900, ICTA: "private" });
    return Response.json(body);
  };
  try {
    const result = await new ErpInventoryAdapter("https://erp.example/", "/api/erp/products/", 1000, "fixture-secret")
      .list({ ...query, query: "TSC 40" });
    assert.equal(result.items[0].stock, 0);
    assert.equal(result.items[1].stock, -2);
    assert.equal(result.items[2].stock, null);
    assert.equal("averageCost" in result.items[0], false);
    assert.equal("ICTA" in result.items[0], false);
  } finally { globalThis.fetch = previous; }
});

test("adapter rejects missing key, malformed pages, upstream errors and timeouts safely", async () => {
  await assert.rejects(new ErpInventoryAdapter("https://erp.example", "/products", 10).list(query), /clave interna/);
  const previous = globalThis.fetch;
  const adapter = new ErpInventoryAdapter("https://erp.example", "/products", 5, "key");
  try {
    globalThis.fetch = async () => Response.json({ ...fixture(), total: -1 });
    await assert.rejects(adapter.list(query), /no válida/);
    globalThis.fetch = async () => Response.json({ ...fixture(), items: [{ ...fixture().items[0], stock: "5" }] });
    await assert.rejects(adapter.list(query), /no válida/);
    globalThis.fetch = async () => new Response("SQL private credentials", { status: 500 });
    await assert.rejects(adapter.list(query), error => error instanceof ErpInventoryGatewayError && !error.message.includes("SQL"));
    globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
    });
    await assert.rejects(adapter.list(query), error => error instanceof ErpInventoryGatewayError && error.status === 504);
  } finally { globalThis.fetch = previous; }
});

test("warehouse listing preserves real ERP codes, removes duplicates and rejects malformed entries", async () => {
  const previous = globalThis.fetch;
  const adapter = new ErpInventoryAdapter("https://erp.example", "/api/erp/products", 1000, "key");
  try {
    globalThis.fetch = async url => {
      assert.equal(String(url), "https://erp.example/api/erp/products/inventory/warehouses");
      return Response.json(["15", "06", "98", "06", "ANOID", "|", "003", "1", "01"]);
    };
    assert.deepEqual(await adapter.warehouses(), ["003", "01", "06", "15", "98", "ANOID", "|"]);
    for (const invalid of [null, "", "   ", "TOOLONG", "A\n", "\u0000"]) {
      globalThis.fetch = async () => Response.json(["01", invalid]);
      await assert.rejects(adapter.warehouses(), /no válida/);
    }
  } finally { globalThis.fetch = previous; }
});

test("scoped adapter rejects old ERP responses and out-of-scope items or totals", async () => {
  const previous = globalThis.fetch;
  const adapter = new ErpInventoryAdapter("https://erp.example", "/products", 1000, "key");
  const scoped = { ...fixture(), items: fixture().items.slice(0, 1), total: 1 };
  try {
    globalThis.fetch = async () => Response.json(scoped);
    await assert.rejects(adapter.list(query, ["06"]), /no confirmó/);
    globalThis.fetch = async () => Response.json({ ...scoped, warehouseCodes: ["06", "98"] });
    await assert.rejects(adapter.list(query, ["06"]), /no confirmó/);
    globalThis.fetch = async () => Response.json({ ...fixture(), warehouseCodes: ["06"] });
    await assert.rejects(adapter.list(query, ["06"]), /fuera de los almacenes/);
    globalThis.fetch = async url => {
      assert.deepEqual(new URL(String(url)).searchParams.getAll("warehouseCodes"), ["06", "|"]);
      return Response.json({ ...scoped, warehouseCodes: ["06", "|"] });
    };
    assert.deepEqual(await adapter.list(query, ["06", "|"]), scoped);
  } finally { globalThis.fetch = previous; }
});

test("inventory uses the existing warehouse names without filtering by assignments or guessing branches", async () => {
  const useCase = new ErpInventoryUseCase({ list: async () => fixture(), warehouses: async () => ["06", "98", "15", "ANOID", "|"] }, {
    list: async includeInactive => {
      assert.equal(includeInactive, true);
      return [{ id: "id", code: "06", name: "Cancún", companyCode: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }];
    },
  }, { read: async () => null, save: async () => assert.fail("Unexpected save") });
  const result = await useCase.list(query);
  assert.equal(result.items[0].warehouseName, "Cancún");
  assert.equal(result.items[1].warehouseName, "Almacén 98");
  assert.equal(result.items[2].warehouseName, "Sin registro de almacén");
  assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
  const warehouses = await useCase.warehouses();
  assert.deepEqual(warehouses.map(row => row.code), ["06", "98", "15", "ANOID", "|"]);
  assert.equal(warehouses[3].name, "Almacén ANOID");
  assert.equal(warehouses[4].name, "Almacén |");
});

test("inventory visibility applies to totals, direct filters and the warehouse list, not the admin catalog", async () => {
  let stored: string[] | null = null;
  let calls = 0;
  const useCase = new ErpInventoryUseCase({
    list: async (_query, codes) => {
      calls++;
      assert.deepEqual(codes, ["06", "|"]);
      return { ...fixture(), items: fixture().items.slice(0, 1), total: 1 };
    },
    warehouses: async () => ["06", "98", "|"],
  }, { list: async () => [] }, {
    read: async () => stored,
    save: async (codes, actor) => { assert.equal(actor, "admin"); stored = codes; },
  });
  assert.equal((await useCase.settings()).warehouseCodes, null);
  await assert.rejects(useCase.updateSettings(["unknown"], "admin"), ErpInventoryVisibilityError);
  await useCase.updateSettings(["06", "|"], "admin");
  assert.deepEqual((await useCase.warehouses()).map(({ code }) => code), ["06", "|"]);
  assert.deepEqual((await useCase.settings()).warehouses.map(({ code }) => code), ["06", "98", "|"]);
  assert.equal((await useCase.list(query)).total, 1);
  assert.equal((await useCase.list({ ...query, warehouseCode: "98", page: 3 })).total, 0);
  await useCase.updateSettings([], "admin");
  assert.deepEqual(await useCase.warehouses(), []);
  assert.equal((await useCase.list(query)).total, 0);
  assert.equal(calls, 1);
  await useCase.updateSettings(null, "admin");
  assert.equal((await useCase.warehouses()).length, 3);
});

test("core validates parameters independently of the ERP service", () => {
  assert.equal(parseErpInventoryQuery({ warehouseCode: "6" }).warehouseCode, "06");
  assert.equal(parseErpInventoryQuery({ query: " tSc " }).query, "TSC");
  assert.equal(parseErpInventoryQuery({ query: " va\u0301lvula " }).query, "VÁLVULA");
  for (const code of ["003", "ANOID", "|"]) assert.equal(parseErpInventoryQuery({ warehouseCode: code }).warehouseCode, code);
  for (const input of [{ query: ["TSC"] }, { page: "0" }, { pageSize: "500" }, { sortBy: "cost" }, { warehouseCode: "TOOLONG" }, { warehouseCode: "\t01" }, { stock: "bad" }]) {
    assert.throws(() => parseErpInventoryQuery(input));
  }
  assert.equal(normalizeInventoryWarehouseCode("0|"), "0|");
  assert.equal(parseErpInventoryVisibility(null), null);
  assert.deepEqual(parseErpInventoryVisibility(["6", "06", "003", "ANOID", "|"]), ["003", "06", "ANOID", "|"]);
  assert.deepEqual(parseErpInventoryVisibility([]), []);
  for (const value of [undefined, "01", [null], ["A\n"], Array(129).fill("01")]) {
    assert.throws(() => parseErpInventoryVisibility(value));
  }
});

test("visibility repository uses the existing setting and audits updates atomically", async () => {
  let value: unknown;
  const writes: any[] = [];
  const systemSetting = { findUnique: async () => value === undefined ? null : { value } };
  const { PrismaErpInventoryVisibilityRepository } = load("src/infrastructure/repositories/prisma-erp-inventory-visibility.repository.ts", {
    "../../domain/dtos/request/erp-inventory-query.dto": { parseErpInventoryVisibility },
    "../database/prisma-client": { prisma: { systemSetting, $transaction: async (callback: (tx: unknown) => Promise<void>) => callback({
      systemSetting: { ...systemSetting, upsert: async (input: any) => {
        writes.push(input); value = input.create.value;
      } },
      auditLog: { create: async (input: any) => { writes.push(input); } },
    }) } },
  });
  const repository = new PrismaErpInventoryVisibilityRepository();
  assert.equal(await repository.read(), null);
  await repository.save(["06"], "admin");
  assert.deepEqual(await repository.read(), ["06"]);
  await repository.save([], "admin");
  assert.deepEqual(await repository.read(), []);
  assert.equal(writes[0].where.key, "ERP_INVENTORY_VISIBLE_WAREHOUSES");
  assert.equal(writes[1].data.actorUserId, "admin");
  assert.equal(writes[3].data.payload.previousValue.warehouseCodes[0], "06");
  value = { warehouseCodes: "invalid" };
  await assert.rejects(repository.read());
});

const requireModule = createRequire(`${process.cwd()}/package.json`);
function load(path: string, overrides: Record<string, unknown>) {
  const source = readFileSync(path, "utf8");
  const module = { exports: {} as Record<string, any> };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Promise, require: (name: string) => name in overrides ? overrides[name] : requireModule(name) });
  return module.exports;
}

test("both core endpoints allow every active role but reject inactive, unauthenticated and invalid requests", async () => {
  const roles = ["ADMIN", "SELLER", "MANAGER", "PURCHASING", "CREDIT_COLLECTIONS"];
  const { requireAuth } = load("src/presentation/middlewares/auth.middleware.ts", {
    "../../infrastructure/adapters/jwt.adapter": { JwtAdapter: { verifyAccessToken: (token: string) => ({ sub: token }) } },
    "../../infrastructure/database/prisma-client": { prisma: { user: { findUnique: async ({ where }: { where: { id: string } }) => ({
      id: where.id, role: where.id, branchId: "branch", erpUserCode: null, whatsappInboxEnabled: false,
      isActive: roles.includes(where.id),
    }) } } },
  });
  let calls = 0;
  let settingsCalls = 0;
  const { requireRoles } = load("src/presentation/middlewares/rbac.middleware.ts", {});
  const { erpInventoryRoutes } = load("src/presentation/inventory/erp-inventory.routes.ts", {
    "../../config/envs": { Envs: {} },
    "../../domain/dtos/request/erp-inventory-query.dto": { parseErpInventoryQuery, parseErpInventoryVisibility },
    "../../domain/use-cases/erp-inventory.use-case": { ErpInventoryVisibilityError, ErpInventoryUseCase: class {
      async list() { calls++; return fixture(); }
      async warehouses() { calls++; return [{ code: "06", name: "Cancún" }]; }
      async settings() { settingsCalls++; return { warehouseCodes: null, warehouses: [] }; }
      async updateSettings(codes: string[] | null, actor: string) {
        assert.equal(actor, "ADMIN");
        if (codes?.includes("98")) throw new ErpInventoryVisibilityError("Almacén no disponible");
        settingsCalls++;
        return { warehouseCodes: codes, warehouses: [] };
      }
    } },
    "../../infrastructure/datasources/prisma-erp-warehouse.datasource": { PrismaErpWarehouseDatasource: class {} },
    "../../infrastructure/http/erp-inventory.adapter": { ErpInventoryAdapter: class {}, ErpInventoryGatewayError },
    "../../infrastructure/repositories/erp-warehouse.repository-impl": { ErpWarehouseRepositoryImpl: class {} },
    "../../infrastructure/repositories/prisma-erp-inventory-visibility.repository": { PrismaErpInventoryVisibilityRepository: class {} },
    "../middlewares/auth.middleware": { requireAuth },
    "../middlewares/rbac.middleware": { requireRoles },
  });
  const app = express(); app.use(express.json()); app.use("/api/inventory/erp", erpInventoryRoutes());
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/inventory/erp`;
  try {
    for (const role of roles) for (const path of ["", "/warehouses"]) {
      assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${role}` } })).status, 200);
    }
    assert.equal(calls, 10);
    const getSettings = (role: string) => fetch(`${base}/settings`, { headers: { Authorization: `Bearer ${role}` } });
    const putSettings = (role: string, warehouseCodes?: unknown) => fetch(`${base}/settings`, {
      method: "PUT", headers: { Authorization: `Bearer ${role}`, "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseCodes }),
    });
    assert.equal((await getSettings("INACTIVE")).status, 401);
    for (const role of roles.filter(role => role !== "ADMIN")) {
      assert.equal((await getSettings(role)).status, 403);
      assert.equal((await putSettings(role, null)).status, 403);
    }
    assert.equal(settingsCalls, 0);
    const response = await getSettings("ADMIN");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await putSettings("ADMIN")).status, 400);
    assert.equal((await putSettings("ADMIN", ["98"])).status, 400);
    assert.deepEqual((await (await putSettings("ADMIN", ["6"])).json()).warehouseCodes, ["06"]);
    assert.equal(settingsCalls, 2);
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(`${base}/warehouses`, { headers: { Authorization: "Bearer INACTIVE" } })).status, 401);
    assert.equal((await fetch(`${base}?page=0`, { headers: { Authorization: "Bearer SELLER" } })).status, 400);
    assert.equal(calls, 10);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
