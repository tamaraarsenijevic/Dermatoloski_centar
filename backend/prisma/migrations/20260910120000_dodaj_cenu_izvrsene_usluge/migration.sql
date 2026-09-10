ALTER TABLE "IzvrsenaUsluga" ADD COLUMN "cena" DOUBLE PRECISION;

UPDATE "IzvrsenaUsluga" AS "izvrsena"
SET "cena" = "usluga"."cena"
FROM "Usluga" AS "usluga"
WHERE "izvrsena"."uslugaId" = "usluga"."id";

ALTER TABLE "IzvrsenaUsluga" ALTER COLUMN "cena" SET NOT NULL;