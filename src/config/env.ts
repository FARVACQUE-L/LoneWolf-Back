import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),

	PORT: z.coerce.number().int().positive().default(3000),

	DATABASE_URL: z.string().url(),

	JWT_SECRET: z
		.string()
		.min(32, "JWT_SECRET doit faire au moins 32 caractères"),

	CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Variables d'environnement invalides :");
	console.error(z.treeifyError(parsed.error));
	process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
