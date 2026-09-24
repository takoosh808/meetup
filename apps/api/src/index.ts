import cors from "cors";
import "dotenv/config";
import express from "express";
import { authRouter } from "./auth/routes";
import { checkDatabaseConnection, ensureSchema } from "./db";
import { sessionRouter } from "./sessions/routes";
import { notificationRouter } from "./notifications/routes";
import { communityRouter } from "./community/routes";

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/readyz", async (_req, res) => {
    try {
      await checkDatabaseConnection();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "not_ready" });
    }
  });

  app.use("/auth", authRouter);
  app.use("/sessions", sessionRouter);
  app.use("/notifications", notificationRouter);
  app.use("/community", communityRouter);

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
