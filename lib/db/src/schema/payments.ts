import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { garagesTable } from "./garages";
import { invoicesTable } from "./invoices";

// ─── KPay payments ───────────────────────────────────────────────────────────

export const kpayPaymentsTable = pgTable("kpay_payments", {
  id: serial("id").primaryKey(),

  /** Invoice that authorizes this payment. */
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),

  /** Unique ID we generated and sent to KPay — used to reconcile webhooks. */
  externalId: varchar("external_id").notNull().unique(),

  /** Transaction ID returned by KPay (null until KPay confirms). */
  transactionId: varchar("transaction_id"),

  /** PENDING → PAID | FAILED */
  status: varchar("status").notNull().default("PENDING"),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  provider: varchar("provider").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  description: text("description").notNull(),

  clientId: varchar("client_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  garageId: integer("garage_id").references(() => garagesTable.id, {
    onDelete: "set null",
  }),
  /** Set when KPay confirms SUCCESS. */
  paidAt: timestamp("paid_at", { withTimezone: true }),

  /** Full raw webhook payload stored for audit / debugging. */
  rawWebhookPayload: jsonb("raw_webhook_payload"),

  // ─── Commission / payout fields ───────────────────────────────────────────

  /** Total amount billed to the client (FCFA). */
  grossAmount: integer("gross_amount"),

  /** Fixed Wapi commission per transaction (FCFA). Always 500. */
  commissionAmount: integer("commission_amount").default(500),

  /** Amount owed to the garage after commission (grossAmount - 500). */
  netAmount: integer("net_amount"),

  /**
   * Payout (reversement) status for the garage.
   * PENDING → PROCESSING → PAID | FAILED
   */
  payoutStatus: text("payout_status").default("PENDING"),

  /** KPay transaction ID for the payout transfer to the garage. */
  payoutTransactionId: text("payout_transaction_id"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type KpayPayment = typeof kpayPaymentsTable.$inferSelect;
export type InsertKpayPayment = typeof kpayPaymentsTable.$inferInsert;

// ─── Garage Mobile Money accounts ────────────────────────────────────────────

export const garageMomoAccountsTable = pgTable("garage_momo_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),

  garageId: integer("garage_id")
    .notNull()
    .references(() => garagesTable.id, { onDelete: "cascade" }),

  /** Mobile Money operator: 'MTN' or 'AIRTEL'. */
  provider: text("provider").notNull(),

  /** Full international phone number, e.g. +242066000000. */
  phoneNumber: text("phone_number").notNull(),

  /** True once the OTP has been verified successfully. */
  isVerified: boolean("is_verified").notNull().default(false),

  /** Timestamp of successful OTP verification. */
  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// One active account per (garage, provider) — enforced at DB level
// via the upsert conflict target in the routes.

export type GarageMomoAccount = typeof garageMomoAccountsTable.$inferSelect;
export type InsertGarageMomoAccount = typeof garageMomoAccountsTable.$inferInsert;

// ─── Maintenance records (carnet d'entretien) ────────────────────────────────

export const maintenanceRecordsTable = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),

  clientId: varchar("client_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  garageId: integer("garage_id").references(() => garagesTable.id, {
    onDelete: "set null",
  }),

  /** Link to the payment that triggered this record. */
  paymentId: integer("payment_id")
    .notNull()
    .references(() => kpayPaymentsTable.id, { onDelete: "cascade" }),

  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

  /** Equals the payment's paidAt timestamp. */
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MaintenanceRecord = typeof maintenanceRecordsTable.$inferSelect;
export type InsertMaintenanceRecord =
  typeof maintenanceRecordsTable.$inferInsert;
