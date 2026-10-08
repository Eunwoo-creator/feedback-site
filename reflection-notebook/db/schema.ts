// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const lessons=sqliteTable('lessons',{code:text('code').primaryKey(),title:text('title').notNull(),password:text('password').notNull(),salt:text('salt').notNull(),questions:text('questions').notNull(),created:integer('created').notNull()});
export const students=sqliteTable('students',{id:text('id').primaryKey(),code:text('code').notNull().references(()=>lessons.code,{onDelete:'cascade'}),name:text('name').notNull(),pin:text('pin').notNull(),created:integer('created').notNull()},t=>[uniqueIndex('students_lesson_pin').on(t.code,t.pin)]);
export const revisions=sqliteTable('revisions',{id:text('id').primaryKey(),studentId:text('student_id').notNull().references(()=>students.id,{onDelete:'cascade'}),number:integer('number').notNull(),questions:text('questions').notNull(),answers:text('answers').notNull(),feedback:text('feedback').notNull().default(''),created:integer('created').notNull(),feedbackAt:integer('feedback_at')},t=>[uniqueIndex('revision_student_number').on(t.studentId,t.number)]);
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),code:text('code').notNull().references(()=>lessons.code,{onDelete:'cascade'}),studentId:text('student_id').references(()=>students.id,{onDelete:'cascade'}),expires:integer('expires').notNull()});
export const attempts=sqliteTable('attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
