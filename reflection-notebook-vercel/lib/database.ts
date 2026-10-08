import { Pool, types, type PoolClient } from 'pg';

// Millisecond timestamps must remain numbers when read from Postgres.
types.setTypeParser(20, Number);
let pool: Pool | undefined;
let initialized: Promise<void> | undefined;
const schema = `
CREATE TABLE IF NOT EXISTS lessons(code text PRIMARY KEY,title text NOT NULL,password text NOT NULL,salt text NOT NULL,questions text NOT NULL,created bigint NOT NULL);
CREATE TABLE IF NOT EXISTS students(id text PRIMARY KEY,code text NOT NULL REFERENCES lessons(code) ON DELETE CASCADE,name text NOT NULL,pin text NOT NULL,created bigint NOT NULL,UNIQUE(code,pin));
CREATE TABLE IF NOT EXISTS revisions(id text PRIMARY KEY,student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,number integer NOT NULL,questions text NOT NULL,answers text NOT NULL,feedback text NOT NULL DEFAULT '',created bigint NOT NULL,feedback_at bigint,UNIQUE(student_id,number));
CREATE TABLE IF NOT EXISTS sessions(token text PRIMARY KEY,code text NOT NULL REFERENCES lessons(code) ON DELETE CASCADE,student_id text REFERENCES students(id) ON DELETE CASCADE,expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(key text PRIMARY KEY,count integer NOT NULL,expires bigint NOT NULL);
`;
async function connection() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  initialized ??= pool.query(schema).then(() => undefined).catch(error => { initialized = undefined; throw error; });
  await initialized;
  return pool;
}
class Statement {
  constructor(readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.sql, values); }
  async execute(client?: PoolClient) {
    let index = 0;
    const sql = this.sql.replace(/\?/g, () => `$${++index}`);
    const target = client ?? await connection();
    return target.query(sql, this.values);
  }
  async first<T>() { return ((await this.execute()).rows[0] as T | undefined) ?? null; }
  async all<T>() { return { results: (await this.execute()).rows as T[] }; }
  async run() { return { meta: { changes: (await this.execute()).rowCount ?? 0 } }; }
}
export const database = {
  prepare(sql: string) { return new Statement(sql); },
  async batch(statements: Statement[]) {
    const client = await (await connection()).connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const statement of statements) results.push(await statement.execute(client));
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },
};
export type D1Database = typeof database;
