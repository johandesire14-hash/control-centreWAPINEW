import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * deletion_reasons — enregistre le motif de suppression de compte avant anonymisation.
 * userId est conservé à titre d'audit ; les données personnelles sont effacées séparément.
 */
export const deletionReasonsTable = pgTable("deletion_reasons", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  reasonDetail: text("reason_detail"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InsertDeletionReason = typeof deletionReasonsTable.$inferInsert;
