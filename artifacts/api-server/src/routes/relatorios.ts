import { Router, type IRouter } from "express";
import { and, gte, lte, eq, sql, desc } from "drizzle-orm";

function toDateStr(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}
import { db, transacoesTable, contasAPagarTable, contasAReceberTable, categoriasTable, contasTable } from "@workspace/db";
import { ExportarRelatorioQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/relatorios/exportar", async (req, res): Promise<void> => {
  const parsed = ExportarRelatorioQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tipo } = parsed.data;
  const dataInicio = toDateStr(parsed.data.dataInicio as unknown as Date | string);
  const dataFim = toDateStr(parsed.data.dataFim as unknown as Date | string);
  const geradoEm = new Date().toISOString();
  const periodo = dataInicio && dataFim ? `${dataInicio} a ${dataFim}` : null;

  if (tipo === "transacoes") {
    const conditions = [eq(transacoesTable.status, "confirmado")];
    if (dataInicio) conditions.push(gte(transacoesTable.data, dataInicio));
    if (dataFim) conditions.push(lte(transacoesTable.data, dataFim));

    const rows = await db.select({
      t: transacoesTable,
      catNome: categoriasTable.nome,
      contaNome: contasTable.nome,
    })
      .from(transacoesTable)
      .leftJoin(categoriasTable, eq(transacoesTable.categoriaId, categoriasTable.id))
      .leftJoin(contasTable, eq(transacoesTable.contaId, contasTable.id))
      .where(and(...conditions))
      .orderBy(desc(transacoesTable.data));

    const linhas = rows.map(r => ({
      Data: r.t.data,
      Descricao: r.t.descricao,
      Tipo: r.t.tipo === "receita" ? "Receita" : "Despesa",
      Valor: parseFloat(r.t.valor),
      Categoria: r.catNome ?? "",
      Conta: r.contaNome ?? "",
      Status: r.t.status,
    }));

    const totalReceitas = linhas.filter(l => l.Tipo === "Receita").reduce((s, l) => s + l.Valor, 0);
    const totalDespesas = linhas.filter(l => l.Tipo === "Despesa").reduce((s, l) => s + l.Valor, 0);

    res.json({
      tipo,
      titulo: "Relatório de Transações",
      geradoEm,
      periodo,
      colunas: ["Data", "Descricao", "Tipo", "Valor", "Categoria", "Conta", "Status"],
      linhas,
      totais: { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas },
    });
    return;
  }

  if (tipo === "contasAPagar") {
    const conditions: ReturnType<typeof eq>[] = [];
    if (dataInicio) conditions.push(gte(contasAPagarTable.dataVencimento, dataInicio) as ReturnType<typeof eq>);
    if (dataFim) conditions.push(lte(contasAPagarTable.dataVencimento, dataFim) as ReturnType<typeof eq>);

    const rows = await db.select({
      cp: contasAPagarTable,
      catNome: categoriasTable.nome,
      contaNome: contasTable.nome,
    })
      .from(contasAPagarTable)
      .leftJoin(categoriasTable, eq(contasAPagarTable.categoriaId, categoriasTable.id))
      .leftJoin(contasTable, eq(contasAPagarTable.contaId, contasTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(contasAPagarTable.dataVencimento);

    const linhas = rows.map(r => ({
      Descricao: r.cp.descricao,
      Fornecedor: r.cp.fornecedor ?? "",
      Valor: parseFloat(r.cp.valor),
      Vencimento: r.cp.dataVencimento,
      Status: r.cp.status,
      Pagamento: r.cp.dataPagamento ?? "",
      ValorPago: r.cp.valorPago ? parseFloat(r.cp.valorPago) : "",
      Categoria: r.catNome ?? "",
      Conta: r.contaNome ?? "",
    }));

    res.json({
      tipo,
      titulo: "Relatório de Contas a Pagar",
      geradoEm,
      periodo,
      colunas: ["Descricao", "Fornecedor", "Valor", "Vencimento", "Status", "Pagamento", "ValorPago", "Categoria", "Conta"],
      linhas,
      totais: { total: linhas.reduce((s, l) => s + (typeof l.Valor === "number" ? l.Valor : 0), 0) },
    });
    return;
  }

  if (tipo === "contasAReceber") {
    const conditions: ReturnType<typeof eq>[] = [];
    if (dataInicio) conditions.push(gte(contasAReceberTable.dataVencimento, dataInicio) as ReturnType<typeof eq>);
    if (dataFim) conditions.push(lte(contasAReceberTable.dataVencimento, dataFim) as ReturnType<typeof eq>);

    const rows = await db.select({
      cr: contasAReceberTable,
      catNome: categoriasTable.nome,
      contaNome: contasTable.nome,
    })
      .from(contasAReceberTable)
      .leftJoin(categoriasTable, eq(contasAReceberTable.categoriaId, categoriasTable.id))
      .leftJoin(contasTable, eq(contasAReceberTable.contaId, contasTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(contasAReceberTable.dataVencimento);

    const linhas = rows.map(r => ({
      Descricao: r.cr.descricao,
      Cliente: r.cr.cliente ?? "",
      Valor: parseFloat(r.cr.valor),
      Vencimento: r.cr.dataVencimento,
      Status: r.cr.status,
      Recebimento: r.cr.dataRecebimento ?? "",
      ValorRecebido: r.cr.valorRecebido ? parseFloat(r.cr.valorRecebido) : "",
      Categoria: r.catNome ?? "",
      Conta: r.contaNome ?? "",
    }));

    res.json({
      tipo,
      titulo: "Relatório de Contas a Receber",
      geradoEm,
      periodo,
      colunas: ["Descricao", "Cliente", "Valor", "Vencimento", "Status", "Recebimento", "ValorRecebido", "Categoria", "Conta"],
      linhas,
      totais: { total: linhas.reduce((s, l) => s + (typeof l.Valor === "number" ? l.Valor : 0), 0) },
    });
    return;
  }

  if (tipo === "fluxoCaixa") {
    const conditions = [eq(transacoesTable.status, "confirmado")];
    if (dataInicio) conditions.push(gte(transacoesTable.data, dataInicio));
    if (dataFim) conditions.push(lte(transacoesTable.data, dataFim));

    const rows = await db.select({
      mes: sql<string>`to_char(date_trunc('month', ${transacoesTable.data}::date), 'YYYY-MM')`,
      receitas: sql<string>`coalesce(sum(case when tipo = 'receita' then valor::numeric else 0 end), 0)`,
      despesas: sql<string>`coalesce(sum(case when tipo = 'despesa' then valor::numeric else 0 end), 0)`,
    })
      .from(transacoesTable)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('month', ${transacoesTable.data}::date)`)
      .orderBy(sql`date_trunc('month', ${transacoesTable.data}::date)`);

    let acumulado = 0;
    const linhas = rows.map(r => {
      const receitas = parseFloat(r.receitas);
      const despesas = parseFloat(r.despesas);
      const saldo = receitas - despesas;
      acumulado += saldo;
      return { Periodo: r.mes, Receitas: receitas, Despesas: despesas, Saldo: saldo, SaldoAcumulado: acumulado };
    });

    res.json({
      tipo,
      titulo: "Fluxo de Caixa",
      geradoEm,
      periodo,
      colunas: ["Periodo", "Receitas", "Despesas", "Saldo", "SaldoAcumulado"],
      linhas,
      totais: {
        totalReceitas: linhas.reduce((s, l) => s + l.Receitas, 0),
        totalDespesas: linhas.reduce((s, l) => s + l.Despesas, 0),
      },
    });
    return;
  }

  res.status(400).json({ error: "Tipo de relatório inválido" });
});

export default router;
