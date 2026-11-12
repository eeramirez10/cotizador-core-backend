import { Router } from "express";
import { Envs } from "../../config/envs";
import { parseErpInventoryQuery, parseErpInventoryVisibility } from "../../domain/dtos/request/erp-inventory-query.dto";
import { ErpInventoryUseCase, ErpInventoryVisibilityError } from "../../domain/use-cases/erp-inventory.use-case";
import { PrismaErpWarehouseDatasource } from "../../infrastructure/datasources/prisma-erp-warehouse.datasource";
import { ErpInventoryAdapter, ErpInventoryGatewayError } from "../../infrastructure/http/erp-inventory.adapter";
import { ErpWarehouseRepositoryImpl } from "../../infrastructure/repositories/erp-warehouse.repository-impl";
import { PrismaErpInventoryVisibilityRepository } from "../../infrastructure/repositories/prisma-erp-inventory-visibility.repository";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";

export function erpInventoryRoutes(): Router {
  const router = Router();
  const inventory = new ErpInventoryUseCase(
    new ErpInventoryAdapter(Envs.erpApiUrl, Envs.erpProductsBasePath, Envs.erpApiTimeoutMs, Envs.erpInternalApiKey),
    new ErpWarehouseRepositoryImpl(new PrismaErpWarehouseDatasource()),
    new PrismaErpInventoryVisibilityRepository(),
  );
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/settings", requireRoles("ADMIN"), async (_req, res) => {
    try { res.json(await inventory.settings()); }
    catch (error) {
      res.status(error instanceof ErpInventoryGatewayError ? error.status : 502).json({ error: "No se pudo cargar la configuración de inventario ERP." });
    }
  });
  router.put("/settings", requireRoles("ADMIN"), async (req, res) => {
    if (!req.user) return void res.status(401).json({ error: "Inicia sesión nuevamente." });
    let warehouseCodes;
    try { warehouseCodes = parseErpInventoryVisibility(req.body?.warehouseCodes); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    try { res.json(await inventory.updateSettings(warehouseCodes, req.user.id)); }
    catch (error) {
      const invalid = error instanceof ErpInventoryVisibilityError;
      res.status(invalid ? 400 : error instanceof ErpInventoryGatewayError ? error.status : 502).json({
        error: invalid ? error.message : "No se pudo guardar la configuración de inventario ERP.",
      });
    }
  });
  router.get("/warehouses", async (_req, res) => {
    try { res.json(await inventory.warehouses()); }
    catch (error) {
      res.status(error instanceof ErpInventoryGatewayError ? error.status : 502).json({ error: "No se pudieron consultar los almacenes del ERP. Intenta nuevamente." });
    }
  });
  router.get("/", async (req, res) => {
    let query;
    try { query = parseErpInventoryQuery(req.query); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    try { res.json(await inventory.list(query)); }
    catch (error) {
      res.status(error instanceof ErpInventoryGatewayError ? error.status : 502).json({
        error: error instanceof ErpInventoryGatewayError ? error.message : "No se pudo consultar el inventario del ERP. Intenta nuevamente.",
      });
    }
  });
  return router;
}
