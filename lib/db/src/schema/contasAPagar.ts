import { pgTable, text, serial, timestamp, numeric, integer, date, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statusContaAPagarEnum = pgEnum("status_conta_a_pagar", ["pendente", "pago", "vencido", "cancelado"]);

export const contasAPagarTable = pgTable("contas_a_pagar", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  fornecedor: text("fornecedor"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  dataVencimento: date("data_vencimento", { mode: "string" }).notNull(),
  dataPagamento: date("data_pagamento", { mode: "string" }),
  valorPago: numeric("valor_pago", { precision: 15, scale: 2 }),
  status: statusContaAPagarEnum("status").notNull().default("pendente"),
  observacoes: text("observacoes"),
  categoriaId: integer("categoria_id"),
  contaId: integer("conta_id"),
  recorrente: boolean("recorrente").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContaAPagarSchema = createInsertSchema(contasAPagarTable).omit({ id: true, createdAt: true });
export type InsertContaAPagar = z.infer<typeof insertContaAPagarSchema>;
export type ContaAPagar = typeof contasAPagarTable.$inferSelect;
