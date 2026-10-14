-- Interim photo storage: a data: URL (base64, client-compressed to ~<=3MB)
-- stored directly on the report row. Vercel Blob is the right home for this
-- long-term; the account's Blob storage was unavailable (usage threshold)
-- when this was built, so Postgres is the pragmatic stand-in for now.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_data_url text;
