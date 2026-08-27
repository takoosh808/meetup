import cors from "cors";
import "dotenv/config";
import express from "express";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  const app = createApp();
  app.listen(port, () => {
    console.log(`meetup-api listening on port ${port}`);
  });
}
