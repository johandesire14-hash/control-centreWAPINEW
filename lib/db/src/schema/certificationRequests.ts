import { sql } from "drizzle-orm";
import { jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const certificationRequestsTable = pgTable("certification_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id),
  documentUrls: jsonb("document_urls").notNull().default(sql`'[]'::jsonb`),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CertificationRequest = typeof certificationRequestsTable.$inferSelect;
export type InsertCertificationRequest = typeof certificationRequestsTable.$inferInsert;
