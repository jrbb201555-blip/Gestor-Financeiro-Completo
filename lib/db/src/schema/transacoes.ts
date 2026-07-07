import { pgTable, text, serial, timestamp, numeric, integer, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statusTransacaoEnum = pgEnum("status_transacao", ["pendente", "confirmado", "cancelado"]);

export const transacoesTable = pgTable("transacoes", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  tipo: text("tipo").notNull(), // receita | despesa
  data: date("data", { mode: "string" }).notNull(),
  status: statusTransacaoEnum("status").notNull().default("confirmado"),
  observacoes: text("observacoes"),
  categoriaId: integer("categoria_id"),
  contaId: integer("conta_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransacaoSchema = createInsertSchema(transacoesTable).omit({ id: true, createdAt: true });
export type InsertTransacao = z.infer<typeof insertTransacaoSchema>;
export type Transacao = typeof transacoesTable.$inferSelect;
