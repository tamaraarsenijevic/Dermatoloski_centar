import { Router, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import {
  autentifikacija,
  dozvoljenaUloga,
  type AuthRequest,
} from "../middleware/auth.js";

export const dermatologImaPreklapanje = async (
  dermatologId: number,
  datumVreme: Date,
  trajanjeMin: number,
  izuzmiTerminId?: number,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> => {
  const pocetakNovog = datumVreme.getTime();
  const krajNovog = pocetakNovog + trajanjeMin * 60 * 1000;
  const postojeciTermini = await db.termin.findMany({
    where: {
      dermatologId,
      status: "ZAKAZANO",
      ...(izuzmiTerminId !== undefined && { id: { not: izuzmiTerminId } }),
    },
    include: { usluga: { select: { trajanjeMin: true } } },
  });
  return postojeciTermini.some((termin) => {
    const pocetak = termin.datumVreme.getTime();
    const kraj = pocetak + termin.usluga.trajanjeMin * 60 * 1000;
    return pocetakNovog < kraj && krajNovog > pocetak;
  });
};

const router = Router();
const dermatolog = [autentifikacija, dozvoljenaUloga("DERMATOLOG")];

router.get(
  "/",
  ...dermatolog,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const termini = await prisma.termin.findMany({
      where: { dermatologId: req.zaposleni!.id },
      include: {
        pacijent: true,
        dermatolog: { select: { ime: true, prezime: true } },
        usluga: true,
      },
      orderBy: { datumVreme: "asc" },
    });
    res.json(termini);
  },
);

router.post(
  "/",
  ...dermatolog,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { datumVreme, pacijentId, uslugaId, napomena } = req.body;
    try {
      const pocetak = new Date(datumVreme);
      const novTermin = await prisma.$transaction(
        async (tx) => {
          const usluga = await tx.usluga.findUnique({
            where: { id: Number(uslugaId) },
            select: { trajanjeMin: true },
          });
          if (Number.isNaN(pocetak.getTime()) || !usluga)
            throw new Error("NEISPRAVAN_TERMIN");
          if (
            await dermatologImaPreklapanje(
              req.zaposleni!.id,
              pocetak,
              usluga.trajanjeMin,
              undefined,
              tx,
            )
          )
            throw new Error("PREKLAPANJE_TERMINA");
          return tx.termin.create({
            data: {
              datumVreme: pocetak,
              pacijentId: Number(pacijentId),
              dermatologId: req.zaposleni!.id,
              uslugaId: Number(uslugaId),
              napomena,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res.status(201).json(novTermin);
    } catch (error) {
      if (error instanceof Error && error.message === "NEISPRAVAN_TERMIN") {
        res.status(400).json({ greska: "Datum ili usluga nisu ispravni." });
        return;
      }
      if (
        error instanceof Error &&
        (error.message === "PREKLAPANJE_TERMINA" ||
          (error as Prisma.PrismaClientKnownRequestError).code === "P2034")
      ) {
        res.status(409).json({
          greska: "Ne možete zakazati termin, u tom terminu je zakazan drugi.",
        });
        return;
      }
      res.status(400).json({ greska: "Neuspešno zakazivanje termina." });
    }
  },
);

router.put(
  "/:id",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { datumVreme, status, napomena } = req.body;
    try {
      const terminId = Number(id);
      const izmenjen = await prisma.$transaction(
        async (tx) => {
          const postojeci = await tx.termin.findUnique({
            where: { id: terminId },
            include: { usluga: { select: { trajanjeMin: true } } },
          });
          if (!postojeci) throw new Error("TERMIN_NIJE_PRONADJEN");
          const noviPocetak = datumVreme
            ? new Date(datumVreme)
            : postojeci.datumVreme;
          const noviStatus = status ?? postojeci.status;
          if (Number.isNaN(noviPocetak.getTime()))
            throw new Error("NEISPRAVAN_DATUM");
          if (
            noviStatus === "ZAKAZANO" &&
            (await dermatologImaPreklapanje(
              postojeci.dermatologId,
              noviPocetak,
              postojeci.usluga.trajanjeMin,
              terminId,
              tx,
            ))
          )
            throw new Error("PREKLAPANJE_TERMINA");
          const izmenjen = await tx.termin.update({
            where: { id: terminId },
            data: {
              ...(datumVreme && { datumVreme: noviPocetak }),
              ...(status && { status }),
              ...(napomena !== undefined && { napomena }),
            },
          });

          if (noviStatus === "ZAVRSENO" && postojeci.status !== "ZAVRSENO") {
            await tx.izvrsenaUsluga.create({
              data: {
                pacijentId: postojeci.pacijentId,
                uslugaId: postojeci.uslugaId,
                dermatologId: postojeci.dermatologId,
              },
            });
          }

          return izmenjen;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res.json(izmenjen);
    } catch (error) {
      if (error instanceof Error && error.message === "TERMIN_NIJE_PRONADJEN") {
        res.status(404).json({ greska: "Termin nije pronađen." });
        return;
      }
      if (error instanceof Error && error.message === "NEISPRAVAN_DATUM") {
        res.status(400).json({ greska: "Datum termina nije ispravan." });
        return;
      }
      if (
        error instanceof Error &&
        (error.message === "PREKLAPANJE_TERMINA" ||
          (error as Prisma.PrismaClientKnownRequestError).code === "P2034")
      ) {
        res.status(409).json({
          greska: "Ne možete zakazati termin, u tom terminu je zakazan drugi.",
        });
        return;
      }
      res.status(400).json({ greska: "Neuspešna izmena termina." });
    }
  },
);

router.delete(
  "/:id",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.termin.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Termin obrisan." });
    } catch {
      res.status(400).json({ greska: "Neuspešno brisanje termina." });
    }
  },
);

export default router;
