-- Compensation/buyback request tracking for closed, successfully recovered
-- reports. Rate (KRW/kg) is entered by the admin at request time rather than
-- hardcoded, since the real buyback-program rate is a researched input, not
-- an engine constant.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS compensation jsonb;
