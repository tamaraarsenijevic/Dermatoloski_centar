import { Router, type Request, type Response } from "express";
import prisma from "../prisma.js";
import { autentifikacija } from "../middleware/auth.js";

const router = Router();
router.get(
  "/mesecna",
  autentifikacija,
  async (req: Request, res: Response): Promise<void> => {
    const { mesec, godina } = req.query;
    const pocetak = new Date(Number(godina), Number(mesec) - 1, 1);
    const kraj = new Date(Number(godina), Number(mesec), 0, 23, 59, 59);
    const brojTermina = await prisma.termin.count({
      where: { datumVreme: { gte: pocetak, lte: kraj } },
    });
    const izvrsene = await prisma.izvrsenaUsluga.findMany({
      where: { datum: { gte: pocetak, lte: kraj } },
      include: { usluga: true },
    });
    res.json({
      brojTermina,
      brojIzvrsenihUsluga: izvrsene.length,
      ukupanPrihod: izvrsene.reduce((sum, item) => sum + item.usluga.cena, 0),
    });
  },
);
export default router;
