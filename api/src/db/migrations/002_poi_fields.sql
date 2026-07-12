-- commercial_poi needs district for cheap pre-filtering before spatial radius
-- search (mirrors housing_project.source_district), and address for display/debugging.

ALTER TABLE commercial_poi ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE commercial_poi ADD COLUMN IF NOT EXISTS district TEXT;

CREATE INDEX IF NOT EXISTS commercial_poi_district_idx ON commercial_poi (district);
