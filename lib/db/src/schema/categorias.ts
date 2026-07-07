import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tipoTransacaoEnum = pgEnum("tipo_transacao", ["receita", "despesa"]);

export const categoriasTable = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: tipoTransacaoEnum("tipo").notNull(),
  cor: text("cor").notNull().default("#6366f1"),
  icone: text("icone").notNull().default("tag"),
  descricao: text("descricao"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCategoriaSchema = createInsertSchema(categoriasTable).omit({ id: true, createdAt: true });
export type InsertCategoria = z.infer<typeof insertCategoriaSchema>;
export type Categoria = typeof categoriasTable.$inferSelect;
