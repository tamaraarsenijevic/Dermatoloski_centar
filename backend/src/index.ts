import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import prisma from "./prisma.js";
import { Prisma, Uloga } from "@prisma/client";

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = () => process.env.JWT_SECRET || "tajna_sifra_dermatologija";

const validacijaLozinke = (lozinka: string): boolean => {
  return lozinka.length >= 8 && /[A-Za-z]/.test(lozinka) && /\d/.test(lozinka);
};

const validacijaTelefona = (telefon: string): boolean => {
  const telefonTrim = telefon.trim();
  return (
    telefonTrim.length >= 3 &&
    /\d/.test(telefonTrim) &&
    !/[A-Za-z]/.test(telefonTrim) &&
    /^[0-9+\s\-\/()]+$/.test(telefonTrim)
  );
};

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Interfejs za dekodiran JWT
export interface AuthenticatedUser {
  id: number;
  uloga: Uloga;
  email: string;
}

// Proširenje Express Request objekta
export interface AuthRequest extends Request {
  zaposleni?: AuthenticatedUser;
}

// Middleware za autentifikaciju
export const autentifikacija = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ greska: "Niste autorizovani." });
    return;
  }

  try {
    const dekodiran = jwt.verify(token, JWT_SECRET()) as AuthenticatedUser;
    const zaposleni = await prisma.zaposleni.findUnique({
      where: { id: dekodiran.id },
      select: { aktivan: true },
    });

    if (!zaposleni || !zaposleni.aktivan) {
      res.status(401).json({ greska: "Nalog je deaktiviran." });
      return;
    }

    req.zaposleni = dekodiran;
    next();
  } catch (err) {
    res.status(403).json({ greska: "Nevažeći token." });
  }
};

// Middleware za proveru uloge
export const dozvoljenaUloga = (...uloge: Uloga[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.zaposleni || !uloge.includes(req.zaposleni.uloga)) {
      res.status(403).json({ greska: "Nemate dozvolu za ovu akciju." });
      return;
    }
    next();
  };
};

// ==================== AUTH RUTE ====================

// 1. RUTA: Login
app.post(
  "/api/auth/login",
  async (req: Request, res: Response): Promise<void> => {
    const { email, lozinka } = req.body as { email?: string; lozinka?: string };

    if (!email || !lozinka) {
      res.status(400).json({ greska: "Email i lozinka su obavezni." });
      return;
    }

    try {
      const zaposleni = await prisma.zaposleni.findUnique({ where: { email } });
      if (!zaposleni) {
        res.status(404).json({ greska: "Korisnik nije pronađen." });
        return;
      }

      if (!zaposleni.aktivan) {
        res.status(403).json({ greska: "Nalog je deaktiviran." });
        return;
      }

      const tacnaLozinka = await bcrypt.compare(lozinka, zaposleni.lozinka);
      if (!tacnaLozinka) {
        res.status(400).json({ greska: "Pogrešna lozinka." });
        return;
      }

      const token = jwt.sign(
        { id: zaposleni.id, uloga: zaposleni.uloga, email: zaposleni.email },
        JWT_SECRET(),
        { expiresIn: "8h" },
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000,
      });

      res.json({
        zaposleni: {
          id: zaposleni.id,
          ime: zaposleni.ime,
          prezime: zaposleni.prezime,
          email: zaposleni.email,
          telefon: zaposleni.telefon,
          uloga: zaposleni.uloga,
          aktivan: zaposleni.aktivan,
        },
      });
    } catch (error) {
      res.status(500).json({ greska: "Greška pri prijavi." });
    }
  },
);

// Provera ko je trenutno ulogovan (za refresh stranice)
app.get(
  "/api/auth/me",
  autentifikacija,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const zaposleni = await prisma.zaposleni.findUnique({
      where: { id: req.zaposleni!.id },
      select: {
        id: true,
        ime: true,
        prezime: true,
        email: true,
        telefon: true,
        uloga: true,
        aktivan: true,
      },
    });

    if (!zaposleni) {
      res.status(404).json({ greska: "Korisnik nije pronađen." });
      return;
    }

    res.json({ zaposleni });
  },
);

// Logout
app.post("/api/auth/logout", (req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ poruka: "Uspešno ste se odjavili." });
});

// ==================== USLUGE ====================

app.get(
  "/api/usluge",
  autentifikacija,
  async (_req: Request, res: Response): Promise<void> => {
    const usluge = await prisma.usluga.findMany();
    res.json(usluge);
  },
);

// ==================== PACIJENTI ====================

