import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { Uloga } from "@prisma/client";
import prisma from "../prisma.js";
import {
  autentifikacija,
  dozvoljenaUloga,
  type AuthRequest,
} from "../middleware/auth.js";

const router = Router();
const admin = [autentifikacija, dozvoljenaUloga("ADMIN")];
const validacijaLozinke = (lozinka: string) =>
  lozinka.length >= 8 && /[A-Za-z]/.test(lozinka) && /\d/.test(lozinka);
const validacijaTelefona = (telefon: string) =>
  telefon.trim().length >= 3 &&
  /\d/.test(telefon) &&
  !/[A-Za-z]/.test(telefon) &&
  /^[0-9+\s\-\/()]+$/.test(telefon.trim());

router.get(
  "/",
  ...admin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await prisma.zaposleni.findMany({
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
      }),
    );
  },
);

router.post(
  "/",
  ...admin,
  async (req: Request, res: Response): Promise<void> => {
    const { ime, prezime, email, telefon, lozinka, uloga } = req.body as {
      ime?: string;
      prezime?: string;
      email?: string;
      telefon?: string;
      lozinka?: string;
      uloga?: Uloga;
    };
    const imeTrim = ime?.trim(),
      prezimeTrim = prezime?.trim(),
      emailTrim = email?.trim(),
      telefonTrim = telefon?.trim(),
      lozinkaTrim = lozinka?.trim();
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
      res
        .status(400)
        .json({
          greska:
            "Broj telefona mora da sadrži samo cifre, razmake i opciono +, - ili /.",
        });
      return;
    }
    if (!validacijaLozinke(lozinkaTrim)) {
      res
        .status(400)
        .json({
          greska:
            "Lozinka mora imati najmanje 8 karaktera, bar jedno slovo i bar jedan broj.",
        });
      return;
    }
    try {
      res
        .status(201)
        .json(
          await prisma.zaposleni.create({
            data: {
              ime: imeTrim,
              prezime: prezimeTrim,
              email: emailTrim,
              telefon: telefonTrim,
              lozinka: await bcrypt.hash(lozinkaTrim, 10),
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
          }),
        );
    } catch {
      res
        .status(400)
        .json({ greska: "Email već postoji ili su podaci neispravni." });
    }
  },
);

router.put(
  "/:id",
  ...admin,
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
      res.json(
        await prisma.zaposleni.update({
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
        }),
      );
    } catch {
      res.status(400).json({ greska: "Neuspešna izmena." });
    }
  },
);

router.delete(
  "/:id",
  ...admin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const force = req.query.force === "true";
    try {
      const broj = await prisma.termin.count({
        where: { dermatologId: id, status: "ZAKAZANO" },
      });
      if (!force) {
        res
          .status(409)
          .json({
            kod: broj > 0 ? "ZAKAZANI_TERMINI" : "POTVRDA_BRISANJA",
            brojTermina: broj,
            greska:
              broj > 0
                ? "Dermatolog ima zakazane termine koji nisu završeni."
                : "Potrebna je potvrda brisanja dermatologa.",
          });
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.izvrsenaUsluga.deleteMany({ where: { dermatologId: id } });
        await tx.izvestaj.deleteMany({ where: { dermatologId: id } });
        await tx.zaposleni.delete({ where: { id } });
      });
      res.json({ poruka: "Zaposleni uspešno obrisan." });
    } catch {
      res
        .status(400)
        .json({ greska: "Neuspešno brisanje (možda ima povezane termine)." });
    }
  },
);

export default router;
