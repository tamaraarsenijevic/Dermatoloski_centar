import { Router, type Request, type Response } from "express";
import prisma from "../prisma.js";
import { autentifikacija, dozvoljenaUloga } from "../middleware/auth.js";

const router = Router();
const dermatolog = [autentifikacija, dozvoljenaUloga("DERMATOLOG")];

router.get(
  "/",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    const pretraga = req.query.pretraga as string | undefined;
    const where = pretraga
      ? {
          OR: [
            { ime: { contains: pretraga, mode: "insensitive" as const } },
            { prezime: { contains: pretraga, mode: "insensitive" as const } },
            { jmbg: { contains: pretraga } },
          ],
        }
      : {};
    const pacijenti = await prisma.pacijent.findMany({
      where,
      orderBy: { kreiranoAt: "desc" },
    });
    res.json(pacijenti);
  },
);

router.post(
  "/",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    const { ime, prezime, jmbg, telefon, email, napomena } = req.body;
    try {
      const novPacijent = await prisma.pacijent.create({
        data: { ime, prezime, jmbg, telefon, email, napomena },
      });
      res.status(201).json(novPacijent);
    } catch {
      res
        .status(400)
        .json({ greska: "JMBG već postoji ili su podaci neispravni." });
    }
  },
);

router.get(
  "/:id",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pacijent = await prisma.pacijent.findUnique({
        where: { id: Number(req.params.id) },
      });
      if (!pacijent) {
        res.status(404).json({ greska: "Pacijent nije pronađen." });
        return;
      }
      res.json(pacijent);
    } catch {
      res.status(500).json({ greska: "Greška pri učitavanju pacijenta." });
    }
  },
);

router.put(
  "/:id",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    const { ime, prezime, jmbg, telefon, email, napomena } = req.body;
    try {
      const izmenjen = await prisma.pacijent.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(ime !== undefined && { ime }),
          ...(prezime !== undefined && { prezime }),
          ...(jmbg !== undefined && { jmbg }),
          ...(telefon !== undefined && { telefon }),
          ...(email !== undefined && { email }),
          ...(napomena !== undefined && { napomena }),
        },
      });
      res.json(izmenjen);
    } catch {
      res
        .status(400)
        .json({ greska: "Neuspešna izmena (JMBG možda već postoji)." });
    }
  },
);

router.delete(
  "/:id",
  ...dermatolog,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.pacijent.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Pacijent obrisan." });
    } catch {
      res
        .status(400)
        .json({
          greska:
            "Neuspešno brisanje (pacijent ima povezane termine/izveštaje).",
        });
    }
  },
);

export default router;
