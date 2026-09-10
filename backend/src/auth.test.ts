import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  app,
  autentifikacija,
  dermatologImaPreklapanje,
  dozvoljenaUloga,
} from "./index";
import prisma from "./prisma";

vi.mock("./prisma", () => ({
  default: {
    zaposleni: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    pacijent: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    termin: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    usluga: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    izvestaj: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    izvrsenaUsluga: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("Backend auth and availability logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("unit: autentifikacija prihvata validan JWT i postavlja req.zaposleni", async () => {
    const mockedUser = { id: 7, aktivan: true };
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue(mockedUser as any);

    const req: any = {
      cookies: {
        token: jwt.sign(
          { id: 7, uloga: "DERMATOLOG", email: "doktor@test.com" },
          "test-secret",
        ),
      },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await autentifikacija(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.zaposleni).toMatchObject({
      id: 7,
      uloga: "DERMATOLOG",
      email: "doktor@test.com",
    });
  });

  it("unit: dozvoljenaUloga odbacuje korisnika bez dozvole", () => {
    const req: any = { zaposleni: { uloga: "ADMIN" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const middleware = dozvoljenaUloga("DERMATOLOG");
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("unit: dermatologImaPreklapanje detektuje preklapanje termina", async () => {
    vi.mocked(prisma.termin.findMany).mockResolvedValue([
      {
        datumVreme: new Date("2026-09-01T10:00:00Z"),
        usluga: { trajanjeMin: 30 },
      },
    ] as any);

    const result = await dermatologImaPreklapanje(
      1,
      new Date("2026-09-01T10:15:00Z"),
      30,
      undefined,
      { termin: prisma.termin } as any,
    );

    expect(result).toBe(true);
  });

  it("integracija: login vraća JWT cookie i korisnika", async () => {
    const hashedPassword = await bcrypt.hash("secret123", 10);
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 1,
      ime: "Petar",
      prezime: "Petrović",
      email: "petar@test.com",
      lozinka: hashedPassword,
      telefon: "060111222",
      uloga: "DERMATOLOG",
      aktivan: true,
    } as any);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "petar@test.com", lozinka: "secret123" })
      .expect(200);

    expect(response.body.zaposleni.email).toBe("petar@test.com");
    expect(response.headers["set-cookie"][0]).toContain("token=");
  });

  it("integracija: /api/auth/me vraća 401 bez tokena", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  it("integracija: /api/usluge vraća listu usluga", async () => {
    vi.mocked(prisma.usluga.findMany).mockResolvedValue([
      { id: 1, naziv: "Dermabrazija", trajanjeMin: 30, cena: 2500 },
    ] as any);

    const response = await request(app)
      .get("/api/usluge")
      .set("Cookie", [
        `token=${jwt.sign({ id: 1, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body[0].naziv).toBe("Dermabrazija");
  });

  it("integracija: /api/pacijenti vraća listu pacijenata za dermatologa", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 1,
      aktivan: true,
    } as any);
    vi.mocked(prisma.pacijent.findMany).mockResolvedValue([
      { id: 3, ime: "Lena", prezime: "Lukić", jmbg: "1203999876543" },
    ] as any);

    const response = await request(app)
      .get("/api/pacijenti")
      .query({ pretraga: "Lena" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 1, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body[0].ime).toBe("Lena");
  });

  it("integracija: /api/pacijenti dodaje novog pacijenta", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 2,
      aktivan: true,
    } as any);
    vi.mocked(prisma.pacijent.create).mockResolvedValue({
      id: 12,
      ime: "Jovana",
      prezime: "Jovanović",
      jmbg: "0101011234567",
      telefon: "061",
      email: "jovana@test.com",
      napomena: "Kontrola",
    } as any);

    const response = await request(app)
      .post("/api/pacijenti")
      .send({
        ime: "Jovana",
        prezime: "Jovanović",
        jmbg: "0101011234567",
        telefon: "061",
        email: "jovana@test.com",
        napomena: "Kontrola",
      })
      .set("Cookie", [
        `token=${jwt.sign({ id: 2, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(201);

    expect(response.body.ime).toBe("Jovana");
  });

  it("integracija: /api/termini kreira termin ako nema konflikta", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 5,
      aktivan: true,
    } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        usluga: { findUnique: vi.fn().mockResolvedValue({ trajanjeMin: 30 }) },
        termin: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({
            id: 99,
            datumVreme: "2026-09-02T10:00:00.000Z",
          }),
        },
      } as any;

      return callback(tx);
    });

    const response = await request(app)
      .post("/api/termini")
      .send({
        datumVreme: "2026-09-02T10:00:00.000Z",
        pacijentId: 8,
        uslugaId: 2,
        napomena: "Kontrola",
      })
      .set("Cookie", [
        `token=${jwt.sign({ id: 5, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(201);

    expect(response.body.id).toBe(99);
  });

  it("integracija: /api/statistika/mesecna vraća mesečni pregled", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 7,
      aktivan: true,
    } as any);
    vi.mocked(prisma.termin.count).mockResolvedValue(3);
    vi.mocked(prisma.izvrsenaUsluga.findMany).mockResolvedValue([
      { cena: 1500 },
      { cena: 2200 },
    ] as any);

    const response = await request(app)
      .get("/api/statistika/mesecna")
      .query({ mesec: 9, godina: 2026 })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.brojTermina).toBe(3);
    expect(response.body.ukupanPrihod).toBe(3700);
  });

  it("integracija: /api/zaposleni i /api/usluge admin endpoints rade", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 7,
      aktivan: true,
    } as any);
    vi.mocked(prisma.zaposleni.findMany).mockResolvedValue([
      {
        id: 1,
        ime: "Maja",
        prezime: "Majić",
        email: "maja@test.com",
        telefon: "060",
        uloga: "ADMIN",
        aktivan: true,
        kreiranoAt: new Date(),
      },
    ] as any);
    vi.mocked(prisma.zaposleni.create).mockResolvedValue({
      id: 9,
      ime: "Nikola",
      prezime: "Nikolić",
      email: "nikola@test.com",
      telefon: "061",
      uloga: "DERMATOLOG",
      aktivan: true,
    } as any);
    vi.mocked(prisma.usluga.create).mockResolvedValue({
      id: 10,
      naziv: "Kontrola",
      opis: "Pregled",
      trajanjeMin: 20,
      cena: 1800,
    } as any);

    const zaposleniResponse = await request(app)
      .get("/api/zaposleni")
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    const uslugaResponse = await request(app)
      .post("/api/usluge")
      .send({ naziv: "Kontrola", opis: "Pregled", trajanjeMin: 20, cena: 1800 })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(201);

    expect(zaposleniResponse.body[0].email).toBe("maja@test.com");
    expect(uslugaResponse.body.naziv).toBe("Kontrola");
  });

  it("login vraća 400 ako nedostaje email ili lozinka", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: "x@test.com" })
      .expect(400);
  });

  it("login vraća 404 ako korisnik ne postoji", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue(null);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "nepostoji@test.com", lozinka: "123" })
      .expect(404);
  });

  it("login vraća 403 ako je nalog deaktiviran", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 11,
      aktivan: false,
    } as any);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "deaktiviran@test.com", lozinka: "123" })
      .expect(403);
  });

  it("login vraća 400 ako je lozinka pogrešna", async () => {
    const hashed = await bcrypt.hash("tajna123", 10);
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 12,
      aktivan: true,
      lozinka: hashed,
    } as any);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "valid@test.com", lozinka: "netacna" })
      .expect(400);
  });

  it("/api/auth/me vraća 403 za nevažeći JWT token", async () => {
    await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["token=nevalid"])
      .expect(403);
  });

  it("/api/auth/me vraća 401 ako korisnik više ne postoji", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue(null);

    const token = jwt.sign(
      { id: 99, uloga: "DERMATOLOG", email: "missing@test.com" },
      "test-secret",
    );

    await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`token=${token}`])
      .expect(401);
  });

  it("/api/auth/logout briše cookie", async () => {
    const response = await request(app).post("/api/auth/logout").expect(200);
    expect(response.headers["set-cookie"][0]).toContain("token=");
  });

  it("/api/pacijenti/:id vraća 404 ako pacijent ne postoji", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 5,
      aktivan: true,
    } as any);
    vi.mocked(prisma.pacijent.findUnique).mockResolvedValue(null);

    await request(app)
      .get("/api/pacijenti/999")
      .set("Cookie", [
        `token=${jwt.sign({ id: 5, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(404);
  });

  it("/api/pacijenti/:id menja podatke pacijenta", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 5,
      aktivan: true,
    } as any);
    vi.mocked(prisma.pacijent.update).mockResolvedValue({
      id: 3,
      ime: "Lena",
      prezime: "Lukic",
      jmbg: "1111111111111",
      telefon: "062",
      email: "lena@test.com",
      napomena: "nova",
    } as any);

    const response = await request(app)
      .put("/api/pacijenti/3")
      .send({ ime: "Lena", prezime: "Lukic", jmbg: "1111111111111" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 5, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.prezime).toBe("Lukic");
  });

  it("/api/pacijenti/:id briše pacijenta", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 5,
      aktivan: true,
    } as any);
    vi.mocked(prisma.pacijent.delete).mockResolvedValue({ id: 7 } as any);

    await request(app)
      .delete("/api/pacijenti/7")
      .set("Cookie", [
        `token=${jwt.sign({ id: 5, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);
  });

  it("/api/termini vraća listu termina dermatologa", async () => {
    vi.mocked(prisma.termin.findMany).mockResolvedValue([
      {
        id: 1,
        datumVreme: new Date("2026-09-02T10:00:00Z"),
        status: "ZAKAZANO",
        pacijent: { ime: "Jovana" },
        dermatolog: { ime: "Dr", prezime: "Doktor" },
        usluga: { naziv: "Kontrola", trajanjeMin: 30 },
      },
    ] as any);

    const response = await request(app)
      .get("/api/termini")
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body[0].status).toBe("ZAKAZANO");
  });

  it("/api/termini/:id menja status termina", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        termin: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            dermatologId: 9,
            pacijentId: 3,
            uslugaId: 4,
            datumVreme: new Date("2026-09-02T10:00:00Z"),
            status: "ZAKAZANO",
            usluga: { trajanjeMin: 30 },
          }),
          update: vi.fn().mockResolvedValue({ id: 1, status: "ZAVRSENO" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        izvrsenaUsluga: {
          create: vi.fn().mockResolvedValue({
            id: 88,
            pacijentId: 3,
            uslugaId: 4,
            dermatologId: 9,
          }),
        },
      } as any;
      return callback(tx);
    });

    const response = await request(app)
      .put("/api/termini/1")
      .send({ status: "ZAVRSENO" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.status).toBe("ZAVRSENO");
  });

  it("/api/termini/:id pri završetku termina kreira zapis u izvrsenim uslugama", async () => {
    const txCreate = vi.fn().mockResolvedValue({
      id: 99,
      pacijentId: 3,
      uslugaId: 4,
      dermatologId: 9,
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        termin: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            dermatologId: 9,
            pacijentId: 3,
            uslugaId: 4,
            datumVreme: new Date("2026-09-02T10:00:00Z"),
            status: "ZAKAZANO",
            usluga: { trajanjeMin: 30 },
          }),
          update: vi.fn().mockResolvedValue({ id: 1, status: "ZAVRSENO" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        izvrsenaUsluga: {
          create: txCreate,
        },
      } as any;
      return callback(tx);
    });

    const response = await request(app)
      .put("/api/termini/1")
      .send({ status: "ZAVRSENO" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.status).toBe("ZAVRSENO");
    expect(txCreate).toHaveBeenCalledWith({
      data: {
        pacijentId: 3,
        uslugaId: 4,
        dermatologId: 9,
      },
    });
  });

  it("/api/termini/:id briše termin", async () => {
    vi.mocked(prisma.termin.delete).mockResolvedValue({ id: 11 } as any);
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 9,
      aktivan: true,
    } as any);

    await request(app)
      .delete("/api/termini/11")
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);
  });

  it("/api/izvestaji kreira izveštaj", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 9,
      aktivan: true,
    } as any);
    vi.mocked(prisma.izvestaj.create).mockResolvedValue({
      id: 5,
      terminId: 11,
      dijagnoza: "x",
      dermatologId: 9,
    } as any);

    const response = await request(app)
      .post("/api/izvestaji")
      .send({ terminId: 11, dijagnoza: "x", terapija: "y", anamneza: "z" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(201);

    expect(response.body.dijagnoza).toBe("x");
  });

  it("/api/izvestaji/termin/:terminId vraća 404 ako izveštaj ne postoji", async () => {
    vi.mocked(prisma.izvestaj.findUnique).mockResolvedValue(null);

    await request(app)
      .get("/api/izvestaji/termin/99")
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(404);
  });

  it("/api/izvestaji/termin/:terminId vraća izveštaj za termin", async () => {
    vi.mocked(prisma.izvestaj.findUnique).mockResolvedValue({
      id: 2,
      terminId: 10,
      dijagnoza: "Aknе",
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    } as any);

    const response = await request(app)
      .get("/api/izvestaji/termin/10")
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.dijagnoza).toBe("Aknе");
  });

  it("/api/izvestaji/:id menja izveštaj", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 9,
      aktivan: true,
    } as any);
    vi.mocked(prisma.izvestaj.findUnique).mockResolvedValue({
      id: 5,
      dermatologId: 9,
    } as any);
    vi.mocked(prisma.izvestaj.update).mockResolvedValue({
      id: 5,
      dijagnoza: "nova",
    } as any);

    const response = await request(app)
      .put("/api/izvestaji/5")
      .send({ dijagnoza: "nova" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.dijagnoza).toBe("nova");
  });

  it("/api/izvestaji/:id vraća 403 ako korisnik ne poseduje izveštaj", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 9,
      aktivan: true,
    } as any);
    vi.mocked(prisma.izvestaj.findUnique).mockResolvedValue({
      id: 5,
      dermatologId: 18,
    } as any);

    await request(app)
      .delete("/api/izvestaji/5")
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(403);
  });

  it("/api/izvestaji/pacijent/:pacijentId vraća istoriju izveštaja", async () => {
    vi.mocked(prisma.izvestaj.findMany).mockResolvedValue([
      {
        id: 3,
        dijagnoza: "Aknе",
        termin: {
          datumVreme: new Date("2026-09-02T10:00:00Z"),
          usluga: { naziv: "Kontrola" },
        },
        dermatolog: { ime: "Petar", prezime: "Petrović" },
      },
    ] as any);

    const response = await request(app)
      .get("/api/izvestaji/pacijent/3")
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body[0].dijagnoza).toBe("Aknе");
  });

  it("/api/izvrsene-usluge kreira i vraća zapis", async () => {
    vi.mocked(prisma.zaposleni.findUnique).mockResolvedValue({
      id: 9,
      aktivan: true,
    } as any);
    vi.mocked(prisma.usluga.findUnique).mockResolvedValue({
      cena: 1800,
    } as any);
    vi.mocked(prisma.izvrsenaUsluga.create).mockResolvedValue({
      id: 1,
      pacijentId: 3,
      uslugaId: 4,
      dermatologId: 9,
      cena: 1800,
    } as any);

    const response = await request(app)
      .post("/api/izvrsene-usluge")
      .send({ pacijentId: 3, uslugaId: 4 })
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(201);

    expect(response.body.id).toBe(1);
    expect(prisma.izvrsenaUsluga.create).toHaveBeenCalledWith({
      data: {
        pacijentId: 3,
        uslugaId: 4,
        dermatologId: 9,
        cena: 1800,
      },
    });
  });

  it("/api/izvrsene-usluge vraća listu filtriranu po datumu", async () => {
    vi.mocked(prisma.izvrsenaUsluga.findMany).mockResolvedValue([
      {
        id: 1,
        pacijentId: 3,
        uslugaId: 4,
        dermatologId: 9,
        usluga: { naziv: "Kontrola" },
      },
    ] as any);

    await request(app)
      .get("/api/izvrsene-usluge")
      .query({ od: "2026-09-01", do: "2026-09-10" })
      .set("Cookie", [
        `token=${jwt.sign({ id: 9, uloga: "DERMATOLOG", email: "doktor@test.com" }, "test-secret")}`,
      ])
      .expect(200);
  });

  it("/api/zaposleni pravi novog zaposlenog", async () => {
    vi.mocked(prisma.zaposleni.create).mockResolvedValue({
      id: 20,
      ime: "Marko",
      prezime: "Marković",
      email: "marko@test.com",
      telefon: "062",
      uloga: "DERMATOLOG",
      aktivan: true,
    } as any);

    const response = await request(app)
      .post("/api/zaposleni")
      .send({
        ime: "Marko",
        prezime: "Marković",
        email: "marko@test.com",
        telefon: "062",
        lozinka: "Test1234",
        uloga: "DERMATOLOG",
      })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(201);

    expect(response.body.email).toBe("marko@test.com");
  });

  it("/api/zaposleni odbija lozinku koja ne ispunjava pravila", async () => {
    const response = await request(app)
      .post("/api/zaposleni")
      .send({
        ime: "Marko",
        prezime: "Marković",
        email: "marko@test.com",
        telefon: "062",
        lozinka: "123",
        uloga: "DERMATOLOG",
      })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(400);

    expect(response.body.greska).toMatch(/bar 8|slovo|broj/i);
  });

  it("/api/zaposleni/:id menja status zaposlenog", async () => {
    vi.mocked(prisma.zaposleni.update).mockResolvedValue({
      id: 8,
      ime: "Ana",
      prezime: "Anić",
      email: "ana@test.com",
      telefon: "063",
      uloga: "DERMATOLOG",
      aktivan: false,
    } as any);

    const response = await request(app)
      .put("/api/zaposleni/8")
      .send({ aktivan: false })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.aktivan).toBe(false);
  });

  it("/api/zaposleni/:id odbija deaktiviranje sopstvenog naloga", async () => {
    await request(app)
      .put("/api/zaposleni/7")
      .send({ aktivan: false })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(400);
  });

  it("/api/zaposleni/:id briše zaposlenog sa force=true", async () => {
    vi.mocked(prisma.termin.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        izvrsenaUsluga: { deleteMany: vi.fn() },
        izvestaj: { deleteMany: vi.fn() },
        zaposleni: { delete: vi.fn().mockResolvedValue({ id: 11 }) },
      } as any),
    );

    await request(app)
      .delete("/api/zaposleni/11?force=true")
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(200);
  });

  it("/api/usluge/:id menja uslugu", async () => {
    vi.mocked(prisma.usluga.update).mockResolvedValue({
      id: 4,
      naziv: "Nova usluga",
      opis: "Opis",
      trajanjeMin: 45,
      cena: 2100,
    } as any);

    const response = await request(app)
      .put("/api/usluge/4")
      .send({ naziv: "Nova usluga", trajanjeMin: 45, cena: 2100 })
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(200);

    expect(response.body.naziv).toBe("Nova usluga");
  });

  it("/api/usluge/:id briše uslugu", async () => {
    vi.mocked(prisma.usluga.delete).mockResolvedValue({ id: 5 } as any);

    await request(app)
      .delete("/api/usluge/5")
      .set("Cookie", [
        `token=${jwt.sign({ id: 7, uloga: "ADMIN", email: "admin@test.com" }, "test-secret")}`,
      ])
      .expect(200);
  });
});