app.get(
  "/api/pacijenti",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
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

app.post(
  "/api/pacijenti",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: Request, res: Response): Promise<void> => {
    const { ime, prezime, jmbg, telefon, email, napomena } = req.body;
    try {
      const novPacijent = await prisma.pacijent.create({
        data: { ime, prezime, jmbg, telefon, email, napomena },
      });
      res.status(201).json(novPacijent);
    } catch (error) {
      res
        .status(400)
        .json({ greska: "JMBG već postoji ili su podaci neispravni." });
    }
  },
);

app.get(
  "/api/pacijenti/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ greska: "Greška pri učitavanju pacijenta." });
    }
  },
);

app.put(
  "/api/pacijenti/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
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
    } catch (error) {
      console.error(error);
      res
        .status(400)
        .json({ greska: "Neuspešna izmena (JMBG možda već postoji)." });
    }
  },
);

app.delete(
  "/api/pacijenti/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.pacijent.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Pacijent obrisan." });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        greska: "Neuspešno brisanje (pacijent ima povezane termine/izveštaje).",
      });
    }
  },
);

// ==================== TERMINI ====================

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
    const pocetakPostojeceg = termin.datumVreme.getTime();
    const krajPostojeceg =
      pocetakPostojeceg + termin.usluga.trajanjeMin * 60 * 1000;
    return pocetakNovog < krajPostojeceg && krajNovog > pocetakPostojeceg;
  });
};

