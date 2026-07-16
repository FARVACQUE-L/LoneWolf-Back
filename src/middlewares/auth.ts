import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env, isProd } from "../config/env";
import { Unauthorized } from "../errors";

const COOKIE_NAME = "token";

declare global {
	namespace Express {
		interface Request {
			userId?: number;
		}
	}
}

interface TokenPayload {
	sub: number;
}

export function signToken(userId: number): string {
	return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
		expiresIn: "4h",
	});
}

export const cookieOptions = {
	httpOnly: true,
	secure: isProd,
	sameSite: isProd ? ("none" as const) : ("lax" as const),
	maxAge: 4 * 60 * 60 * 1000,
	path: "/",
};

export { COOKIE_NAME };

export const requireAuth: RequestHandler = (req, _res, next) => {
	const token = req.cookies?.[COOKIE_NAME];
	if (!token) return next(Unauthorized("Authentification requise."));

	try {
		const decoded = jwt.verify(token, env.JWT_SECRET);
		const sub =
			typeof decoded === "object"
				? Number((decoded as { sub: unknown }).sub)
				: NaN;

		if (!Number.isInteger(sub)) {
			return next(
				Unauthorized("Session invalide ou expirée.", "INVALID_TOKEN"),
			);
		}
		req.userId = sub;
		next();
	} catch {
		next(Unauthorized("Session invalide ou expirée.", "INVALID_TOKEN"));
	}
};

export function getUserId(req: { userId?: number }): number {
	if (req.userId === undefined) {
		throw new Error("getUserId() appelé sans requireAuth — bug de câblage.");
	}
	return req.userId;
}
