import { Router } from "express";

import { NotFound } from "../../errors";
import {
	COOKIE_NAME,
	cookieOptions,
	getUserId,
	requireAuth,
	signToken,
} from "../../middlewares/auth";
import { loginSchema, registerSchema } from "./auth.schema";
import * as service from "./auth.service";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
	const input = registerSchema.parse(req.body);
	const user = await service.register(input);
	res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
	res.status(201).json({ user });
});

authRouter.post("/login", async (req, res) => {
	const input = loginSchema.parse(req.body);
	const user = await service.login(input);
	res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
	res.json({ user });
});

authRouter.post("/logout", (_req, res) => {
	res.clearCookie(COOKIE_NAME, cookieOptions);
	res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
	const user = await service.findById(getUserId(req));
	if (!user) throw NotFound("Utilisateur introuvable.");
	res.json({ user });
});
