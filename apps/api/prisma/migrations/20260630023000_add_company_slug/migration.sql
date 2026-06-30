ALTER TABLE "Company" ADD COLUMN "slug" TEXT;

WITH normalized_companies AS (
  SELECT
    "id",
    lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) AS "baseSlug"
  FROM "Company"
),
numbered_companies AS (
  SELECT
    "id",
    CASE
      WHEN "baseSlug" IS NULL OR "baseSlug" = '' THEN "id"
      WHEN row_number() OVER (PARTITION BY "baseSlug" ORDER BY "id") = 1 THEN "baseSlug"
      ELSE "baseSlug" || '-' || row_number() OVER (PARTITION BY "baseSlug" ORDER BY "id")
    END AS "nextSlug"
  FROM normalized_companies
)
UPDATE "Company"
SET "slug" = numbered_companies."nextSlug"
FROM numbered_companies
WHERE "Company"."id" = numbered_companies."id";

UPDATE "Company"
SET "slug" = "id"
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "Company" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
