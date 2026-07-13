-- admin_boundary (동 boundary polygons, vworld 행정구역도, link #1) and the
-- geometry type on commercial_zone both need MultiPolygon, not Polygon —
-- Busan's administrative/zoning boundaries include islands/exclaves that
-- shapefile-export as multipolygons. commercial_zone was defined as plain
-- Polygon in 001_init.sql before any real zoning data existed; fix it here
-- (table is still empty at this point, so the cast is free).

CREATE TABLE IF NOT EXISTS admin_boundary (
  id        SERIAL PRIMARY KEY,
  emd_code  TEXT NOT NULL,
  emd_name  TEXT,
  sgg_code  TEXT,
  geom      GEOGRAPHY(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_boundary_geom_idx ON admin_boundary USING GIST (geom);
CREATE INDEX IF NOT EXISTS admin_boundary_emd_code_idx ON admin_boundary (emd_code);

ALTER TABLE commercial_zone ALTER COLUMN geom TYPE GEOGRAPHY(MultiPolygon, 4326)
  USING ST_Multi(geom::geometry)::geography;

CREATE TABLE IF NOT EXISTS building (
  id         SERIAL PRIMARY KEY,
  buld_name  TEXT,
  emd_code   TEXT,
  geom       GEOGRAPHY(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS building_geom_idx ON building USING GIST (geom);
CREATE INDEX IF NOT EXISTS building_name_idx ON building (buld_name);
