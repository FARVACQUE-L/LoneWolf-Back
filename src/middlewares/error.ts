import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env";
import { AppError } from "../errors";

export const notFoundHandler: RequestHandler = (req, res) => {
	res.status(404).json({
		error: {
			code: "NOT_FOUND",
			message: `Route inconnue : ${req.method} ${req.path}`,
		},
	});
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	if (err instanceof ZodError) {
		res.status(400).json({
			error: {
				code: "VALIDATION_ERROR",
				message: "Données invalides.",
				details: err.issues.map((i) => ({
					field: i.path.join("."),
					message: i.message,
				})),
			},
		});
		return;
	}
	if (err instanceof AppError) {
		res.status(err.status).json({
			error: { code: err.code, message: err.message, details: err.details },
		});
		return;
	}
	console.error("Erreur non gérée :", err);
	res.status(500).json({
		error: {
			code: "INTERNAL_ERROR",
			message: "Une erreur interne est survenue.",
			...(isProd
				? {}
				: { debug: err instanceof Error ? err.message : String(err) }),
		},
	});
};
