import { useState } from "react";
import { 
  useGetDashboardResumo, 
  useGetGraficoMensal, 
  useGetGraficoPorCategoria, 
  useGetUltimasTransacoes, 
  useGetDashboardAlertas,
  GetGraficoPorCategoriaTipo
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, AlertTriangle, AlertCircle, TrendingUp, Calendar, Landmark, CreditCard, Tag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [ano, setAno] = useState(currentDate.getFullYear());

  const { data: resumo, isLoading: loadingResumo } = useGetDashboardResumo({ mes, ano });
  const { data: graficoMensal, isLoading: loadingGrafico } = useGetGraficoMensal({ ano });
  const { data: graficoCategoria, isLoading: loadingCategoria } = useGetGraficoPorCategoria({ 
    tipo: GetGraficoPorCategoriaTipo.despesa, 
    mes, 
    ano 
  });
  const { data: ultimasTransacoes, isLoading: loadingTransacoes } = useGetUltimasTransacoes({ limit: 5 });
  const { data: alertas, isLoading: loadingAlertas } = useGetDashboardAlertas();

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo(a) ao seu resumo financeiro.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
            <SelectTrigger className="w-[100px] bg-background">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingAlertas ? (
        <Skeleton className="h-14 w-full" />
      ) : alertas && (alertas.contasVencidas > 0 || alertas.contasVencendoHoje > 0) ? (
        <div className="flex items-center gap-3 bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm font-medium">
            Atenção: Você tem {alertas.contasVencidas > 0 ? `${alertas.contasVencidas} conta(s) vencida(s)` : ''}
            {alertas.contasVencidas > 0 && alertas.contasVencendoHoje > 0 ? ' e ' : ''}
            {alertas.contasVencendoHoje > 0 ? `${alertas.contasVencendoHoje} conta(s) vencendo hoje` : ''}.
            {alertas.totalVencido && alertas.totalVencido > 0 ? ` Total: ${formatCurrency(alertas.totalVencido)}` : ''}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Receitas" 
          value={resumo?.receitasMes} 
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          loading={loadingResumo}
          variation={resumo?.variacao.receitas}
        />
        <KPICard 
          title="Despesas" 
          value={resumo?.despesasMes} 
          icon={<TrendingUp className="h-5 w-5 text-rose-500 rotate-180 transform" />}
          loading={loadingResumo}
          variation={resumo?.variacao.despesas}
          invertColors
        />
        <KPICard 
          title="Saldo do Mês" 
          value={resumo?.saldoMes} 
          icon={<Calendar className="h-5 w-5 text-blue-500" />}
          loading={loadingResumo}
          variation={resumo?.variacao.saldo}
        />
        <KPICard 
          title="Saldo em Contas" 
          value={resumo?.saldoTotalContas} 
          icon={<Landmark className="h-5 w-5 text-primary" />}
          loading={loadingResumo}
          neutralVariation
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas vs Despesas ({ano})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingGrafico ? (
              <Skeleton className="w-full h-full" />
            ) : graficoMensal && graficoMensal.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficoMensal} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `R$ ${val / 1000}k`}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(val: number) => formatCurrency(val)} 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} 
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sem dados para o ano selecionado" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingCategoria ? (
              <Skeleton className="w-full h-full" />
            ) : graficoCategoria && graficoCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={graficoCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="categoriaNome"
                  >
                    {graficoCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor || `hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => formatCurrency(val)} 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} 
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sem despesas no mês" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTransacoes ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : ultimasTransacoes && ultimasTransacoes.length > 0 ? (
              <div className="space-y-4">
                {ultimasTransacoes.map(t => (
                  <div key={t.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${t.tipo === 'receita' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                        {t.tipo === 'receita' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.descricao}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {t.categoriaNome || 'Sem categoria'}
                          <span className="mx-1">•</span>
                          {formatDate(t.data)}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(t.valor)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhuma transação recente" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendências</CardTitle>
          </CardHeader>
          <CardContent>
             {loadingResumo ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-md border border-border">
                        <AlertCircle className="h-5 w-5 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Contas a Pagar</p>
                        <p className="text-xs text-muted-foreground">Total pendente/vencido</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600">{formatCurrency(resumo?.totalContasAPagarPendente || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-md border border-border">
                        <CreditCard className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Contas a Receber</p>
                        <p className="text-xs text-muted-foreground">Total pendente/vencido</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(resumo?.totalContasAReceberPendente || 0)}</p>
                    </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ 
  title, 
  value, 
  icon, 
  loading, 
  variation,
  invertColors = false,
  neutralVariation = false
}: { 
  title: string; 
  value?: number; 
  icon: React.ReactNode; 
  loading: boolean;
  variation?: number;
  invertColors?: boolean;
  neutralVariation?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-muted/50 rounded-md">
            {icon}
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <h3 className="text-2xl font-bold">{formatCurrency(value || 0)}</h3>
          )}
        </div>
        
        {!loading && variation !== undefined && !neutralVariation && (
          <div className="mt-2 flex items-center text-xs">
            {variation > 0 ? (
              <span className={`flex items-center ${invertColors ? 'text-rose-500' : 'text-emerald-500'} font-medium`}>
                <ArrowUpIcon className="h-3 w-3 mr-1" />
                {variation.toFixed(1)}%
              </span>
            ) : variation < 0 ? (
              <span className={`flex items-center ${invertColors ? 'text-emerald-500' : 'text-rose-500'} font-medium`}>
                <ArrowDownIcon className="h-3 w-3 mr-1" />
                {Math.abs(variation).toFixed(1)}%
              </span>
            ) : (
              <span className="text-muted-foreground font-medium">0%</span>
            )}
            <span className="text-muted-foreground ml-1">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}
