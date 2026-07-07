import { useState } from "react";
import { 
  useListContasAPagar, 
  useCreateContaAPagar, 
  useUpdateContaAPagar, 
  useDeleteContaAPagar,
  usePagarContaAPagar,
  useListCategorias,
  useListContas,
  ContaAPagar,
  ListContasAPagarStatus,
  useExportarRelatorio,
  ExportarRelatorioTipo,
  ExportarRelatorioFormato
} from "@workspace/api-client-react";
import { getListContasAPagarQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadExcel, downloadPDF } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Search, Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, FilterX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  descricao: z.string().min(1, "A descrição é obrigatória"),
  fornecedor: z.string().optional(),
  valor: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  dataVencimento: z.string().min(1, "O vencimento é obrigatório"),
  categoriaId: z.coerce.number().nullable().optional(),
  contaId: z.coerce.number().nullable().optional(),
  observacoes: z.string().optional(),
  recorrente: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ContasAPagar() {
  const [filterStatus, setFilterStatus] = useState<ListContasAPagarStatus | "todas">("todas" as any);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPagarOpen, setIsPagarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContaAPagar | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categorias = [] } = useListCategorias({ tipo: 'despesa' });
  const { data: contas = [] } = useListContas();

  const params: any = { page, limit: 20 };
  if (filterStatus !== ("todas" as any)) params.status = filterStatus;
  if (search) params.busca = search;

  const { data: response, isLoading } = useListContasAPagar(params);
  const contasAPagar = response?.data || [];
  const totalItems = response?.total || 0;
  const totalPendente = response?.totalPendente || 0;
  const totalVencido = response?.totalVencido || 0;
  const totalPages = Math.ceil(totalItems / 20);

  const { refetch: fetchExportData } = useExportarRelatorio({ 
    tipo: ExportarRelatorioTipo.contasAPagar 
  }, { query: { enabled: false } });

  const createMutation = useCreateContaAPagar({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasAPagarQueryKey() });
        toast({ title: "Conta a pagar registrada!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao criar registro", variant: "destructive" })
    }
  });

  const updateMutation = useUpdateContaAPagar({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasAPagarQueryKey() });
        toast({ title: "Conta a pagar atualizada!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao atualizar registro", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteContaAPagar({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasAPagarQueryKey() });
        toast({ title: "Registro excluído!" });
        setIsDeleteOpen(false);
      },
      onError: () => toast({ title: "Erro ao excluir registro", variant: "destructive" })
    }
  });

  const pagarMutation = usePagarContaAPagar({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasAPagarQueryKey() });
        toast({ title: "Conta paga com sucesso!" });
        setIsPagarOpen(false);
      },
      onError: () => toast({ title: "Erro ao registrar pagamento", variant: "destructive" })
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      fornecedor: "",
      valor: 0,
      dataVencimento: new Date().toISOString().split('T')[0],
      categoriaId: null,
      contaId: null,
      observacoes: "",
      recorrente: false,
    }
  });

  const pagarForm = useForm({
    defaultValues: {
      dataPagamento: new Date().toISOString().split('T')[0],
      valorPago: 0,
      contaId: "none",
    }
  });

  const openNewForm = () => {
    setSelectedItem(null);
    form.reset({ 
      descricao: "", 
      fornecedor: "",
      valor: 0, 
      dataVencimento: new Date().toISOString().split('T')[0],
      categoriaId: null,
      contaId: contas.length > 0 ? contas[0].id : null,
      observacoes: "",
      recorrente: false,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item: ContaAPagar) => {
    setSelectedItem(item);
    form.reset({
      descricao: item.descricao,
      fornecedor: item.fornecedor || "",
      valor: item.valor,
      dataVencimento: item.dataVencimento.split('T')[0],
      categoriaId: item.categoriaId,
      contaId: item.contaId,
      observacoes: item.observacoes || "",
      recorrente: item.recorrente,
    });
    setIsFormOpen(true);
  };

  const openPagarDialog = (item: ContaAPagar) => {
    setSelectedItem(item);
    pagarForm.reset({
      dataPagamento: new Date().toISOString().split('T')[0],
      valorPago: item.valor,
      contaId: item.contaId ? item.contaId.toString() : (contas.length > 0 ? contas[0].id.toString() : "none"),
    });
    setIsPagarOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      categoriaId: data.categoriaId || null,
      contaId: data.contaId || null,
    };

    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  };

  const onPagar = (data: any) => {
    if (selectedItem) {
      pagarMutation.mutate({ 
        id: selectedItem.id, 
        data: {
          dataPagamento: data.dataPagamento,
          valorPago: Number(data.valorPago),
          contaId: data.contaId === "none" ? null : parseInt(data.contaId)
        }
      });
    }
  };

  const handleExport = async (formato: ExportarRelatorioFormato) => {
    try {
      toast({ title: "Gerando relatório..." });
      const { data } = await fetchExportData();
      if (!data) throw new Error("No data");
      
      if (formato === ExportarRelatorioFormato.excel) {
        downloadExcel(data, "contas-a-pagar");
      } else {
        downloadPDF(data, "contas-a-pagar");
      }
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pago': return <Badge className="bg-emerald-100 text-emerald-800 border-transparent">Pago</Badge>;
      case 'pendente': return <Badge className="bg-amber-100 text-amber-800 border-transparent">Pendente</Badge>;
      case 'vencido': return <Badge className="bg-rose-100 text-rose-800 border-transparent font-bold"><AlertTriangle className="h-3 w-3 mr-1"/>Vencido</Badge>;
      case 'cancelado': return <Badge className="bg-slate-100 text-slate-800 border-transparent">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <Header title="Contas a Pagar">
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
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Registro
        </Button>
      </Header>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        {/* Sumário */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Total Pendente</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(totalPendente)}</p>
          </div>
          <div className="bg-card border border-rose-200 dark:border-rose-900 rounded-lg p-4 flex flex-col justify-center">
            <p className="text-sm text-rose-600 font-medium flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> Total Vencido</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(totalVencido)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6 bg-card p-4 rounded-lg border shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descrição ou fornecedor..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos Status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="vencido">Vencidas</SelectItem>
              <SelectItem value="pago">Pagas</SelectItem>
              <SelectItem value="cancelado">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          
          {(filterStatus !== "todas" || search) && (
            <Button variant="ghost" onClick={() => { setFilterStatus("todas" as any); setSearch(""); setPage(1); }}>
              <FilterX className="h-4 w-4 mr-2" /> Limpar
            </Button>
          )}
        </div>

        <div className="rounded-md border flex-1 overflow-auto bg-card">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição/Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 float-right" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 float-right" /></TableCell>
                  </TableRow>
                ))
              ) : contasAPagar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma conta a pagar encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                contasAPagar.map((item) => (
                  <TableRow key={item.id} className={item.status === 'cancelado' || item.status === 'pago' ? "opacity-70" : ""}>
                    <TableCell className={`text-sm font-medium ${item.status === 'vencido' ? 'text-rose-600' : ''}`}>
                      {formatDate(item.dataVencimento)}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{item.descricao}</p>
                      {item.fornecedor && <p className="text-xs text-muted-foreground">Fornecedor: {item.fornecedor}</p>}
                    </TableCell>
                    <TableCell>
                      {item.categoriaNome ? (
                         <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                           {item.categoriaNome}
                         </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(item.status === 'pendente' || item.status === 'vencido') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 mr-2" 
                            onClick={() => openPagarDialog(item)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Pagar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setSelectedItem(item); setIsDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {/* Formulario Add/Edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Editar Conta' : 'Nova Conta a Pagar'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Aluguel, Luz, Internet..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fornecedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Empresa XYZ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="text-rose-600 font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dataVencimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} value={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {categorias.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta de Pagamento Prevista</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} value={field.value?.toString() || "none"}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Conta bancária" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Indefinida</SelectItem>
                        {contas.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recorrente"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Despesa recorrente</FormLabel>
                      <p className="text-sm text-muted-foreground">Marque se esta conta se repete mensalmente.</p>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Formulario Pagar */}
      <Dialog open={isPagarOpen} onOpenChange={setIsPagarOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Confirmar o pagamento de {selectedItem?.descricao}
            </DialogDescription>
          </DialogHeader>
          <Form {...pagarForm}>
            <form onSubmit={pagarForm.handleSubmit(onPagar)} className="space-y-4 pt-4">
              <div className="bg-muted p-3 rounded-md mb-4 flex justify-between items-center border">
                <span className="text-sm font-medium">Valor Original:</span>
                <span className="font-bold text-rose-600">{formatCurrency(selectedItem?.valor)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={pagarForm.control}
                  name="valorPago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={pagarForm.control}
                  name="dataPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Pgto.</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={pagarForm.control}
                name="contaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta utilizada</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Não registrar no saldo</SelectItem>
                        {contas.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsPagarOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={pagarMutation.isPending}>Confirmar Pagamento</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedItem && deleteMutation.mutate({ id: selectedItem.id })} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
