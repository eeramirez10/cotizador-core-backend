import { Request, Response } from "express";
import { Envs } from "../../config/envs";

export class SystemController {
  capabilities = (_req: Request, res: Response): void => {
    res.status(200).json({
      quoteInternalApprovalEnabled: Envs.quoteInternalApprovalEnabled,
      requisitionInternalApprovalEnabled: Envs.requisitionInternalApprovalEnabled,
    });
  };
}
