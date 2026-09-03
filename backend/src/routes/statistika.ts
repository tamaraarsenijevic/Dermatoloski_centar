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
    const brojZavrsenihTermina = await prisma.termin.count({
      where: {
        datumVreme: { gte: pocetak, lte: kraj },
        status: "ZAVRSENO",
      },
    });
    const termini = await prisma.termin.findMany({
      where: { datumVreme: { gte: pocetak, lte: kraj } },
      select: { usluga: { select: { id: true, naziv: true } } },
    });
    const terminiPoUslugama = Object.values(
      termini.reduce<
        Record<number, { uslugaId: number; naziv: string; broj: number }>
      >((grupe, termin) => {
        const usluga = termin.usluga;
        const grupa = grupe[usluga.id] ?? {
          uslugaId: usluga.id,
          naziv: usluga.naziv,
          broj: 0,
        };
        grupa.broj += 1;
        grupe[usluga.id] = grupa;
        return grupe;
      }, {}),
    ).sort((a, b) => b.broj - a.broj);
    const zavrseniTermini = await prisma.termin.findMany({
      where: {
        datumVreme: { gte: pocetak, lte: kraj },
        status: "ZAVRSENO",
      },
      select: { usluga: { select: { cena: true } } },
    });
    res.json({
      brojTermina,
      brojZavrsenihTermina,
      terminiPoUslugama,
      brojIzvrsenihUsluga: zavrseniTermini.length,
      ukupanPrihod: zavrseniTermini.reduce(
        (sum, termin) => sum + termin.usluga.cena,
        0,
      ),
    });
  },
);
export default router;
