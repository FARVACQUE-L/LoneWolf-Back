import { z } from "zod";

export const registerSchema = z.object({
	email: z.string().trim().toLowerCase().email("Email invalide.").max(255),

	password: z
		.string()
		.min(8, "Le mot de passe doit faire au moins 8 caractères.")
		.max(128, "Le mot de passe est trop long."),
});

export const loginSchema = z.object({
	email: z.string().trim().toLowerCase().email("Email invalide."),
	password: z.string().min(1, "Mot de passe requis."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export interface PublicUser {
	id: number;
	email: string;
}
