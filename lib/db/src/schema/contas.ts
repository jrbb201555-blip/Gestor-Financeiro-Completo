import { pgTable, text, serial, timestamp, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tipoContaEnum = pgEnum("tipo_conta", ["corrente", "poupanca", "investimento", "carteira", "outro"]);

export const contasTable = pgTable("contas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: tipoContaEnum("tipo").notNull().default("corrente"),
  banco: text("banco"),
  saldoInicial: numeric("saldo_inicial", { precision: 15, scale: 2 }).notNull().default("0"),
  saldoAtual: numeric("saldo_atual", { precision: 15, scale: 2 }).notNull().default("0"),
  cor: text("cor"),
  ativa: boolean("ativa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContaSchema = createInsertSchema(contasTable).omit({ id: true, createdAt: true });
export type InsertConta = z.infer<typeof insertContaSchema>;
export type Conta = typeof contasTable.$inferSelect;
