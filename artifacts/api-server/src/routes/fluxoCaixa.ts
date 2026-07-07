import { Router, type IRouter } from "express";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { db, transacoesTable } from "@workspace/db";
import { GetFluxoCaixaQueryParams } from "@workspace/api-zod";

function toDateStr(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

const router: IRouter = Router();

router.get("/fluxo-caixa", async (req, res): Promise<void> => {
  const parsed = GetFluxoCaixaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { dataInicio, dataFim, agrupamento = "mes" } = parsed.data;

  let truncFn: string;
  if (agrupamento === "dia") truncFn = "day";
  else if (agrupamento === "semana") truncFn = "week";
  else truncFn = "month";

  const rows = await db.select({
    periodo: sql<string>`date_trunc(${truncFn}, ${transacoesTable.data}::date)::date::text`,
    receitas: sql<string>`coalesce(sum(case when tipo = 'receita' then valor::numeric else 0 end), 0)`,
    despesas: sql<string>`coalesce(sum(case when tipo = 'despesa' then valor::numeric else 0 end), 0)`,
  })
    .from(transacoesTable)
    .where(
      and(
        eq(transacoesTable.status, "confirmado"),
        gte(transacoesTable.data, toDateStr(dataInicio as unknown as Date | string) ?? ""),
        lte(transacoesTable.data, toDateStr(dataFim as unknown as Date | string) ?? ""),
      )
    )
    .groupBy(sql`date_trunc(${truncFn}, ${transacoesTable.data}::date)`)
    .orderBy(sql`date_trunc(${truncFn}, ${transacoesTable.data}::date)`);

  let saldoAcumulado = 0;
  const items = rows.map(r => {
    const receitas = parseFloat(r.receitas);
    const despesas = parseFloat(r.despesas);
    const saldo = receitas - despesas;
    saldoAcumulado += saldo;
    return {
      periodo: r.periodo,
      receitas,
      despesas,
      saldo,
      saldoAcumulado,
    };
  });

  const totalReceitas = items.reduce((s, i) => s + i.receitas, 0);
  const totalDespesas = items.reduce((s, i) => s + i.despesas, 0);

  res.json({
    items,
    totalReceitas,
    totalDespesas,
    saldoFinal: totalReceitas - totalDespesas,
  });
});

export default router;
