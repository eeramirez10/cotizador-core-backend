import { Router } from "express";
import { AuthRoutes } from "./auth/auth.routes";
import { BranchesRoutes } from "./branches/branches.routes";
import { CustomersRoutes } from "./customers/customers.routes";
import { LocalProductsRoutes } from "./local-products/local-products.routes";
import { ProductsRoutes } from "./products/products.routes";
import { QuotesRoutes } from "./quotes/quotes.routes";
import { UsersRoutes } from "./users/users.routes";
import { AnalyticsRoutes } from "./analytics/analytics.routes";
import { QuoteCatalogsRoutes } from "./quote-catalogs/quote-catalogs.routes";
import { PurchaseRequisitionsRoutes } from "./purchase-requisitions/purchase-requisitions.routes";
import { SystemRoutes } from "./system/system.routes";

export class AppRoutes {
  public static routes(): Router {
    const router = Router();

    router.get("/health", (_req, res) => {
      res.status(200).json({ ok: true, service: "cotizador-core-backend" });
    });

    router.use("/auth", AuthRoutes.routes());
    router.use("/branches", BranchesRoutes.routes());
    router.use("/users", UsersRoutes.routes());
    router.use("/customers", CustomersRoutes.routes());
    router.use("/products", ProductsRoutes.routes());
    router.use("/local-products", LocalProductsRoutes.routes());
    router.use("/quotes", QuotesRoutes.routes());
    router.use("/analytics", AnalyticsRoutes.routes());
    router.use("/quote-catalogs", QuoteCatalogsRoutes.routes());
    router.use("/purchase-requisitions", PurchaseRequisitionsRoutes.routes());
    router.use("/system", SystemRoutes.routes());

    return router;
  }
}