app.get(
  "/api/termini",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
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

app.post(
  "/api/termini",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { datumVreme, pacijentId, uslugaId, napomena } = req.body;
    const dermatologId = req.zaposleni!.id;
    try {
      const pocetak = new Date(datumVreme);
      const novTermin = await prisma.$transaction(
        async (tx) => {
          const usluga = await tx.usluga.findUnique({
            where: { id: Number(uslugaId) },
            select: { trajanjeMin: true },
          });

          if (Number.isNaN(pocetak.getTime()) || !usluga) {
            throw new Error("NEISPRAVAN_TERMIN");
          }

          if (
            await dermatologImaPreklapanje(
              Number(dermatologId),
              pocetak,
              usluga.trajanjeMin,
              undefined,
              tx,
            )
          ) {
            throw new Error("PREKLAPANJE_TERMINA");
          }

          return tx.termin.create({
            data: {
              datumVreme: pocetak,
              pacijentId: Number(pacijentId),
              dermatologId: Number(dermatologId),
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

// Izmena termina (pomeranje, promena statusa)
app.put(
  "/api/termini/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { datumVreme, status, napomena } = req.body;

    try {
      const terminId = Number(id);
      const izmenjen = await prisma.$transaction(
        async (tx) => {
          const postojeciTermin = await tx.termin.findUnique({
            where: { id: terminId },
            include: { usluga: { select: { trajanjeMin: true } } },
          });

          if (!postojeciTermin) throw new Error("TERMIN_NIJE_PRONADJEN");

          const noviPocetak = datumVreme
            ? new Date(datumVreme)
            : postojeciTermin.datumVreme;
          const noviStatus = status ?? postojeciTermin.status;

          if (Number.isNaN(noviPocetak.getTime())) {
            throw new Error("NEISPRAVAN_DATUM");
          }

          if (
            noviStatus === "ZAKAZANO" &&
            (await dermatologImaPreklapanje(
              postojeciTermin.dermatologId,
              noviPocetak,
              postojeciTermin.usluga.trajanjeMin,
              terminId,
              tx,
            ))
          ) {
            throw new Error("PREKLAPANJE_TERMINA");
          }

          return tx.termin.update({
            where: { id: terminId },
            data: {
              ...(datumVreme && { datumVreme: noviPocetak }),
              ...(status && { status }),
              ...(napomena !== undefined && { napomena }),
            },
          });
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

// Brisanje/otkazivanje termina
app.delete(
  "/api/termini/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.termin.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Termin obrisan." });
    } catch (error) {
      res.status(400).json({ greska: "Neuspešno brisanje termina." });
    }
  },
);

// ==================== IZVEŠTAJI (nalaz sa pregleda) ====================

// DERMATOLOG: Unos izveštaja/nalaza za termin
app.post(
  "/api/izvestaji",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { terminId, dijagnoza, terapija, anamneza } = req.body;

    try {
      const noviIzvestaj = await prisma.izvestaj.create({
        data: {
          terminId: Number(terminId),
          dijagnoza,
          terapija,
          anamneza,
          dermatologId: req.zaposleni!.id,
        },
      });
      res.status(201).json(noviIzvestaj);
    } catch (error) {
      res.status(400).json({
        greska: "Neuspešan unos izveštaja (možda već postoji za ovaj termin).",
      });
    }
  },
);

// Prikaz izveštaja za jedan termin
app.get(
  "/api/izvestaji/termin/:terminId",
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

// Izmena izveštaja - samo dermatolog koji ga je uneo
app.put(
  "/api/izvestaji/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
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
        res.status(403).json({
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
    } catch (error) {
      console.error(error);
      res.status(400).json({ greska: "Neuspešna izmena izveštaja." });
    }
  },
);

// Brisanje izveštaja - samo dermatolog koji ga je uneo
app.delete(
  "/api/izvestaji/:id",
  autentifikacija,
  dozvoljenaUloga("DERMATOLOG"),
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
        res.status(403).json({
          greska: "Možete obrisati samo izveštaje koje ste sami uneli.",
        });
        return;
      }

      await prisma.izvestaj.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Izveštaj obrisan." });
    } catch (error) {
      console.error(error);
      res.status(400).json({ greska: "Neuspešno brisanje izveštaja." });
    }
  },
);

// Istorija svih izveštaja jednog pacijenta
app.get(
  "/api/izvestaji/pacijent/:pacijentId",
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

// ==================== IZVRŠENE USLUGE ====================

// DERMATOLOG: Evidentiraj izvršenu uslugu
app.post(
  "/api/izvrsene-usluge",
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
    } catch (error) {
      res.status(400).json({ greska: "Neuspešan unos." });
    }
  },
);

// Lista izvršenih usluga (sa opcionim filterom po datumu)
app.get(
  "/api/izvrsene-usluge",
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

// ==================== STATISTIKA / IZVEŠTAJI ADMINISTRACIJE ====================

app.get(
  "/api/statistika/mesecna",
  autentifikacija,
  async (req: Request, res: Response): Promise<void> => {
    const { mesec, godina } = req.query;
    const pocetak = new Date(Number(godina), Number(mesec) - 1, 1);
    const kraj = new Date(Number(godina), Number(mesec), 0, 23, 59, 59);

    const brojTermina = await prisma.termin.count({
      where: { datumVreme: { gte: pocetak, lte: kraj } },
    });

    const izvrseneUsluge = await prisma.izvrsenaUsluga.findMany({
      where: { datum: { gte: pocetak, lte: kraj } },
      include: { usluga: true },
    });

    const ukupanPrihod = izvrseneUsluge.reduce(
      (sum: number, iu: (typeof izvrseneUsluge)[number]) =>
        sum + iu.usluga.cena,
      0,
    );

    res.json({
      brojTermina,
      brojIzvrsenihUsluga: izvrseneUsluge.length,
      ukupanPrihod,
    });
  },
);

// ==================== ZAPOSLENI (ADMIN) ====================

// ADMIN: Lista svih zaposlenih
app.get(
  "/api/zaposleni",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (_req: Request, res: Response): Promise<void> => {
    const zaposleni = await prisma.zaposleni.findMany({
      select: {
        id: true,
        ime: true,
        prezime: true,
        email: true,
        telefon: true,
        uloga: true,
        aktivan: true,
        kreiranoAt: true,
      },
      orderBy: { kreiranoAt: "desc" },
    });
    res.json(zaposleni);
  },
);

// ADMIN: Dodaj novog dermatologa
app.post(
  "/api/zaposleni",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    const { ime, prezime, email, telefon, lozinka, uloga } = req.body as {
      ime?: string;
      prezime?: string;
      email?: string;
      telefon?: string;
      lozinka?: string;
      uloga?: Uloga;
    };

    const imeTrim = ime?.trim();
    const prezimeTrim = prezime?.trim();
    const emailTrim = email?.trim();
    const telefonTrim = telefon?.trim();
    const lozinkaTrim = lozinka?.trim();

    if (
      !imeTrim ||
      !prezimeTrim ||
      !emailTrim ||
      !telefonTrim ||
      !lozinkaTrim ||
      !uloga
    ) {
      res.status(400).json({ greska: "Sva polja su obavezna." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      res.status(400).json({ greska: "Email adresa nije ispravna." });
      return;
    }

    if (!validacijaTelefona(telefonTrim)) {
      res.status(400).json({
        greska:
          "Broj telefona mora da sadrži samo cifre, razmake i opciono +, - ili /.",
      });
      return;
    }

    if (!validacijaLozinke(lozinkaTrim)) {
      res.status(400).json({
        greska:
          "Lozinka mora imati najmanje 8 karaktera, bar jedno slovo i bar jedan broj.",
      });
      return;
    }

    try {
      const hashovanaLozinka = await bcrypt.hash(lozinkaTrim, 10);
      const noviZaposleni = await prisma.zaposleni.create({
        data: {
          ime: imeTrim,
          prezime: prezimeTrim,
          email: emailTrim,
          telefon: telefonTrim,
          lozinka: hashovanaLozinka,
          uloga,
        },
        select: {
          id: true,
          ime: true,
          prezime: true,
          email: true,
          telefon: true,
          uloga: true,
          aktivan: true,
        },
      });
      res.status(201).json(noviZaposleni);
    } catch (error) {
      res
        .status(400)
        .json({ greska: "Email već postoji ili su podaci neispravni." });
    }
  },
);

// ADMIN: Izmeni zaposlenog (npr. deaktiviraj, promeni ulogu)
app.put(
  "/api/zaposleni/:id",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { ime, prezime, email, telefon, uloga, aktivan } = req.body;

    if (Number(id) === req.zaposleni!.id && aktivan === false) {
      res
        .status(400)
        .json({ greska: "Ne možete deaktivirati sopstveni nalog." });
      return;
    }

    try {
      const izmenjen = await prisma.zaposleni.update({
        where: { id: Number(id) },
        data: { ime, prezime, email, telefon, uloga, aktivan },
        select: {
          id: true,
          ime: true,
          prezime: true,
          email: true,
          telefon: true,
          uloga: true,
          aktivan: true,
        },
      });
      res.json(izmenjen);
    } catch (error) {
      res.status(400).json({ greska: "Neuspešna izmena." });
    }
  },
);

// ADMIN: Obriši zaposlenog
app.delete(
  "/api/zaposleni/:id",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const force = req.query.force === "true";
    try {
      const brojZakazanihTermina = await prisma.termin.count({
        where: {
          dermatologId: Number(id),
          status: "ZAKAZANO",
        },
      });

      if (!force) {
        res.status(409).json({
          kod:
            brojZakazanihTermina > 0 ? "ZAKAZANI_TERMINI" : "POTVRDA_BRISANJA",
          brojTermina: brojZakazanihTermina,
          greska:
            brojZakazanihTermina > 0
              ? "Dermatolog ima zakazane termine koji nisu završeni."
              : "Potrebna je potvrda brisanja dermatologa.",
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.izvrsenaUsluga.deleteMany({
          where: { dermatologId: Number(id) },
        });
        await tx.izvestaj.deleteMany({
          where: { dermatologId: Number(id) },
        });
        await tx.zaposleni.delete({ where: { id: Number(id) } });
      });
      res.json({ poruka: "Zaposleni uspešno obrisan." });
    } catch (error) {
      res
        .status(400)
        .json({ greska: "Neuspešno brisanje (možda ima povezane termine)." });
    }
  },
);

// ADMIN: Dodaj novu uslugu
app.post(
  "/api/usluge",
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
      const novaUsluga = await prisma.usluga.create({
        data: {
          naziv,
          opis,
          trajanjeMin: trajanjeMin ?? 30,
          cena: Number(cena),
        },
      });
      res.status(201).json(novaUsluga);
    } catch (error) {
      console.error(error);
      res.status(400).json({ greska: "Neuspešno kreiranje usluge." });
    }
  },
);

// ADMIN: Izmeni uslugu
app.put(
  "/api/usluge/:id",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    const { naziv, opis, trajanjeMin, cena } = req.body;

    try {
      const izmenjena = await prisma.usluga.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(naziv !== undefined && { naziv }),
          ...(opis !== undefined && { opis }),
          ...(trajanjeMin !== undefined && { trajanjeMin }),
          ...(cena !== undefined && { cena: Number(cena) }),
        },
      });
      res.json(izmenjena);
    } catch (error) {
      console.error(error);
      res.status(400).json({ greska: "Neuspešna izmena usluge." });
    }
  },
);

// ADMIN: Obriši uslugu
app.delete(
  "/api/usluge/:id",
  autentifikacija,
  dozvoljenaUloga("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.usluga.delete({ where: { id: Number(req.params.id) } });
      res.json({ poruka: "Usluga obrisana." });
    } catch (error) {
      console.error(error);
      res
        .status(400)
        .json({ greska: "Neuspešno brisanje (možda ima povezane termine)." });
    }
  },
);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Backend server radi na http://localhost:${PORT}`);
  });
}
