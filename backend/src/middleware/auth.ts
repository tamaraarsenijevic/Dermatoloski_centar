import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Uloga } from "@prisma/client";
import prisma from "../prisma.js";
import { config } from "../config.js";

export interface AuthenticatedUser {
  id: number;
  uloga: Uloga;
  email: string;
}

export interface AuthRequest extends Request {
  zaposleni?: AuthenticatedUser;
}

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
    const dekodiran = jwt.verify(
      token,
      config.jwtSecret(),
    ) as AuthenticatedUser;
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
  } catch {
    res.status(403).json({ greska: "Nevažeći token." });
  }
};

export const dozvoljenaUloga = (...uloge: Uloga[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.zaposleni || !uloge.includes(req.zaposleni.uloga)) {
      res.status(403).json({ greska: "Nemate dozvolu za ovu akciju." });
      return;
    }
    next();
  };
};
