import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";

function toDateStr(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}
import { db, contasAReceberTable, categoriasTable, contasTable } from "@workspace/db";
import {
  ListContasAReceberQueryParams,
  CreateContaAReceberBody,
  GetContaAReceberParams,
  UpdateContaAReceberParams,
  UpdateContaAReceberBody,
  DeleteContaAReceberParams,
  ReceberContaAReceberParams,
  ReceberContaAReceberBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contas-a-receber", async (req, res): Promise<void> => {
  const parsed = ListContasAReceberQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, dataInicio, dataFim, busca, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const today = new Date().toISOString().slice(0, 10);

  const conditions = [];
  if (status) {
    conditions.push(eq(contasAReceberTable.status, status));
  } else {
    await db.update(contasAReceberTable).set({ status: "vencido" }).where(
      and(eq(contasAReceberTable.status, "pendente"), sql`${contasAReceberTable.dataVencimento} < ${today}`)
    );
  }
  const dataInicioStr = toDateStr(dataInicio as unknown as Date | string);
  const dataFimStr = toDateStr(dataFim as unknown as Date | string);
  if (dataInicioStr) conditions.push(gte(contasAReceberTable.dataVencimento, dataInicioStr));
  if (dataFimStr) conditions.push(lte(contasAReceberTable.dataVencimento, dataFimStr));
  if (busca) {
    conditions.push(or(
      ilike(contasAReceberTable.descricao, `%${busca}%`),
      ilike(contasAReceberTable.cliente, `%${busca}%`),
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows, pendente, vencido] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contasAReceberTable).where(whereClause),
    db.select({
      cr: contasAReceberTable,
      catNome: categoriasTable.nome,
      contaNome: contasTable.nome,
    })
      .from(contasAReceberTable)
      .leftJoin(categoriasTable, eq(contasAReceberTable.categoriaId, categoriasTable.id))
      .leftJoin(contasTable, eq(contasAReceberTable.contaId, contasTable.id))
      .where(whereClause)
      .orderBy(contasAReceberTable.dataVencimento)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAReceberTable).where(eq(contasAReceberTable.status, "pendente")),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAReceberTable).where(eq(contasAReceberTable.status, "vencido")),
  ]);

  res.json({
    data: rows.map(r => formatContaAReceber(r.cr, r.catNome, r.contaNome)),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
    totalPendente: parseFloat(pendente[0]?.total ?? "0"),
    totalVencido: parseFloat(vencido[0]?.total ?? "0"),
  });
});

router.post("/contas-a-receber", async (req, res): Promise<void> => {
  const parsed = CreateContaAReceberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cr] = await db.insert(contasAReceberTable).values({
    descricao: parsed.data.descricao,
    cliente: parsed.data.cliente ?? null,
    valor: String(parsed.data.valor),
    dataVencimento: toDateStr(parsed.data.dataVencimento as unknown as Date | string) ?? "",
    observacoes: parsed.data.observacoes ?? null,
    categoriaId: parsed.data.categoriaId ?? null,
    contaId: parsed.data.contaId ?? null,
    recorrente: parsed.data.recorrente ?? false,
  }).returning();

  const rows = await fetchContaAReceberById(cr.id);
  res.status(201).json(formatContaAReceber(rows[0].cr, rows[0].catNome, rows[0].contaNome));
});

router.get("/contas-a-receber/:id", async (req, res): Promise<void> => {
  const params = GetContaAReceberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await fetchContaAReceberById(params.data.id);
  if (!rows.length) {
    res.status(404).json({ error: "Conta a receber não encontrada" });
    return;
  }
  res.json(formatContaAReceber(rows[0].cr, rows[0].catNome, rows[0].contaNome));
});

router.patch("/contas-a-receber/:id", async (req, res): Promise<void> => {
  const params = UpdateContaAReceberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContaAReceberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.descricao !== undefined) updateData.descricao = parsed.data.descricao;
  if (parsed.data.cliente !== undefined) updateData.cliente = parsed.data.cliente;
  if (parsed.data.valor !== undefined) updateData.valor = String(parsed.data.valor);
  if (parsed.data.dataVencimento !== undefined) updateData.dataVencimento = parsed.data.dataVencimento;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.observacoes !== undefined) updateData.observacoes = parsed.data.observacoes;
  if ("categoriaId" in parsed.data) updateData.categoriaId = parsed.data.categoriaId;
  if ("contaId" in parsed.data) updateData.contaId = parsed.data.contaId;
  if (parsed.data.recorrente !== undefined) updateData.recorrente = parsed.data.recorrente;

  const [cr] = await db.update(contasAReceberTable).set(updateData).where(eq(contasAReceberTable.id, params.data.id)).returning();
  if (!cr) {
    res.status(404).json({ error: "Conta a receber não encontrada" });
    return;
  }
  const rows = await fetchContaAReceberById(cr.id);
  res.json(formatContaAReceber(rows[0].cr, rows[0].catNome, rows[0].contaNome));
});

router.delete("/contas-a-receber/:id", async (req, res): Promise<void> => {
  const params = DeleteContaAReceberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(contasAReceberTable).where(eq(contasAReceberTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/contas-a-receber/:id/receber", async (req, res): Promise<void> => {
  const params = ReceberContaAReceberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReceberContaAReceberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(contasAReceberTable).where(eq(contasAReceberTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Conta a receber não encontrada" });
    return;
  }

  const valorRecebido = parsed.data.valorRecebido ?? parseFloat(existing.valor);
  const [cr] = await db.update(contasAReceberTable).set({
    status: "recebido",
    dataRecebimento: toDateStr(parsed.data.dataRecebimento as unknown as Date | string),
    valorRecebido: String(valorRecebido),
    contaId: parsed.data.contaId ?? existing.contaId,
  }).where(eq(contasAReceberTable.id, params.data.id)).returning();

  const rows = await fetchContaAReceberById(cr.id);
  res.json(formatContaAReceber(rows[0].cr, rows[0].catNome, rows[0].contaNome));
});

async function fetchContaAReceberById(id: number) {
  return db.select({
    cr: contasAReceberTable,
    catNome: categoriasTable.nome,
    contaNome: contasTable.nome,
  })
    .from(contasAReceberTable)
    .leftJoin(categoriasTable, eq(contasAReceberTable.categoriaId, categoriasTable.id))
    .leftJoin(contasTable, eq(contasAReceberTable.contaId, contasTable.id))
    .where(eq(contasAReceberTable.id, id));
}

function formatContaAReceber(
  cr: typeof contasAReceberTable.$inferSelect,
  catNome: string | null | undefined,
  contaNome: string | null | undefined,
) {
  return {
    id: cr.id,
    descricao: cr.descricao,
    cliente: cr.cliente ?? null,
    valor: parseFloat(cr.valor),
    dataVencimento: cr.dataVencimento,
    dataRecebimento: cr.dataRecebimento ?? null,
    valorRecebido: cr.valorRecebido ? parseFloat(cr.valorRecebido) : null,
    status: cr.status,
    observacoes: cr.observacoes ?? null,
    categoriaId: cr.categoriaId ?? null,
    categoriaNome: catNome ?? null,
    contaId: cr.contaId ?? null,
    contaNome: contaNome ?? null,
    recorrente: cr.recorrente,
    createdAt: cr.createdAt.toISOString(),
  };
}

export default router;
