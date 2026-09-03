import { Router, type Request, type Response } from "express";
import prisma from "../prisma.js";
import {
  autentifikacija,
  dozvoljenaUloga,
  type AuthRequest,
} from "../middleware/auth.js";

const router = Router();
const dermatolog = [autentifikacija, dozvoljenaUloga("DERMATOLOG")];

router.post(
  "/",
  ...dermatolog,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { terminId, dijagnoza, terapija, anamneza } = req.body;
    try {
      const novi = await prisma.izvestaj.create({
        data: {
          terminId: Number(terminId),
          dijagnoza,
          terapija,
          anamneza,
          dermatologId: req.zaposleni!.id,
        },
      });
      res.status(201).json(novi);
    } catch {
      res
        .status(400)
        .json({
          greska:
            "Neuspešan unos izveštaja (možda već postoji za ovaj termin).",
        });
    }
  },
);

router.get(
  "/termin/:terminId",
  autentifikacija,
  async (req: Request, res: Response): Promise<void> => {
    const izvestaj = await prisma.izvestaj.findUnique({
      where: { terminId: Number(req.params.terminId) },
      include: { dermatolog: { select: { ime: true, prezime: true } } },
    });
    if (!izvestaj) {
      res.status(404).json({ greska: "Izveštaj ne postoji." });
      return;
    }
    res.json(izvestaj);
  },
);

router.put(
  "/:id",
  ...dermatolog,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { dijagnoza, terapija, anamneza } = req.body;
    try {
      const postojeci = await prisma.izvestaj.findUnique({
        where: { id: Number(req.params.id) },
      });
      if (!postojeci) {
        res.status(404).json({ greska: "Izveštaj nije pronađen." });
        return;
      }
      if (postojeci.dermatologId !== req.zaposleni!.id) {
        res
          .status(403)
          .json({
            greska: "Možete izmeniti samo izveštaje koje ste sami uneli.",
          });
        return;
      }
      const izmenjen = await prisma.izvestaj.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(dijagnoza !== undefined && { dijagnoza }),
          ...(terapija !== undefined && { terapija }),
          ...(anamneza !== undefined && { anamneza }),
        },
      });
      res.json(izmenjen);
    } catch {
      res.status(400).json({ greska: "Neuspešna izmena izveštaja." });
    }
  },
);

router.delete(
  "/:id",
  ...dermatolog,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const postojeci = await prisma.izvestaj.findUnique({
        where: { id: Number(req.params.id) },
      });
      if (!postojeci) {
        res.status(404).json({ greska: "Izveštaj nije pronađen." });
        return;
      }
      if (postojeci.dermatologId !== req.zaposleni!.id) {
        res
          .status(403)
          .json({
            greska: "Možete obrisati samo izveštaje koje ste sami uneli.",
          });
        return;
      }
      await prisma.izvestaj.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Izveštaj obrisan." });
    } catch {
      res.status(400).json({ greska: "Neuspešno brisanje izveštaja." });
    }
  },
);

router.get(
  "/pacijent/:pacijentId",
  autentifikacija,
  async (req: Request, res: Response): Promise<void> => {
    const izvestaji = await prisma.izvestaj.findMany({
      where: { termin: { pacijentId: Number(req.params.pacijentId) } },
      include: {
        termin: {
          select: { datumVreme: true, usluga: { select: { naziv: true } } },
        },
        dermatolog: { select: { ime: true, prezime: true } },
      },
      orderBy: { kreiranoAt: "desc" },
    });
    res.json(izvestaji);
  },
);

router.get(
  "/statistika/mesecna",
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
