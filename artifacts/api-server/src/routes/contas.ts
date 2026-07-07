import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contasTable } from "@workspace/db";
import {
  CreateContaBody,
  GetContaParams,
  UpdateContaParams,
  UpdateContaBody,
  DeleteContaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contas", async (_req, res): Promise<void> => {
  const contas = await db.select().from(contasTable).orderBy(contasTable.nome);
  res.json(contas.map(formatConta));
});

router.post("/contas", async (req, res): Promise<void> => {
  const parsed = CreateContaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const saldoInicial = String(parsed.data.saldoInicial ?? 0);
  const [conta] = await db.insert(contasTable).values({
    nome: parsed.data.nome,
    tipo: parsed.data.tipo ?? "corrente",
    banco: parsed.data.banco ?? null,
    saldoInicial,
    saldoAtual: saldoInicial,
    cor: parsed.data.cor ?? null,
  }).returning();
  res.status(201).json(formatConta(conta));
});

router.get("/contas/:id", async (req, res): Promise<void> => {
  const params = GetContaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conta] = await db.select().from(contasTable).where(eq(contasTable.id, params.data.id));
  if (!conta) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.json(formatConta(conta));
});

router.patch("/contas/:id", async (req, res): Promise<void> => {
  const params = UpdateContaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conta] = await db.update(contasTable).set({
    nome: parsed.data.nome,
    tipo: parsed.data.tipo,
    banco: parsed.data.banco,
    cor: parsed.data.cor,
    ativa: parsed.data.ativa,
  }).where(eq(contasTable.id, params.data.id)).returning();
  if (!conta) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.json(formatConta(conta));
});

router.delete("/contas/:id", async (req, res): Promise<void> => {
  const params = DeleteContaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(contasTable).where(eq(contasTable.id, params.data.id));
  res.sendStatus(204);
});

export function formatConta(c: typeof contasTable.$inferSelect) {
  return {
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    banco: c.banco ?? null,
    saldoInicial: parseFloat(c.saldoInicial),
    saldoAtual: parseFloat(c.saldoAtual),
    cor: c.cor ?? null,
    ativa: c.ativa,
    createdAt: c.createdAt.toISOString(),
  };
}

export default router;
