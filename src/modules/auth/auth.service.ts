import { hash, verify } from "@node-rs/argon2";

import { execute, queryOne } from "../../db/pool";
import type { UserRow } from "../../db/types";
import { Conflict, Unauthorized } from "../../errors";
import type { LoginInput, PublicUser, RegisterInput } from "./auth.schema";

const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const DUMMY_HASH =
	"$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$b3xJqHRPJ7YQxJ0mVsB3iZ0v0F0cKZbYc2mQ7Wy5hQo";

export async function register(input: RegisterInput): Promise<PublicUser> {
	const existing = await queryOne<Pick<UserRow, "id">>(
		`SELECT id FROM users WHERE email = ?`,
		[input.email],
	);
	if (existing)
		throw Conflict("Un compte existe déjà avec cet email.", "EMAIL_TAKEN");

	const passwordHash = await hash(input.password, ARGON2);

	const result = await execute(
		`INSERT INTO users (email, password_hash) VALUES (?, ?)`,
		[input.email, passwordHash],
	);
	return { id: result.insertId, email: input.email };
}

export async function login(input: LoginInput): Promise<PublicUser> {
	const user = await queryOne<UserRow>(
		`SELECT id, email, password_hash FROM users WHERE email = ?`,
		[input.email],
	);
	if (!user) {
		await verify(DUMMY_HASH, input.password, ARGON2).catch(() => false);
		throw Unauthorized("Email ou mot de passe incorrect.");
	}

	const ok = await verify(user.password_hash, input.password, ARGON2);
	if (!ok) throw Unauthorized("Email ou mot de passe incorrect.");
	return { id: user.id, email: user.email };
}

export function findById(userId: number): Promise<PublicUser | null> {
	return queryOne<PublicUser>(`SELECT id, email FROM users WHERE id = ?`, [
		userId,
	]);
}
