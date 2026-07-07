import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriasRouter from "./categorias";
import contasRouter from "./contas";
import transacoesRouter from "./transacoes";
import contasAPagarRouter from "./contasAPagar";
import contasAReceberRouter from "./contasAReceber";
import fluxoCaixaRouter from "./fluxoCaixa";
import dashboardRouter from "./dashboard";
import relatoriosRouter from "./relatorios";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriasRouter);
router.use(contasRouter);
router.use(transacoesRouter);
router.use(contasAPagarRouter);
router.use(contasAReceberRouter);
router.use(fluxoCaixaRouter);
router.use(dashboardRouter);
router.use(relatoriosRouter);

export default router;
