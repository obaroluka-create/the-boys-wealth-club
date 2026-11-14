/**
 * Database schema.
 *
 * Money is stored as integers so no amount is ever rounded by floating point:
 * - amounts in kobo (₦1 = 100 kobo)
 * - book units in micro-units (1 unit = 1,000,000)
 * - unit prices in ten-thousandths of a naira (₦1 = 10,000)
 * - percentages in ten-thousandths of a percent (1% = 10,000)
 *
 * Financial rows (valuations, deposits, dividends, audit entries) are append-only.
 * Balances are always derived from them, never stored.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    /** Always stored lower-case. */
    email: text("email").notNull().unique(),
    username: text("username").notNull().unique(),
    role: text("role", { enum: ["admin", "user"] }).notNull(),
    status: text("status", { enum: ["active", "disabled", "pending"] }).notNull(),
    memberSince: date("member_since").notNull().defaultNow(),
    imageUrl: text("image_url"),
    passwordHash: text("password_hash").notNull(),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} in ('admin', 'user')`),
    check("users_status_check", sql`${table.status} in ('active', 'disabled', 'pending')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token. The raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

/** Collective book price history. The latest row is the current unit price. */
export const bookValuations = pgTable(
  "book_valuations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(),
    previousUnitPrice: bigint("previous_unit_price", { mode: "bigint" }).notNull(),
    profitPercent: bigint("profit_percent", { mode: "bigint" }).notNull().default(sql`0`),
    lossPercent: bigint("loss_percent", { mode: "bigint" }).notNull().default(sql`0`),
    recordedBy: uuid("recorded_by").references(() => users.id),
  },
  (table) => [
    index("book_valuations_recorded_idx").on(table.recordedAt),
    check("book_valuations_price_check", sql`${table.unitPrice} > 0`),
  ],
);

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  reference: text("reference").notNull().unique(),
  createdAt: createdAt(),
});

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    /** Units bought, fixed at the time of the deposit. */
    units: bigint("units", { mode: "bigint" }).notNull(),
    /** Unit price the deposit bought in at. */
    unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
    recordedBy: uuid("recorded_by").references(() => users.id),
  },
  (table) => [
    index("deposits_portfolio_idx").on(table.portfolioId),
    check("deposits_amount_check", sql`${table.amount} > 0`),
    check("deposits_units_check", sql`${table.units} > 0`),
  ],
);

export const dividends = pgTable(
  "dividends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    type: text("type", { enum: ["quarterly", "special", "annual"] }).notNull(),
    status: text("status", { enum: ["paid", "pending", "processing"] }).notNull(),
    paidOn: date("paid_on").notNull().defaultNow(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    recordedBy: uuid("recorded_by").references(() => users.id),
  },
  (table) => [
    index("dividends_portfolio_idx").on(table.portfolioId),
    check("dividends_amount_check", sql`${table.amount} > 0`),
  ],
);

/** Activity history and admin audit trail. Values are in kobo when present. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: createdAt(),
    actorId: uuid("actor_id").references(() => users.id),
    subjectUserId: uuid("subject_user_id").references(() => users.id),
    action: text("action").notNull(),
    previousValue: bigint("previous_value", { mode: "bigint" }),
    newValue: bigint("new_value", { mode: "bigint" }),
    note: text("note"),
  },
  (table) => [
    index("audit_subject_idx").on(table.subjectUserId, table.createdAt),
    index("audit_created_idx").on(table.createdAt),
  ],
);
