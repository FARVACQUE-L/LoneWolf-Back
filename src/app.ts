import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { queryOne } from "./db/pool";
import { errorHandler, notFoundHandler } from "./middlewares/error";
import { authRouter } from "./modules/auth/auth.routes";
import { charactersRouter } from "./modules/characters/character.routes";
import { disciplinesRouter } from "./modules/disciplines/discipline.routes";
import { objectsRouter } from "./modules/objects/objects.routes";

export const app = express();

app.use(
	cors({
		origin: env.CORS_ORIGIN,
		credentials: true,
	}),
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", async (_req, res) => {
	const row = await queryOne<{ ok: number }>("SELECT 1 AS ok");
	res.json({ status: "ok", db: row?.ok === 1 ? "up" : "down" });
});

app.use("/auth", authRouter);
app.use("/characters", charactersRouter);
app.use("/disciplines", disciplinesRouter);
app.use("/objects", objectsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
