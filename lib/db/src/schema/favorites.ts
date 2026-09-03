import { integer, pgTable, serial, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { garagesTable } from "./garages";

export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id),
    garageId: integer("garage_id")
      .notNull()
      .references(() => garagesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.garageId)],
);

export type Favorite = typeof favoritesTable.$inferSelect;
export type InsertFavorite = typeof favoritesTable.$inferInsert;
