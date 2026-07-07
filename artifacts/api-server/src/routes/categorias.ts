import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriasTable } from "@workspace/db";
import {
  ListCategoriasQueryParams,
  CreateCategoriaBody,
  GetCategoriaParams,
  UpdateCategoriaParams,
  UpdateCategoriaBody,
  DeleteCategoriaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categorias", async (req, res): Promise<void> => {
  const parsed = ListCategoriasQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db.select().from(categoriasTable).$dynamic();
  if (parsed.data.tipo && parsed.data.tipo !== "todas") {
    query = query.where(eq(categoriasTable.tipo, parsed.data.tipo as "receita" | "despesa"));
  }

  const categorias = await query.orderBy(categoriasTable.nome);
  res.json(categorias.map(formatCategoria));
});

router.post("/categorias", async (req, res): Promise<void> => {
  const parsed = CreateCategoriaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cat] = await db.insert(categoriasTable).values(parsed.data).returning();
  res.status(201).json(formatCategoria(cat));
});

router.get("/categorias/:id", async (req, res): Promise<void> => {
  const params = GetCategoriaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cat] = await db.select().from(categoriasTable).where(eq(categoriasTable.id, params.data.id));
  if (!cat) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }
  res.json(formatCategoria(cat));
});

router.patch("/categorias/:id", async (req, res): Promise<void> => {
  const params = UpdateCategoriaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCategoriaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cat] = await db.update(categoriasTable).set(parsed.data).where(eq(categoriasTable.id, params.data.id)).returning();
  if (!cat) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }
  res.json(formatCategoria(cat));
});

router.delete("/categorias/:id", async (req, res): Promise<void> => {
  const params = DeleteCategoriaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(categoriasTable).where(eq(categoriasTable.id, params.data.id));
  res.sendStatus(204);
});

function formatCategoria(c: typeof categoriasTable.$inferSelect) {
  return {
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    cor: c.cor,
    icone: c.icone,
    descricao: c.descricao ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

export default router;
