import mysql, {
	type PoolConnection,
	type ResultSetHeader,
	type RowDataPacket,
} from "mysql2/promise";
import { env } from "../config/env";

export type SqlParam = string | number | boolean | Date | Buffer | null;

export const pool = mysql.createPool({
	uri: env.DATABASE_URL,
	waitForConnections: true,
	connectionLimit: 10,
	decimalNumbers: true,
});

export async function query<T>(
	sql: string,
	params: SqlParam[] = [],
): Promise<T[]> {
	const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
	return rows as T[];
}

export async function queryOne<T>(
	sql: string,
	params: SqlParam[] = [],
): Promise<T | null> {
	const rows = await query<T>(sql, params);
	return rows[0] ?? null;
}

export async function execute(
	sql: string,
	params: SqlParam[] = [],
): Promise<ResultSetHeader> {
	const [result] = await pool.execute<ResultSetHeader>(sql, params);
	return result;
}

export async function transaction<T>(
	fn: (cx: PoolConnection) => Promise<T>,
): Promise<T> {
	const cx = await pool.getConnection();
	try {
		await cx.beginTransaction();
		const result = await fn(cx);
		await cx.commit();
		return result;
	} catch (err) {
		await cx.rollback();
		throw err;
	} finally {
		cx.release();
	}
}

export async function txExecute(
	cx: PoolConnection,
	sql: string,
	params: SqlParam[] = [],
): Promise<ResultSetHeader> {
	const [result] = await cx.execute<ResultSetHeader>(sql, params);
	return result;
}

export async function assertDbConnection(): Promise<void> {
	const cx = await pool.getConnection();
	try {
		await cx.ping();
	} finally {
		cx.release();
	}
}
