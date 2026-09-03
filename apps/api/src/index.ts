import cors from "cors";
import "dotenv/config";
import express from "express";
import { authRouter } from "./auth/routes";
import { ensureSchema } from "./db";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);

  return app;
}

if (require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  const app = createApp();
  ensureSchema()
    .then(() => {
      app.listen(port, () => {
        console.log(`meetup-api listening on port ${port}`);
      });
    })
    .catch((err) => {
      console.error("Failed to initialize database schema", err);
      process.exit(1);
    });
}
