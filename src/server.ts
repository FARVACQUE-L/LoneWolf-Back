import { app } from "./app";
import { env } from "./config/env";
import { assertDbConnection, pool } from "./db/pool";

async function main() {
	await assertDbConnection();
	console.log("MySQL connecté");

	const server = app.listen(env.PORT, () => {
		console.log(`API sur http://localhost:${env.PORT}`);
		console.log(`CORS autorisé pour ${env.CORS_ORIGIN}`);
	});

	const shutdown = async (signal: string) => {
		console.log(`\n${signal} reçu, arrêt en cours...`);
		server.close();
		await pool.end();
		process.exit(0);
	};

	process.on("SIGINT", () => void shutdown("SIGINT"));
	process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
	console.error(
		"Démarrage impossible :",
		err instanceof Error ? err.message : err,
	);
	process.exit(1);
});
