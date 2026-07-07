import { Router, type IRouter } from "express";
import { and, eq, gte, lte, lt, sql, or, desc } from "drizzle-orm";
import { db, transacoesTable, contasTable, contasAPagarTable, contasAReceberTable, categoriasTable } from "@workspace/db";
import { GetDashboardResumoQueryParams, GetGraficoMensalQueryParams, GetGraficoPorCategoriaQueryParams, GetUltimasTransacoesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/resumo", async (req, res): Promise<void> => {
  const parsed = GetDashboardResumoQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const mes = parsed.data.mes ?? (now.getMonth() + 1);
  const ano = parsed.data.ano ?? now.getFullYear();

  const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const nextMonth = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  // Mês anterior para variação
  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anoPrev = mes === 1 ? ano - 1 : ano;
  const dataInicioPrev = `${anoPrev}-${String(mesPrev).padStart(2, "0")}-01`;
  const dataFimPrev = dataInicio;

  const [receitasMes, despesasMes, receitasPrev, despesasPrev, saldoContas, pendentePagar, pendenteReceber] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(transacoesTable).where(and(eq(transacoesTable.tipo, "receita"), eq(transacoesTable.status, "confirmado"), gte(transacoesTable.data, dataInicio), lt(transacoesTable.data, nextMonth))),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(transacoesTable).where(and(eq(transacoesTable.tipo, "despesa"), eq(transacoesTable.status, "confirmado"), gte(transacoesTable.data, dataInicio), lt(transacoesTable.data, nextMonth))),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(transacoesTable).where(and(eq(transacoesTable.tipo, "receita"), eq(transacoesTable.status, "confirmado"), gte(transacoesTable.data, dataInicioPrev), lt(transacoesTable.data, dataFimPrev))),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(transacoesTable).where(and(eq(transacoesTable.tipo, "despesa"), eq(transacoesTable.status, "confirmado"), gte(transacoesTable.data, dataInicioPrev), lt(transacoesTable.data, dataFimPrev))),
    db.select({ total: sql<string>`coalesce(sum(saldo_atual::numeric), 0)` }).from(contasTable).where(eq(contasTable.ativa, true)),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAPagarTable).where(or(eq(contasAPagarTable.status, "pendente"), eq(contasAPagarTable.status, "vencido"))),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAReceberTable).where(or(eq(contasAReceberTable.status, "pendente"), eq(contasAReceberTable.status, "vencido"))),
  ]);

  const recMes = parseFloat(receitasMes[0]?.total ?? "0");
  const desMes = parseFloat(despesasMes[0]?.total ?? "0");
  const recPrev = parseFloat(receitasPrev[0]?.total ?? "0");
  const desPrev = parseFloat(despesasPrev[0]?.total ?? "0");
  const saldoMes = recMes - desMes;
  const saldoPrev = recPrev - desPrev;

  const pct = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100;

  res.json({
    receitasMes: recMes,
    despesasMes: desMes,
    saldoMes,
    totalContasAPagarPendente: parseFloat(pendentePagar[0]?.total ?? "0"),
    totalContasAReceberPendente: parseFloat(pendenteReceber[0]?.total ?? "0"),
    saldoTotalContas: parseFloat(saldoContas[0]?.total ?? "0"),
    variacao: {
      receitas: pct(recMes, recPrev),
      despesas: pct(desMes, desPrev),
      saldo: pct(saldoMes, saldoPrev),
    },
  });
});

router.get("/dashboard/grafico-mensal", async (req, res): Promise<void> => {
  const parsed = GetGraficoMensalQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ano = parsed.data.ano ?? new Date().getFullYear();
  const dataInicio = `${ano}-01-01`;
  const dataFim = `${ano}-12-31`;

  const rows = await db.select({
    mes: sql<string>`to_char(date_trunc('month', ${transacoesTable.data}::date), 'YYYY-MM')`,
    receitas: sql<string>`coalesce(sum(case when tipo = 'receita' then valor::numeric else 0 end), 0)`,
    despesas: sql<string>`coalesce(sum(case when tipo = 'despesa' then valor::numeric else 0 end), 0)`,
  })
    .from(transacoesTable)
    .where(and(eq(transacoesTable.status, "confirmado"), gte(transacoesTable.data, dataInicio), lte(transacoesTable.data, dataFim)))
    .groupBy(sql`date_trunc('month', ${transacoesTable.data}::date)`)
    .orderBy(sql`date_trunc('month', ${transacoesTable.data}::date)`);

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const result = rows.map(r => {
    const receitas = parseFloat(r.receitas);
    const despesas = parseFloat(r.despesas);
    const mesNum = parseInt(r.mes.split("-")[1]) - 1;
    return { mes: meses[mesNum], receitas, despesas, saldo: receitas - despesas };
  });

  res.json(result);
});

