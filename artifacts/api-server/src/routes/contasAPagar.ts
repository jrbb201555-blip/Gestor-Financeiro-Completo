import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";

function toDateStr(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}
import { db, contasAPagarTable, categoriasTable, contasTable } from "@workspace/db";
import {
  ListContasAPagarQueryParams,
  CreateContaAPagarBody,
  GetContaAPagarParams,
  UpdateContaAPagarParams,
  UpdateContaAPagarBody,
  DeleteContaAPagarParams,
  PagarContaAPagarParams,
  PagarContaAPagarBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contas-a-pagar", async (req, res): Promise<void> => {
  const parsed = ListContasAPagarQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, dataInicio, dataFim, busca, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const today = new Date().toISOString().slice(0, 10);

  const conditions = [];
  if (status) {
    conditions.push(eq(contasAPagarTable.status, status));
  } else {
    // Auto-mark overdue
    await db.update(contasAPagarTable).set({ status: "vencido" }).where(
      and(eq(contasAPagarTable.status, "pendente"), sql`${contasAPagarTable.dataVencimento} < ${today}`)
    );
  }
  const dataInicioStr = toDateStr(dataInicio as unknown as Date | string);
  const dataFimStr = toDateStr(dataFim as unknown as Date | string);
  if (dataInicioStr) conditions.push(gte(contasAPagarTable.dataVencimento, dataInicioStr));
  if (dataFimStr) conditions.push(lte(contasAPagarTable.dataVencimento, dataFimStr));
  if (busca) {
    conditions.push(or(
      ilike(contasAPagarTable.descricao, `%${busca}%`),
      ilike(contasAPagarTable.fornecedor, `%${busca}%`),
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows, pendente, vencido] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contasAPagarTable).where(whereClause),
    db.select({
      cp: contasAPagarTable,
      catNome: categoriasTable.nome,
      contaNome: contasTable.nome,
    })
      .from(contasAPagarTable)
      .leftJoin(categoriasTable, eq(contasAPagarTable.categoriaId, categoriasTable.id))
      .leftJoin(contasTable, eq(contasAPagarTable.contaId, contasTable.id))
      .where(whereClause)
      .orderBy(contasAPagarTable.dataVencimento)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAPagarTable).where(eq(contasAPagarTable.status, "pendente")),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAPagarTable).where(eq(contasAPagarTable.status, "vencido")),
  ]);

  res.json({
    data: rows.map(r => formatContaAPagar(r.cp, r.catNome, r.contaNome)),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
    totalPendente: parseFloat(pendente[0]?.total ?? "0"),
    totalVencido: parseFloat(vencido[0]?.total ?? "0"),
  });
});

router.post("/contas-a-pagar", async (req, res): Promise<void> => {
  const parsed = CreateContaAPagarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cp] = await db.insert(contasAPagarTable).values({
    descricao: parsed.data.descricao,
    fornecedor: parsed.data.fornecedor ?? null,
    valor: String(parsed.data.valor),
    dataVencimento: toDateStr(parsed.data.dataVencimento as unknown as Date | string) ?? "",
    observacoes: parsed.data.observacoes ?? null,
    categoriaId: parsed.data.categoriaId ?? null,
    contaId: parsed.data.contaId ?? null,
    recorrente: parsed.data.recorrente ?? false,
  }).returning();

  const [row] = await fetchContaAPagarById(cp.id);
  res.status(201).json(formatContaAPagar(row.cp, row.catNome, row.contaNome));
});

router.get("/contas-a-pagar/:id", async (req, res): Promise<void> => {
  const params = GetContaAPagarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await fetchContaAPagarById(params.data.id);
  if (!rows.length) {
    res.status(404).json({ error: "Conta a pagar não encontrada" });
    return;
  }
  res.json(formatContaAPagar(rows[0].cp, rows[0].catNome, rows[0].contaNome));
});

router.patch("/contas-a-pagar/:id", async (req, res): Promise<void> => {
  const params = UpdateContaAPagarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContaAPagarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.descricao !== undefined) updateData.descricao = parsed.data.descricao;
  if (parsed.data.fornecedor !== undefined) updateData.fornecedor = parsed.data.fornecedor;
  if (parsed.data.valor !== undefined) updateData.valor = String(parsed.data.valor);
  if (parsed.data.dataVencimento !== undefined) updateData.dataVencimento = parsed.data.dataVencimento;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.observacoes !== undefined) updateData.observacoes = parsed.data.observacoes;
  if ("categoriaId" in parsed.data) updateData.categoriaId = parsed.data.categoriaId;
  if ("contaId" in parsed.data) updateData.contaId = parsed.data.contaId;
  if (parsed.data.recorrente !== undefined) updateData.recorrente = parsed.data.recorrente;

  const [cp] = await db.update(contasAPagarTable).set(updateData).where(eq(contasAPagarTable.id, params.data.id)).returning();
  if (!cp) {
    res.status(404).json({ error: "Conta a pagar não encontrada" });
    return;
  }
  const rows = await fetchContaAPagarById(cp.id);
  res.json(formatContaAPagar(rows[0].cp, rows[0].catNome, rows[0].contaNome));
});

router.delete("/contas-a-pagar/:id", async (req, res): Promise<void> => {
  const params = DeleteContaAPagarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(contasAPagarTable).where(eq(contasAPagarTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/contas-a-pagar/:id/pagar", async (req, res): Promise<void> => {
  const params = PagarContaAPagarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = PagarContaAPagarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(contasAPagarTable).where(eq(contasAPagarTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Conta a pagar não encontrada" });
    return;
  }

  const valorPago = parsed.data.valorPago ?? parseFloat(existing.valor);
  const [cp] = await db.update(contasAPagarTable).set({
    status: "pago",
    dataPagamento: toDateStr(parsed.data.dataPagamento as unknown as Date | string),
    valorPago: String(valorPago),
    contaId: parsed.data.contaId ?? existing.contaId,
  }).where(eq(contasAPagarTable.id, params.data.id)).returning();

  const rows = await fetchContaAPagarById(cp.id);
  res.json(formatContaAPagar(rows[0].cp, rows[0].catNome, rows[0].contaNome));
});

async function fetchContaAPagarById(id: number) {
  return db.select({
    cp: contasAPagarTable,
    catNome: categoriasTable.nome,
    contaNome: contasTable.nome,
  })
    .from(contasAPagarTable)
    .leftJoin(categoriasTable, eq(contasAPagarTable.categoriaId, categoriasTable.id))
    .leftJoin(contasTable, eq(contasAPagarTable.contaId, contasTable.id))
    .where(eq(contasAPagarTable.id, id));
}

function formatContaAPagar(
  cp: typeof contasAPagarTable.$inferSelect,
  catNome: string | null | undefined,
  contaNome: string | null | undefined,
) {
  return {
    id: cp.id,
    descricao: cp.descricao,
    fornecedor: cp.fornecedor ?? null,
    valor: parseFloat(cp.valor),
    dataVencimento: cp.dataVencimento,
    dataPagamento: cp.dataPagamento ?? null,
    valorPago: cp.valorPago ? parseFloat(cp.valorPago) : null,
    status: cp.status,
    observacoes: cp.observacoes ?? null,
    categoriaId: cp.categoriaId ?? null,
    categoriaNome: catNome ?? null,
    contaId: cp.contaId ?? null,
    contaNome: contaNome ?? null,
    recorrente: cp.recorrente,
    createdAt: cp.createdAt.toISOString(),
  };
}

export default router;
