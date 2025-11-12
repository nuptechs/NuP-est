import { sql } from "drizzle-orm";
import { pgTable, pgSchema, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Schema dedicado para NuP-Identify
const identifySchema = pgSchema("nup_identify");

// =============================================================================
// MULTI-TENANCY - Organizações
// =============================================================================

// Organizações (multi-tenant) - Cada cliente/empresa tem uma organização
export const organizations = identifySchema.table("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly name
  parentId: varchar("parent_id"), // Para hierarquia (null = org raiz)
  settings: text("settings").default("{}"), // JSON config
  status: text("status").default("active"), // active, inactive, suspended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// CORE IDENTITY TABLES
// =============================================================================

// Sistemas integrados (NuP-Kan, NuP-CRM, NuP-ERP, etc)
export const systems = identifySchema.table("systems", {
  id: varchar("id").primaryKey(), // ex: "nup-kan", "nup-crm"
  name: text("name").notNull(), // ex: "NuP-Kan - Sistema Kanban"
  description: text("description").default(""),
  apiUrl: text("api_url"), // URL base do sistema
  webhookUrl: text("webhook_url"), // URL para receber eventos
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sistemas permitidos por organização (controle de acesso)
export const organizationSystems = identifySchema.table("organization_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  systemId: varchar("system_id").notNull().references(() => systems.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  settings: text("settings").default("{}"), // Ex: features habilitadas
  createdAt: timestamp("created_at").defaultNow(),
});

// Funções/Permissões de cada sistema (sincronizadas via permissions.json)
export const functions = identifySchema.table("functions", {
  id: varchar("id").primaryKey(), // ex: "nup-kan-boards-create"
  systemId: varchar("system_id").notNull().references(() => systems.id, { onDelete: "cascade" }),
  functionKey: text("function_key").notNull(), // ex: "boards-create"
  name: text("name").notNull(), // ex: "Criar Boards"
  category: text("category").default(""), // ex: "Boards"
  description: text("description").default(""),
  endpoint: text("endpoint").default(""), // ex: "POST /api/boards"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// USERS (Tabela exclusiva do NuPIdentity)
// =============================================================================

// IMPORTANTE: Esta tabela é EXCLUSIVA do NuPIdentity
// Não é compartilhada com outros sistemas - cada sistema usa esta central de identidade
export const users = identifySchema.table("identity_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // null para OAuth/social login
  avatar: text("avatar"),
  
  // Organização do usuário (multi-tenant)
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  
  // Status e metadata
  status: text("status").default("active"), // active, inactive, suspended
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provedores de autenticação externa (OAuth, Social Login)
export const userAuthProviders = identifySchema.table("user_auth_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // google, github, apple, microsoft
  providerId: text("provider_id").notNull(), // ID do usuário no provedor
  providerEmail: text("provider_email"),
  metadata: text("metadata").default("{}"), // JSON data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credenciais WebAuthn/Passkeys
export const passkeyCredentials = identifySchema.table("passkey_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").default(0),
  deviceName: text("device_name").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

// Times (pertencem a organizações)
export const teams = identifySchema.table("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relacionamento N:N entre usuários e times
export const userTeams = identifySchema.table("user_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // member, lead, admin
  createdAt: timestamp("created_at").defaultNow(),
});

// Perfis de acesso (conjuntos de permissões)
export const profiles = identifySchema.table("identity_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  isDefault: boolean("is_default").default(false), // Perfil padrão para novos usuários
  isGlobal: boolean("is_global").default(false), // Vale para todos os sistemas
  systemId: varchar("system_id").references(() => systems.id, { onDelete: "cascade" }), // null = global
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Associação usuário <-> perfil
export const userProfiles = identifySchema.table("identity_user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Funções atribuídas a perfis
export const profileFunctions = identifySchema.table("identity_profile_functions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  functionId: varchar("function_id").notNull().references(() => functions.id, { onDelete: "cascade" }),
  granted: boolean("granted").default(true), // true = permite, false = nega explicitamente
  createdAt: timestamp("created_at").defaultNow(),
});

// Perfis atribuídos a times (permissões herdadas por membros)
export const teamProfiles = identifySchema.table("team_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Overrides de permissões por usuário (sobrescreve o que o perfil dá)
export const userFunctionOverrides = identifySchema.table("identity_user_function_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  functionId: varchar("function_id").notNull().references(() => functions.id, { onDelete: "cascade" }),
  granted: boolean("granted").notNull(), // true = concede mesmo que perfil não tenha, false = nega mesmo que perfil tenha
  reason: text("reason").default(""), // Motivo do override
  scopeType: text("scope_type").default("global"), // global, organization, team
  scopeId: varchar("scope_id"), // ID da org/team (null = global)
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// SESSION & TOKEN MANAGEMENT
// =============================================================================

// JWT Refresh Tokens (para rotação de tokens)
export const refreshTokens = identifySchema.table("identity_refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email Verification Tokens
export const emailVerificationTokens = identifySchema.table("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log de autenticações
export const authEvents = identifySchema.table("identity_auth_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // login, logout, login_failed, token_refresh
  authMethod: text("auth_method").default(""), // password, google, github, passkey
  ipAddress: text("ip_address").default(""),
  userAgent: text("user_agent").default(""),
  success: boolean("success").default(true),
  metadata: text("metadata").default(""), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// ENTERPRISE FEATURES
// =============================================================================

// Convites pendentes (onboarding)
export const pendingInvitations = identifySchema.table("pending_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").default("pending"), // pending, accepted, expired, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Administradores delegados (permissões limitadas a org/team)
export const delegatedAdmins = identifySchema.table("delegated_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scopeType: text("scope_type").notNull(), // organization, team
  scopeId: varchar("scope_id").notNull(),
  permissions: text("permissions").notNull().default("[]"), // JSON array: ['manage_users', 'manage_teams']
  grantedBy: varchar("granted_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null = nunca expira
});

// Service accounts (autenticação sistema-a-sistema)
export const serviceAccounts = identifySchema.table("service_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  systemId: varchar("system_id").references(() => systems.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  apiKeyHash: text("api_key_hash").notNull(), // bcrypt hash
  permissions: text("permissions").default("[]"), // JSON array
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// WEBHOOK EVENTS
// =============================================================================

// Eventos de webhook para notificar sistemas externos
export const webhookEvents = identifySchema.table("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").notNull().references(() => systems.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // permissions.updated, user.created, etc
  payload: text("payload").default("{}"), // JSON
  status: text("status").default("pending"), // pending, success, failed
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

// Organizations
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "Slug deve ter pelo menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
});
export const updateOrganizationSchema = insertOrganizationSchema.partial();
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Systems
export const insertSystemSchema = createInsertSchema(systems).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateSystemSchema = insertSystemSchema.partial();
export type InsertSystem = z.infer<typeof insertSystemSchema>;
export type System = typeof systems.$inferSelect;

// Functions
export const insertFunctionSchema = createInsertSchema(functions).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateFunctionSchema = insertFunctionSchema.partial();
export type InsertFunction = z.infer<typeof insertFunctionSchema>;
export type Function = typeof functions.$inferSelect;

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});
export const updateUserSchema = insertUserSchema.partial();
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User Auth Providers
export const insertUserAuthProviderSchema = createInsertSchema(userAuthProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserAuthProvider = z.infer<typeof insertUserAuthProviderSchema>;
export type UserAuthProvider = typeof userAuthProviders.$inferSelect;

// Passkey Credentials
export const insertPasskeyCredentialSchema = createInsertSchema(passkeyCredentials).omit({
  id: true,
  createdAt: true,
});
export type InsertPasskeyCredential = z.infer<typeof insertPasskeyCredentialSchema>;
export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;

// Teams
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateTeamSchema = insertTeamSchema.partial();
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Profiles
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateProfileSchema = insertProfileSchema.partial();
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// Pending Invitations
export const insertPendingInvitationSchema = createInsertSchema(pendingInvitations).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("Email inválido"),
});
export type InsertPendingInvitation = z.infer<typeof insertPendingInvitationSchema>;
export type PendingInvitation = typeof pendingInvitations.$inferSelect;

// Delegated Admins
export const insertDelegatedAdminSchema = createInsertSchema(delegatedAdmins).omit({
  id: true,
  createdAt: true,
});
export type InsertDelegatedAdmin = z.infer<typeof insertDelegatedAdminSchema>;
export type DelegatedAdmin = typeof delegatedAdmins.$inferSelect;

// Service Accounts
export const insertServiceAccountSchema = createInsertSchema(serviceAccounts).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});
export type InsertServiceAccount = z.infer<typeof insertServiceAccountSchema>;
export type ServiceAccount = typeof serviceAccounts.$inferSelect;

// Email Verification Tokens
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// Export all tables for Drizzle to maintain schema metadata
export const identityTables = {
  organizations,
  systems,
  organizationSystems,
  functions,
  users,
  userAuthProviders,
  passkeyCredentials,
  teams,
  userTeams,
  profiles,
  userProfiles,
  profileFunctions,
  teamProfiles,
  userFunctionOverrides,
  refreshTokens,
  emailVerificationTokens,
  authEvents,
  pendingInvitations,
  delegatedAdmins,
  serviceAccounts,
  webhookEvents,
};
