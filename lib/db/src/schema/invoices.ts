import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { garagesTable } from "./garages";
import { conversationsTable } from "./conversations";

export const invoiceStatuses = [
  "issued",
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoicesTable = pgTable("invoices", {
  /** Opaque identifier shared in QR codes and payment links. */
  id: uuid("id").defaultRandom().primaryKey(),
  /** Garage that issued the invoice. */
  garageId: integer("garage_id")
    .notNull()
    .references(() => garagesTable.id, { onDelete: "cascade" }),
  /** Client who requested/received the service. */
  clientId: varchar("client_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  /** Conversation/request that originated this invoice. */
  conversationId: integer("conversation_id").references(() => conversationsTable.id, {
    onDelete: "set null",
  }),
  /** Server-side amount in the smallest currency unit. */
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("XAF"),
  description: text("description"),
  status: text("status").$type<InvoiceStatus>().notNull().default("issued"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  kpayTransactionId: varchar("kpay_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;
