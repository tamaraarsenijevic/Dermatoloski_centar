import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import authRouter from "./routes/auth.js";
import pacijentiRouter from "./routes/pacijenti.js";
import terminiRouter from "./routes/termini.js";
import izvestajiRouter from "./routes/izvestaji.js";
import zaposleniRouter from "./routes/zaposleni.js";
import uslugeRouter from "./routes/usluge.js";
import izvrseneUslugeRouter from "./routes/izvrsene-usluge.js";
import statistikaRouter from "./routes/statistika.js";

export {
  autentifikacija,
  dozvoljenaUloga,
  type AuthRequest,
  type AuthenticatedUser,
} from "./middleware/auth.js";
export { dermatologImaPreklapanje } from "./routes/termini.js";

export const app = express();
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/pacijenti", pacijentiRouter);
app.use("/api/termini", terminiRouter);
app.use("/api/izvestaji", izvestajiRouter);
app.use("/api/statistika", statistikaRouter);
app.use("/api/zaposleni", zaposleniRouter);
app.use("/api/usluge", uslugeRouter);
app.use("/api/izvrsene-usluge", izvrseneUslugeRouter);

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`Backend server radi na portu ${config.port}`);
  });
}
