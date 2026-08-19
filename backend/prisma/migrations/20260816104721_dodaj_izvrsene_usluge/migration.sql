/*
  Warnings:

  - You are about to drop the column `datumRodj` on the `Pacijent` table. All the data in the column will be lost.
  - Made the column `jmbg` on table `Pacijent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `telefon` on table `Zaposleni` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Pacijent" DROP COLUMN "datumRodj",
ALTER COLUMN "jmbg" SET NOT NULL,
ALTER COLUMN "telefon" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Zaposleni" ADD COLUMN     "aktivan" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "telefon" SET NOT NULL,
ALTER COLUMN "uloga" DROP DEFAULT;

-- CreateTable
CREATE TABLE "IzvrsenaUsluga" (
    "id" SERIAL NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pacijentId" INTEGER NOT NULL,
    "dermatologId" INTEGER NOT NULL,
    "uslugaId" INTEGER NOT NULL,

    CONSTRAINT "IzvrsenaUsluga_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IzvrsenaUsluga" ADD CONSTRAINT "IzvrsenaUsluga_pacijentId_fkey" FOREIGN KEY ("pacijentId") REFERENCES "Pacijent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IzvrsenaUsluga" ADD CONSTRAINT "IzvrsenaUsluga_dermatologId_fkey" FOREIGN KEY ("dermatologId") REFERENCES "Zaposleni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IzvrsenaUsluga" ADD CONSTRAINT "IzvrsenaUsluga_uslugaId_fkey" FOREIGN KEY ("uslugaId") REFERENCES "Usluga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
