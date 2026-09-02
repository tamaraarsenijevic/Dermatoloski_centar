import { Router, type Request, type Response } from "express";
import {
  autentifikacija,
  dozvoljenaUloga,
  type AuthRequest,
} from "../middleware/auth.js";
import prisma from "../prisma.js";

const router = Router();
router.post(
  "/",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { pacijentId, uslugaId } = req.body;
    try {
      const nova = await prisma.izvrsenaUsluga.create({
        data: {
          pacijentId: Number(pacijentId),
          uslugaId: Number(uslugaId),
          dermatologId: req.zaposleni!.id,
        },
      });
      res.status(201).json(nova);
    } catch {
      res.status(400).json({ greska: "Neuspešan unos." });
    }
  },
);

router.get(
  "/",
  autentifikacija,
  async (req: Request, res: Response): Promise<void> => {
    const { od, do: doDatuma } = req.query;
    const where: any = {};
    if (od || doDatuma) {
      where.datum = {};
      if (od) where.datum.gte = new Date(od as string);
      if (doDatuma) where.datum.lte = new Date(doDatuma as string);
    }
    const usluge = await prisma.izvrsenaUsluga.findMany({
      where,
      include: {
        pacijent: { select: { ime: true, prezime: true } },
        dermatolog: { select: { ime: true, prezime: true } },
        usluga: true,
      },
      orderBy: { datum: "desc" },
    });
    res.json(usluge);
  },
);

export default router;
