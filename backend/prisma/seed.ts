import { PrismaClient, Uloga } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. Očisti postojeće podatke
  await prisma.izvestaj.deleteMany();
  await prisma.termin.deleteMany();
  await prisma.pacijent.deleteMany();
  await prisma.usluga.deleteMany();
  await prisma.zaposleni.deleteMany();

  // 2. Heširanje lozinke
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // 3. Ubaci Admina i Dermatologa
  await prisma.zaposleni.create({
    data: {
      ime: "Ana",
      prezime: "Petrović",
      email: "admin@dermatologija.rs",
      lozinka: hashedPassword,
      telefon: "06411122233",
      uloga: Uloga.ADMIN,
    },
  });

  await prisma.zaposleni.create({
    data: {
      ime: "Dr Marko",
      prezime: "Janković",
      email: "marko@dermatologija.rs",
      lozinka: hashedPassword,
      telefon: "0643334455",
      uloga: Uloga.DERMATOLOG,
    },
  });

  // 4. Ubaci početne usluge
  await prisma.usluga.createMany({
    data: [
      {
        naziv: "Dermatoskopski pregled mladeža",
        opis: "Detaljan pregled mladeža digitalnim dermatoskopom",
        trajanjeMin: 30,
        cena: 5000,
      },
      {
        naziv: "Tretman akni (Hemijski piling)",
        opis: "Dermatološki piling za lečenje problematične kože",
        trajanjeMin: 45,
        cena: 6500,
      },
      {
        naziv: "Uklanjanje promena na koži radiotalasima",
        opis: "Minimalno invazivno uklanjanje bradavica i fibroma",
        trajanjeMin: 30,
        cena: 4000,
      },
    ],
  });

  console.log("Baza je uspešno popunjena početnim podacima!");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
