// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', { code: text('code').primaryKey(), password: text('password').notNull(), salt: text('salt').notNull(), stage: integer('stage').notNull().default(0), created: integer('created').notNull() });
export const teams = sqliteTable('teams', { code: text('code').notNull().references(()=>rooms.code,{onDelete:'cascade'}), number: integer('number').notNull(), state: text('state').notNull() }, t=>[primaryKey({columns:[t.code,t.number]})]);
export const sessions = sqliteTable('sessions', { token: text('token').primaryKey(), code: text('code').notNull().references(()=>rooms.code,{onDelete:'cascade'}), team: integer('team'), expires: integer('expires').notNull() });
