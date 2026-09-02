import { Router, type Request, type Response } from "express";
import prisma from "../prisma.js";
import { autentifikacija, dozvoljenaUloga } from "../middleware/auth.js";

const router = Router();
router.get(
  "/",
  autentifikacija,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(await prisma.usluga.findMany());
  },
);

router.post(
  "/",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    const { naziv, opis, trajanjeMin, cena } = req.body as {
      naziv?: string;
      opis?: string;
      trajanjeMin?: number;
      cena?: number;
    };
    if (!naziv || cena === undefined) {
      res.status(400).json({ greska: "Naziv i cena su obavezni." });
      return;
    }
    try {
      res.status(201).json(
        await prisma.usluga.create({
          data: {
            naziv,
            opis,
            trajanjeMin: trajanjeMin ?? 30,
            cena: Number(cena),
          },
        }),
      );
    } catch {
      res.status(400).json({ greska: "Neuspešno kreiranje usluge." });
    }
  },
);

router.put(
  "/:id",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    const { naziv, opis, trajanjeMin, cena } = req.body;
    try {
      res.json(
        await prisma.usluga.update({
          where: { id: Number(req.params.id) },
          data: {
            ...(naziv !== undefined && { naziv }),
            ...(opis !== undefined && { opis }),
            ...(trajanjeMin !== undefined && { trajanjeMin }),
            ...(cena !== undefined && { cena: Number(cena) }),
          },
        }),
      );
    } catch {
      res.status(400).json({ greska: "Neuspešna izmena usluge." });
    }
  },
);

router.delete(
  "/:id",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.usluga.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Usluga obrisana." });
    } catch {
      res
        .status(400)
        .json({ greska: "Neuspešno brisanje (možda ima povezane termine)." });
    }
  },
);

export default router;
