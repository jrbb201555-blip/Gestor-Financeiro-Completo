import { useState } from "react";
import { 
  useGetFluxoCaixa, 
  GetFluxoCaixaAgrupamento,
  useExportarRelatorio,
  ExportarRelatorioTipo,
  ExportarRelatorioFormato
} from "@workspace/api-client-react";
import { Header } from "@/components/layout";
import { formatCurrency } from "@/lib/utils";
import { downloadExcel, downloadPDF } from "@/lib/export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export default function FluxoCaixa() {
  const { toast } = useToast();
  
  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [dataInicio, setDataInicio] = useState(firstDay.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(lastDay.toISOString().split('T')[0]);
  const [agrupamento, setAgrupamento] = useState<GetFluxoCaixaAgrupamento>("dia");

  const { data: response, isLoading } = useGetFluxoCaixa({
    dataInicio,
    dataFim,
    agrupamento
  });

  const { refetch: fetchExportData } = useExportarRelatorio({ 
    tipo: ExportarRelatorioTipo.fluxoCaixa,
    dataInicio,
    dataFim
  }, { query: { enabled: false } });

  const handleExport = async (formato: ExportarRelatorioFormato) => {
    try {
      toast({ title: "Gerando relatório..." });
      const { data } = await fetchExportData();
      if (!data) throw new Error("No data");
      
      if (formato === ExportarRelatorioFormato.excel) {
        downloadExcel(data, "fluxo-de-caixa");
      } else {
        downloadPDF(data, "fluxo-de-caixa");
      }
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
  };

  const setPeriodoRapido = (periodo: "mes_atual" | "proximo_mes" | "ultimos_30") => {
    const d = new Date();
    if (periodo === "mes_atual") {
      setDataInicio(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
      setDataFim(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
    } else if (periodo === "proximo_mes") {
      setDataInicio(new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0]);
      setDataFim(new Date(d.getFullYear(), d.getMonth() + 2, 0).toISOString().split('T')[0]);
    } else if (periodo === "ultimos_30") {
      const prev = new Date();
      prev.setDate(prev.getDate() - 30);
      setDataInicio(prev.toISOString().split('T')[0]);
      setDataFim(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <Header title="Fluxo de Caixa">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport(ExportarRelatorioFormato.excel)}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(ExportarRelatorioFormato.pdf)}>
              <FileText className="mr-2 h-4 w-4 text-rose-600" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Header>

      <div className="flex-1 overflow-auto p-8 flex flex-col gap-6">
        
        {/* Controles */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Período Rápido</label>
              <Select onValueChange={setPeriodoRapido} defaultValue="mes_atual">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="proximo_mes">Próximo Mês</SelectItem>
                  <SelectItem value="ultimos_30">Últimos 30 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Data Início</label>
              <div className="relative">
                <Input 
                  type="date" 
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)} 
                  className="w-[160px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Data Fim</label>
              <div className="relative">
                <Input 
                  type="date" 
                  value={dataFim} 
                  onChange={(e) => setDataFim(e.target.value)} 
                  className="w-[160px]"
                />
              </div>
            </div>

            <div className="space-y-1 ml-auto">
              <label className="text-xs font-medium">Agrupar Por</label>
              <Select value={agrupamento} onValueChange={(v: any) => setAgrupamento(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Agrupamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Totais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Total Receitas Previstas</p>
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-2" />
              ) : (
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(response?.totalReceitas)}</h3>
              )}
            </CardContent>
          </Card>
          <Card className="bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-rose-800 dark:text-rose-400">Total Despesas Previstas</p>
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-2" />
              ) : (
                <h3 className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(response?.totalDespesas)}</h3>
              )}
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Variação do Período</p>
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-2" />
              ) : (
                <h3 className={`text-2xl font-bold mt-1 ${(response?.saldoFinal || 0) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {formatCurrency(response?.saldoFinal)}
                </h3>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico */}
        <Card className="flex-1 min-h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CalendarDays className="h-5 w-5 mr-2 text-muted-foreground" /> 
              Projeção de Saldo
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : response?.items && response.items.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={response.items} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="periodo" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `R$ ${val / 1000}k`}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(val: number, name: string) => [formatCurrency(val), name === 'saldoAcumulado' ? 'Saldo Acumulado' : name === 'receitas' ? 'Receitas' : 'Despesas']} 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} 
                  />
                  <Legend iconType="circle" />
                  <Area 
                    type="monotone" 
                    dataKey="saldoAcumulado" 
                    name="Saldo Acumulado" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSaldo)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado no período selecionado.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Detalhes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhamento por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{agrupamento === 'dia' ? 'Data' : agrupamento === 'semana' ? 'Semana' : 'Mês'}</TableHead>
                  <TableHead className="text-right text-emerald-600">Entradas</TableHead>
                  <TableHead className="text-right text-rose-600">Saídas</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Saldo Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 float-right" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 float-right" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 float-right" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 float-right" /></TableCell>
                    </TableRow>
                  ))
                ) : response?.items && response.items.length > 0 ? (
                  response.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-sm">
                        {item.periodo}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {item.receitas > 0 ? '+' + formatCurrency(item.receitas) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-medium">
                        {item.despesas > 0 ? '-' + formatCurrency(item.despesas) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.saldo > 0 ? 'text-emerald-600' : item.saldo < 0 ? 'text-rose-600' : ''}`}>
                        {formatCurrency(item.saldo)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.saldoAcumulado)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum dado detalhado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
