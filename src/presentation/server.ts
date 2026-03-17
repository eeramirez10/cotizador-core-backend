import "dotenv/config";
import cors from "cors";
import express from "express";
import { Envs } from "../config/envs";
import { AppRoutes } from "./app-routes";

const app = express();

app.use(
  cors({
    exposedHeaders: ["Content-Disposition", "Content-Type"],
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", AppRoutes.routes());

app.listen(Envs.port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`cotizador-core-backend running on http://localhost:${Envs.port}`);
});
