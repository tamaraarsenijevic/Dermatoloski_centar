-- CreateEnum
CREATE TYPE "Uloga" AS ENUM ('ADMIN', 'DERMATOLOG');

-- CreateEnum
CREATE TYPE "StatusTermina" AS ENUM ('ZAKAZANO', 'OTKAZANO', 'ZAVRSENO');

-- CreateTable
CREATE TABLE "Zaposleni" (
    "id" SERIAL NOT NULL,
    "ime" TEXT NOT NULL,
    "prezime" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lozinka" TEXT NOT NULL,
    "telefon" TEXT,
    "uloga" "Uloga" NOT NULL DEFAULT 'DERMATOLOG',
    "kreiranoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zaposleni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pacijent" (
    "id" SERIAL NOT NULL,
    "ime" TEXT NOT NULL,
    "prezime" TEXT NOT NULL,
    "jmbg" TEXT,
    "telefon" TEXT NOT NULL,
    "email" TEXT,
    "datumRodj" TIMESTAMP(3),
    "napomena" TEXT,
    "kreiranoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pacijent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usluga" (
    "id" SERIAL NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "trajanjeMin" INTEGER NOT NULL DEFAULT 30,
    "cena" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Usluga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Termin" (
    "id" SERIAL NOT NULL,
    "datumVreme" TIMESTAMP(3) NOT NULL,
    "status" "StatusTermina" NOT NULL DEFAULT 'ZAKAZANO',
    "napomena" TEXT,
    "kreiranoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dermatologId" INTEGER NOT NULL,
    "pacijentId" INTEGER NOT NULL,
    "uslugaId" INTEGER NOT NULL,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Izvestaj" (
    "id" SERIAL NOT NULL,
    "dijagnoza" TEXT NOT NULL,
    "terapija" TEXT,
    "anamneza" TEXT,
    "kreiranoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminId" INTEGER NOT NULL,
    "dermatologId" INTEGER NOT NULL,

    CONSTRAINT "Izvestaj_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zaposleni_email_key" ON "Zaposleni"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pacijent_jmbg_key" ON "Pacijent"("jmbg");

-- CreateIndex
CREATE UNIQUE INDEX "Izvestaj_terminId_key" ON "Izvestaj"("terminId");

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_dermatologId_fkey" FOREIGN KEY ("dermatologId") REFERENCES "Zaposleni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_pacijentId_fkey" FOREIGN KEY ("pacijentId") REFERENCES "Pacijent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_uslugaId_fkey" FOREIGN KEY ("uslugaId") REFERENCES "Usluga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Izvestaj" ADD CONSTRAINT "Izvestaj_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Izvestaj" ADD CONSTRAINT "Izvestaj_dermatologId_fkey" FOREIGN KEY ("dermatologId") REFERENCES "Zaposleni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
