import { HousingSearchQuery } from "@dive2026/shared";
import { getHousingById, searchHousing } from "./src/db/queries/housing";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  routes: {
    "/api/health": () => Response.json({ ok: true }),

    "/api/housing": async (req) => {
      const url = new URL(req.url);
      const query = HousingSearchQuery.parse(Object.fromEntries(url.searchParams));
      return Response.json(await searchHousing(query));
    },

    "/api/housing/:id": async (req) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return Response.json({ error: "invalid id" }, { status: 400 });
      const housing = await getHousingById(id);
      if (!housing) return Response.json({ error: "not found" }, { status: 404 });
      return Response.json(housing);
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`api listening on http://localhost:${server.port}`);
