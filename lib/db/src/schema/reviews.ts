import { integer, pgTable, serial, text, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { garagesTable } from "./garages";
import { invoicesTable } from "./invoices";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  garageId: integer("garage_id")
    .notNull()
    .references(() => garagesTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  qualityRating: integer("quality_rating").notNull(),
  honestyRating: integer("honesty_rating").notNull(),
  punctualityRating: integer("punctuality_rating").notNull(),
  valueRating: integer("value_rating").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("reviews_invoice_unique").on(table.invoiceId)]);

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
