-- ============================================================
-- Migration v3: Normalize detection category/subcategory values
-- ============================================================
-- Enforced standard:
--   category:    person | vehicle
--   subcategory: missing | criminal
-- ============================================================

-- 1. Rename the old subcategory value 'missing_person' → 'missing'
UPDATE detection
SET    subcategory = 'missing',
       updated_at  = NOW()
WHERE  subcategory = 'missing_person';

-- 2. Clear any other non-standard subcategory values
UPDATE detection
SET    subcategory = NULL,
       updated_at  = NOW()
WHERE  subcategory IS NOT NULL
  AND  subcategory NOT IN ('missing', 'criminal');

-- 3. Clear any non-standard category values (safety net)
--    This should not match anything, but protects against bad data.
UPDATE detection
SET    category   = 'person',
       updated_at = NOW()
WHERE  category NOT IN ('person', 'vehicle');

-- ============================================================
-- Verification: run these queries to confirm no invalid values
-- ============================================================

-- Should return only 'person' and 'vehicle':
-- SELECT DISTINCT category FROM detection;

-- Should return only 'missing', 'criminal', and NULL:
-- SELECT DISTINCT subcategory FROM detection;
