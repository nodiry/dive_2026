-- Core schema. Idempotent (safe to re-run) so `bun run migrate` can just replay
-- every file in this folder in order — no migration-tracking table needed at
-- this stage of the project.
--
-- Design note: housing programs (매입임대/재개발임대/통합공공임대/행복주택) each
-- segment price by a different dimension (income bracket, supply class,
-- protection class, or unit rank). Rather than one rigid column per program,
-- `housing_price.segment` holds whichever fields apply as jsonb — see
-- docs/DATA_MODEL.md for the exact key names used per housing type.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS housing_project (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('purchased', 'redevelopment', 'integrated', 'happy')),
  project_name  TEXT NOT NULL,
  address       TEXT NOT NULL,
  geom          GEOGRAPHY(Point, 4326),
  built_date    DATE,
  total_units   INTEGER,
  source_district TEXT, -- 수영구/기장군/... — sample-data scope marker, drop once full dataset lands
  UNIQUE (type, project_name, address)
);

CREATE INDEX IF NOT EXISTS housing_project_geom_idx ON housing_project USING GIST (geom);
CREATE INDEX IF NOT EXISTS housing_project_type_idx ON housing_project (type);

CREATE TABLE IF NOT EXISTS housing_unit (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES housing_project(id) ON DELETE CASCADE,
  dong          TEXT,
  ho            TEXT,
  room_count    INTEGER,
  area_m2       NUMERIC,
  has_elevator  BOOLEAN,
  parking_spots INTEGER
);

CREATE INDEX IF NOT EXISTS housing_unit_project_idx ON housing_unit (project_id);

CREATE TABLE IF NOT EXISTS housing_price (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES housing_project(id) ON DELETE CASCADE,
  unit_type     TEXT, -- 주택형, e.g. "39A"
  deposit       NUMERIC,
  rent          NUMERIC,
  segment       JSONB, -- income bracket / household size / supply class / protection class / rank
  registered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS housing_price_project_idx ON housing_price (project_id);
CREATE INDEX IF NOT EXISTS housing_price_deposit_idx ON housing_price (deposit);

-- Sundosoft GIS layers — tables exist so the API/recommendation layer can be
-- built against the schema now. Empty until real SHP samples are sourced
-- (see PLAN.md — pending manual download from vworld/data.go.kr/sgis).

CREATE TABLE IF NOT EXISTS commercial_poi (
  id            SERIAL PRIMARY KEY,
  category      TEXT NOT NULL, -- see PoiCategory in packages/shared
  category_name TEXT,
  biz_name      TEXT,
  geom          GEOGRAPHY(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS commercial_poi_geom_idx ON commercial_poi USING GIST (geom);
CREATE INDEX IF NOT EXISTS commercial_poi_category_idx ON commercial_poi (category);

CREATE TABLE IF NOT EXISTS industry_population_grid (
  id                SERIAL PRIMARY KEY,
  geom              GEOGRAPHY(Polygon, 4326) NOT NULL,
  industry_mix      JSONB,
  population_density NUMERIC
);

CREATE INDEX IF NOT EXISTS industry_population_grid_geom_idx ON industry_population_grid USING GIST (geom);

CREATE TABLE IF NOT EXISTS commercial_zone (
  id        SERIAL PRIMARY KEY,
  geom      GEOGRAPHY(Polygon, 4326) NOT NULL,
  zone_type TEXT
);

CREATE INDEX IF NOT EXISTS commercial_zone_geom_idx ON commercial_zone USING GIST (geom);
