-- NETBACK live operations schema.
-- Mirrors the OperationsState shape in lib/operations/model.ts so the
-- existing pure-function workflow validation (applyCommand) can keep
-- operating on in-memory objects; this just persists them.

CREATE TABLE IF NOT EXISTS vessels (
  id text PRIMARY KEY,
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  max_depth double precision NOT NULL,
  max_wave double precision NOT NULL,
  gear text[] NOT NULL,
  speed double precision NOT NULL,
  hourly_cost double precision NOT NULL,
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  revision integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  gear text NOT NULL,
  notes text NOT NULL DEFAULT '',
  reported_at timestamptz NOT NULL DEFAULT now(),
  stage text NOT NULL DEFAULT 'REPORTED',
  review jsonb,
  assignment jsonb,
  outcome jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS reports_reported_at_idx ON reports (reported_at DESC);
CREATE INDEX IF NOT EXISTS reports_stage_idx ON reports (stage);
