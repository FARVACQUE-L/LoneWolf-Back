export class AppError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "AppError";
	}
}

export const BadRequest = (
	msg: string,
	code = "BAD_REQUEST",
	details?: unknown,
) => new AppError(400, msg, code, details);

export const Unauthorized = (
	msg = "Authentification requise.",
	code = "UNAUTHORIZED",
) => new AppError(401, msg, code);

export const Forbidden = (msg = "Accès refusé.", code = "FORBIDDEN") =>
	new AppError(403, msg, code);

export const NotFound = (msg = "Ressource introuvable.", code = "NOT_FOUND") =>
	new AppError(404, msg, code);

export const Conflict = (msg: string, code = "CONFLICT") =>
	new AppError(409, msg, code);

export const UnprocessableEntity = (
	msg: string,
	code = "RULE_VIOLATION",
	details?: unknown,
) => new AppError(422, msg, code, details);
