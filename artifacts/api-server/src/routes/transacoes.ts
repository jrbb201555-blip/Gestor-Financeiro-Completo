import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql, desc } from "drizzle-orm";
import { db, transacoesTable, categoriasTable, contasTable } from "@workspace/db";

// Convert Date or string to YYYY-MM-DD string
function toDateStr(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}
import {
  ListTransacoesQueryParams,
  CreateTransacaoBody,
  GetTransacaoParams,
  UpdateTransacaoParams,
  UpdateTransacaoBody,
  DeleteTransacaoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transacoes", async (req, res): Promise<void> => {
  const parsed = ListTransacoesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tipo, categoriaId, contaId, status, dataInicio, dataFim, busca, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (tipo) conditions.push(eq(transacoesTable.tipo, tipo));
  if (categoriaId != null) conditions.push(eq(transacoesTable.categoriaId, categoriaId));
  if (contaId != null) conditions.push(eq(transacoesTable.contaId, contaId));
  if (status) conditions.push(eq(transacoesTable.status, status));
  const dataInicioStr = toDateStr(dataInicio as unknown as Date | string);
  const dataFimStr = toDateStr(dataFim as unknown as Date | string);
  if (dataInicioStr) conditions.push(gte(transacoesTable.data, dataInicioStr));
  if (dataFimStr) conditions.push(lte(transacoesTable.data, dataFimStr));
  if (busca) {
    conditions.push(or(
      ilike(transacoesTable.descricao, `%${busca}%`),
      ilike(transacoesTable.observacoes, `%${busca}%`),
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(transacoesTable).where(whereClause),
    db.select({
      t: transacoesTable,
      catNome: categoriasTable.nome,
      catIcone: categoriasTable.icone,
      catCor: categoriasTable.cor,
      contaNome: contasTable.nome,
    })
      .from(transacoesTable)
      .leftJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
      .leftJoin(contasTable, eq(transacoesTable.contaId, contasTable.id))
      .where(whereClause)
      .orderBy(desc(transacoesTable.data), desc(transacoesTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  res.json({
    data: rows.map(r => formatTransacao(r.t, r.catNome, r.catIcone, r.catCor, r.contaNome)),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  });
});

router.post("/transacoes", async (req, res): Promise<void> => {
  const parsed = CreateTransacaoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [t] = await db.insert(transacoesTable).values({
    descricao: parsed.data.descricao,
    valor: String(parsed.data.valor),
    tipo: parsed.data.tipo,
    data: toDateStr(parsed.data.data as unknown as Date | string) ?? new Date().toISOString().slice(0, 10),
    status: parsed.data.status ?? "confirmado",
    observacoes: parsed.data.observacoes ?? null,
    categoriaId: parsed.data.categoriaId ?? null,
    contaId: parsed.data.contaId ?? null,
  }).returning();

  // Update account balance
  if (t.contaId) {
    await updateSaldoConta(t.contaId);
  }

  const [row] = await db.select({
    t: transacoesTable,
    catNome: categoriasTable.nome,
    catIcone: categoriasTable.icone,
    catCor: categoriasTable.cor,
    contaNome: contasTable.nome,
  })
    .from(transacoesTable)
    .leftJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
    .leftJoin(contasTable, eq(transacoesTable.contaId, contasTable.id))
    .where(eq(transacoesTable.id, t.id));

  res.status(201).json(formatTransacao(row.t, row.catNome, row.catIcone, row.catCor, row.contaNome));
});

router.get("/transacoes/:id", async (req, res): Promise<void> => {
  const params = GetTransacaoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select({
    t: transacoesTable,
    catNome: categoriasTable.nome,
    catIcone: categoriasTable.icone,
    catCor: categoriasTable.cor,
    contaNome: contasTable.nome,
  })
    .from(transacoesTable)
    .leftJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
    .leftJoin(contasTable, eq(transacoesTable.contaId, contasTable.id))
    .where(eq(transacoesTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }
  res.json(formatTransacao(row.t, row.catNome, row.catIcone, row.catCor, row.contaNome));
});

router.patch("/transacoes/:id", async (req, res): Promise<void> => {
  const params = UpdateTransacaoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTransacaoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Fetch old record to handle account balance updates on contaId changes
  const [oldT] = await db.select().from(transacoesTable).where(eq(transacoesTable.id, params.data.id));
  if (!oldT) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.descricao !== undefined) updateData.descricao = parsed.data.descricao;
  if (parsed.data.valor !== undefined) updateData.valor = String(parsed.data.valor);
  if (parsed.data.tipo !== undefined) updateData.tipo = parsed.data.tipo;
  if (parsed.data.data !== undefined) updateData.data = toDateStr(parsed.data.data as unknown as Date | string);
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.observacoes !== undefined) updateData.observacoes = parsed.data.observacoes;
  if ("categoriaId" in parsed.data) updateData.categoriaId = parsed.data.categoriaId;
  if ("contaId" in parsed.data) updateData.contaId = parsed.data.contaId;

  const [t] = await db.update(transacoesTable).set(updateData).where(eq(transacoesTable.id, params.data.id)).returning();
  if (!t) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }

  // Update both old and new account balances if account changed
  const affectedContas = new Set<number>();
  if (oldT.contaId) affectedContas.add(oldT.contaId);
  if (t.contaId) affectedContas.add(t.contaId);
  for (const cId of affectedContas) await updateSaldoConta(cId);

  const [row] = await db.select({
    t: transacoesTable,
    catNome: categoriasTable.nome,
    catIcone: categoriasTable.icone,
    catCor: categoriasTable.cor,
    contaNome: contasTable.nome,
  })
    .from(transacoesTable)
    .leftJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
    .leftJoin(contasTable, eq(transacoesTable.contaId, contasTable.id))
    .where(eq(transacoesTable.id, t.id));

  res.json(formatTransacao(row.t, row.catNome, row.catIcone, row.catCor, row.contaNome));
});

router.delete("/transacoes/:id", async (req, res): Promise<void> => {
  const params = DeleteTransacaoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [t] = await db.delete(transacoesTable).where(eq(transacoesTable.id, params.data.id)).returning();
  if (t?.contaId) await updateSaldoConta(t.contaId);
  res.sendStatus(204);
});

async function updateSaldoConta(contaId: number) {
  const [saldo] = await db.select({
    total: sql<string>`
      coalesce(sum(case when tipo = 'receita' then valor::numeric else -valor::numeric end), 0)
    `,
  }).from(transacoesTable).where(
    and(eq(transacoesTable.contaId, contaId), eq(transacoesTable.status, "confirmado"))
  );

  const [conta] = await db.select().from(contasTable).where(eq(contasTable.id, contaId));
  if (!conta) return;

  const novoSaldo = parseFloat(conta.saldoInicial) + parseFloat(saldo?.total ?? "0");
  await db.update(contasTable).set({ saldoAtual: String(novoSaldo) }).where(eq(contasTable.id, contaId));
}

function formatTransacao(
  t: typeof transacoesTable.$inferSelect,
  catNome: string | null | undefined,
  catIcone: string | null | undefined,
  catCor: string | null | undefined,
  contaNome: string | null | undefined,
) {
  return {
    id: t.id,
    descricao: t.descricao,
    valor: parseFloat(t.valor),
    tipo: t.tipo,
    data: t.data,
    status: t.status,
    observacoes: t.observacoes ?? null,
    categoriaId: t.categoriaId ?? null,
    categoriaNome: catNome ?? null,
    categoriaIcone: catIcone ?? null,
    categoriaCor: catCor ?? null,
    contaId: t.contaId ?? null,
    contaNome: contaNome ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

export default router;
