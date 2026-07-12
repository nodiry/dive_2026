import { HousingSearchQuery, LifestyleRecommendationRequest } from "@dive2026/shared";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { getHousingById, searchHousing } from "./src/db/queries/housing";
import { listPoiCategories } from "./src/db/queries/poi";
import { recommendLifestyle } from "./src/db/queries/recommendations";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// client/ runs on a different origin (Vite dev server) — needed from day one of frontend work.
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Express 5 forwards rejected promises from async handlers to error middleware automatically.
app.get("/api/housing", async (req, res) => {
  const query = HousingSearchQuery.parse(req.query);
  res.json(await searchHousing(query));
});

app.get("/api/housing/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const housing = await getHousingById(id);
  if (!housing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(housing);
});

app.post("/api/recommendations/lifestyle", async (req, res) => {
  const body = LifestyleRecommendationRequest.parse(req.body);
  res.json(await recommendLifestyle(body));
});

app.get("/api/poi/categories", async (_req, res) => {
  res.json(await listPoiCategories());
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "invalid request", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
