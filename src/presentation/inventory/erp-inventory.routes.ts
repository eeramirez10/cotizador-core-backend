import { Router } from "express";
import { Envs } from "../../config/envs";
import { parseErpInventoryQuery } from "../../domain/dtos/request/erp-inventory-query.dto";
import { ErpInventoryUseCase } from "../../domain/use-cases/erp-inventory.use-case";
import { PrismaErpWarehouseDatasource } from "../../infrastructure/datasources/prisma-erp-warehouse.datasource";
import { ErpInventoryAdapter, ErpInventoryGatewayError } from "../../infrastructure/http/erp-inventory.adapter";
import { ErpWarehouseRepositoryImpl } from "../../infrastructure/repositories/erp-warehouse.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";

export function erpInventoryRoutes(): Router {
  const router = Router();
  const inventory = new ErpInventoryUseCase(
    new ErpInventoryAdapter(Envs.erpApiUrl, Envs.erpProductsBasePath, Envs.erpApiTimeoutMs, Envs.erpInternalApiKey),
    new ErpWarehouseRepositoryImpl(new PrismaErpWarehouseDatasource()),
  );
  router.use(requireAuth);
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
