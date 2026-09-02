import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import prisma from "../prisma.js";
import { config } from "../config.js";
import { autentifikacija, type AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
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
    if (!(await bcrypt.compare(lozinka, zaposleni.lozinka))) {
      res.status(400).json({ greska: "Pogrešna lozinka." });
      return;
    }
    const token = jwt.sign(
      { id: zaposleni.id, uloga: zaposleni.uloga, email: zaposleni.email },
      config.jwtSecret(),
      { expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"] },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: config.cookieMaxAgeMs,
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
  } catch {
    res.status(500).json({ greska: "Greška pri prijavi." });
  }
});

router.get(
  "/me",
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

router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ poruka: "Uspešno ste se odjavili." });
});

export default router;
