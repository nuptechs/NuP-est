import { pgTable, pgSchema, uuid, text, jsonb, boolean, timestamp, varchar, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Schema dedicado para NuP-AIM
const aimSchema = pgSchema("nup_aim");

// Profiles table (perfis de acesso)
export const profiles = aimSchema.table('profiles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description').notNull(),
  permissions: jsonb('permissions').notNull().default(sql`'[]'::jsonb`),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Users table (usuários do sistema)
export const users = aimSchema.table('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  profileId: uuid('profile_id').references(() => profiles.id),
  isActive: boolean('is_active').default(true),
  isEmailVerified: boolean('is_email_verified').default(false),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationExpires: timestamp('email_verification_expires'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Projects table (projetos)
export const projects = aimSchema.table('projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  acronym: text('acronym').notNull(),
  isDefault: boolean('is_default').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Analyses table (análises de impacto)
export const analyses = aimSchema.table('analyses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  description: text('description'),
  author: text('author').notNull(),
  version: text('version').default('1.0'),
  projectId: uuid('project_id').references(() => projects.id),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Processes table (funcionalidades impactadas)
export const processes = aimSchema.table('processes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid('analysis_id').references(() => analyses.id),
  name: text('name').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'nova', 'alterada', 'excluida'
  workDetails: text('work_details'),
  screenshots: text('screenshots'),
  websisCreated: boolean('websis_created'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Impacts table (impactos)
export const impacts = aimSchema.table('impacts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid('analysis_id').references(() => analyses.id),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 20 }).notNull(), // 'baixo', 'medio', 'alto', 'critico'
  probability: varchar('probability', { length: 20 }).notNull(), // 'baixo', 'medio', 'alto'
  category: varchar('category', { length: 20 }).notNull(), // 'business', 'technical', 'operational', 'financial'
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Risks table (riscos)
export const risks = aimSchema.table('risks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid('analysis_id').references(() => analyses.id),
  description: text('description').notNull(),
  impact: varchar('impact', { length: 20 }).notNull(), // 'baixo', 'medio', 'alto', 'critico'
  probability: varchar('probability', { length: 20 }).notNull(), // 'baixo', 'medio', 'alto'
  mitigation: text('mitigation'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Mitigations table (ações de mitigação)
export const mitigations = aimSchema.table('mitigations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid('analysis_id').references(() => analyses.id),
  action: text('action').notNull(),
  responsible: text('responsible').notNull(),
  deadline: date('deadline'),
  priority: varchar('priority', { length: 20 }).notNull(), // 'baixo', 'medio', 'alto'
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Conclusions table (conclusões e recomendações)
export const conclusions = aimSchema.table('conclusions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid('analysis_id').references(() => analyses.id),
  summary: text('summary'),
  recommendations: jsonb('recommendations').default(sql`'{}'::jsonb`),
  nextSteps: jsonb('next_steps').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});

// Custom Field Values table (valores de campos personalizados)
export const customFieldValues = aimSchema.table('custom_field_values', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  analysisId: uuid('analysis_id').references(() => analyses.id).notNull(),
  fieldId: text('field_id').notNull(),
  sectionName: text('section_name').notNull(),
  value: jsonb('value'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`)
});