router.get("/dashboard/por-categoria", async (req, res): Promise<void> => {
  const parsed = GetGraficoPorCategoriaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tipo, mes, ano } = parsed.data;
  const now = new Date();
  const m = mes ?? (now.getMonth() + 1);
  const y = ano ?? now.getFullYear();
  const dataInicio = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const rows = await db.select({
    categoriaId: categoriasTable.id,
    categoriaNome: categoriasTable.nome,
    cor: categoriasTable.cor,
    icone: categoriasTable.icone,
    total: sql<string>`coalesce(sum(${transacoesTable.valor}::numeric), 0)`,
  })
    .from(transacoesTable)
    .innerJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
    .where(and(
      eq(transacoesTable.tipo, tipo),
      eq(transacoesTable.status, "confirmado"),
      gte(transacoesTable.data, dataInicio),
      lt(transacoesTable.data, nextMonth),
    ))
    .groupBy(categoriasTable.id, categoriasTable.nome, categoriasTable.cor, categoriasTable.icone)
    .orderBy(sql`sum(${transacoesTable.valor}::numeric) desc`);

  const totalGeral = rows.reduce((s, r) => s + parseFloat(r.total), 0);
  res.json(rows.map(r => ({
    categoriaId: r.categoriaId,
    categoriaNome: r.categoriaNome,
    cor: r.cor,
    icone: r.icone,
    total: parseFloat(r.total),
    percentual: totalGeral > 0 ? (parseFloat(r.total) / totalGeral) * 100 : 0,
  })));
});

router.get("/dashboard/ultimas-transacoes", async (req, res): Promise<void> => {
  const parsed = GetUltimasTransacoesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const limit = parsed.data.limit ?? 10;
  const rows = await db.select({
    t: transacoesTable,
    catNome: categoriasTable.nome,
    catIcone: categoriasTable.icone,
    catCor: categoriasTable.cor,
    contaNome: contasTable.nome,
  })
    .from(transacoesTable)
    .leftJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
    .leftJoin(contasTable, eq(transacoesTable.contaId, contasTable.id))
    .orderBy(desc(transacoesTable.data), desc(transacoesTable.createdAt))
    .limit(limit);

  res.json(rows.map(r => ({
    id: r.t.id,
    descricao: r.t.descricao,
    valor: parseFloat(r.t.valor),
    tipo: r.t.tipo,
    data: r.t.data,
    status: r.t.status,
    observacoes: r.t.observacoes ?? null,
    categoriaId: r.t.categoriaId ?? null,
    categoriaNome: r.catNome ?? null,
    categoriaIcone: r.catIcone ?? null,
    categoriaCor: r.catCor ?? null,
    contaId: r.t.contaId ?? null,
    contaNome: r.contaNome ?? null,
    createdAt: r.t.createdAt.toISOString(),
  })));
});

router.get("/dashboard/alertas", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [vencidasP, vencidasR, hojeP, hojeR, semanaP, semanaR, totalV] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contasAPagarTable).where(eq(contasAPagarTable.status, "vencido")),
    db.select({ count: sql<number>`count(*)::int` }).from(contasAReceberTable).where(eq(contasAReceberTable.status, "vencido")),
    db.select({ count: sql<number>`count(*)::int` }).from(contasAPagarTable).where(and(eq(contasAPagarTable.status, "pendente"), eq(contasAPagarTable.dataVencimento, today))),
    db.select({ count: sql<number>`count(*)::int` }).from(contasAReceberTable).where(and(eq(contasAReceberTable.status, "pendente"), eq(contasAReceberTable.dataVencimento, today))),
    db.select({ count: sql<number>`count(*)::int` }).from(contasAPagarTable).where(and(eq(contasAPagarTable.status, "pendente"), gte(contasAPagarTable.dataVencimento, today), lte(contasAPagarTable.dataVencimento, weekLater))),
    db.select({ count: sql<number>`count(*)::int` }).from(contasAReceberTable).where(and(eq(contasAReceberTable.status, "pendente"), gte(contasAReceberTable.dataVencimento, today), lte(contasAReceberTable.dataVencimento, weekLater))),
    db.select({ total: sql<string>`coalesce(sum(valor::numeric), 0)` }).from(contasAPagarTable).where(eq(contasAPagarTable.status, "vencido")),
  ]);

  res.json({
    contasVencidas: (vencidasP[0]?.count ?? 0) + (vencidasR[0]?.count ?? 0),
    contasVencendoHoje: (hojeP[0]?.count ?? 0) + (hojeR[0]?.count ?? 0),
    contasVencendoSemana: (semanaP[0]?.count ?? 0) + (semanaR[0]?.count ?? 0),
    totalVencido: parseFloat(totalV[0]?.total ?? "0"),
  });
});

export default router;
