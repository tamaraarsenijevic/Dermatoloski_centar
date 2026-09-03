# Dermatološki centar — Sistem za upravljanje pacijentima i terminima

Veb aplikacija za upravljanje radom dermatološkog centra. Omogućava administratorima upravljanje zaposlenima i cenovnikom usluga, dok dermatolozi vode evidenciju pacijenata, zakazuju termine, unose nalaze sa pregleda i prate izvršene usluge.

Projekat je rađen kao deo diplomskog rada.

## Funkcionalnosti

### Administrator

- Dodavanje, izmena i brisanje zaposlenih (admina i dermatologa)
- Dodela pristupa i uloga zaposlenima
- Upravljanje cenovnikom usluga (dodavanje, izmena, brisanje)
- Pregled mesecne statistike

### Dermatolog

- Upravljanje pacijentima (dodavanje, izmena, brisanje, pretraga)
- Zakazivanje, izmena i otkazivanje termina
- Unos izveštaja sa specijalističkog pregleda
- Pregled istorije pregleda pacijenta
- Evidencija izvršenih usluga

## Tehnologije

**Backend**

- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT autentifikacija (httpOnly cookie)
- bcrypt za heširanje lozinki

**Frontend**

- React
- TypeScript
- Vite
- React Router
- Axios

## Instalacija i pokretanje

### 1. Kloniranje repozitorijuma

```bash
git clone https://github.com/tamaraarsenijevic/Dermatoloski_centar.git
cd  Dermatoloski_centar
```

### 2. Podešavanje baze podataka

Kreirati PostgreSQL bazu:

```sql
CREATE DATABASE dermatologija_db;
```

### 3. Backend

```bash
cd backend
npm install
```

Kreirati `.env` fajl u `backend` folderu:

```env
DATABASE_URL="postgresql://korisnik:lozinka@localhost:5432/dermatologija_db"
JWT_SECRET="unesi-jaku-tajnu-vrednost"
PORT=5000
```

Pokrenuti migracije i generisati Prisma klijent:

```bash
npx prisma migrate dev
npx prisma generate
```

Popuniti bazu početnim podacima:

```bash
npx prisma db seed
```

Pokrenuti backend server:

```bash
npm run dev
```

Backend će biti dostupan na `http://localhost:5000`.

### 4. Frontend

Otvoriti novi terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend će biti dostupan na `http://localhost:5173`.

## Korišćenje

1. Otvoriti `http://localhost:5173` u pregledaču
2. Prijaviti se sa nalogom administratora ili dermatologa
3. Administrator se preusmerava na upravljanje zaposlenima i uslugama
4. Dermatolog se preusmerava na upravljanje pacijentima i terminima
