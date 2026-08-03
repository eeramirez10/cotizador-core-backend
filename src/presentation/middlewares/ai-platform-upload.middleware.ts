import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { Envs } from "../../config/envs";

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: Envs.aiPlatformMaxUploadMb * 1024 * 1024,
    fields: 20,
  },
});

export const uploadSingleAiDocument = (req: Request, res: Response, next: NextFunction): void => {
  uploader.single("file")(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: `Document exceeds the ${Envs.aiPlatformMaxUploadMb} MB limit.` });
      return;
    }
    const message = error instanceof Error ? error.message : "Unable to receive document.";
    res.status(400).json({ error: message });
  });
};
