import { pgTable, text, serial, timestamp, numeric, integer, date, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statusContaAReceberEnum = pgEnum("status_conta_a_receber", ["pendente", "recebido", "vencido", "cancelado"]);

export const contasAReceberTable = pgTable("contas_a_receber", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  cliente: text("cliente"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  dataVencimento: date("data_vencimento", { mode: "string" }).notNull(),
  dataRecebimento: date("data_recebimento", { mode: "string" }),
  valorRecebido: numeric("valor_recebido", { precision: 15, scale: 2 }),
  status: statusContaAReceberEnum("status").notNull().default("pendente"),
  observacoes: text("observacoes"),
  categoriaId: integer("categoria_id"),
  contaId: integer("conta_id"),
  recorrente: boolean("recorrente").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContaAReceberSchema = createInsertSchema(contasAReceberTable).omit({ id: true, createdAt: true });
export type InsertContaAReceber = z.infer<typeof insertContaAReceberSchema>;
export type ContaAReceber = typeof contasAReceberTable.$inferSelect;
