import { useState } from "react";
import { 
  useListTransacoes, 
  useCreateTransacao, 
  useUpdateTransacao, 
  useDeleteTransacao,
  useListCategorias,
  useListContas,
  Transacao,
  TransacaoStatus,
  TransacaoTipo,
  ListTransacoesTipo,
  ListTransacoesStatus,
  useExportarRelatorio,
  ExportarRelatorioTipo,
  ExportarRelatorioFormato
} from "@workspace/api-client-react";
import { getListTransacoesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadExcel, downloadPDF } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Search, ArrowUpCircle, ArrowDownCircle, Download, FileSpreadsheet, FileText, FilterX } from "lucide-react";
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

const formSchema = z.object({
  descricao: z.string().min(1, "A descrição é obrigatória"),
  valor: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  tipo: z.enum(["receita", "despesa"]),
  data: z.string().min(1, "A data é obrigatória"),
  status: z.enum(["pendente", "confirmado", "cancelado"]),
  categoriaId: z.coerce.number().nullable().optional(),
  contaId: z.coerce.number().nullable().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Transacoes() {
  // Filtros
  const [filterTipo, setFilterTipo] = useState<ListTransacoesTipo | "todas">("todas");
  const [filterStatus, setFilterStatus] = useState<ListTransacoesStatus | "todos">("todas" as any);
  const [filterConta, setFilterConta] = useState<string>("todas");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // States UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Transacao | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categorias = [] } = useListCategorias();
  const { data: contas = [] } = useListContas();

  // Query params
  const params: any = { page, limit: 20 };
  if (filterTipo !== "todas") params.tipo = filterTipo;
  if (filterStatus !== ("todas" as any)) params.status = filterStatus;
  if (filterConta !== "todas") params.contaId = parseInt(filterConta);
  if (search) params.busca = search;

  const { data: response, isLoading } = useListTransacoes(params);
  const transacoes = response?.data || [];
  const totalItems = response?.total || 0;
  const totalPages = Math.ceil(totalItems / 20);

  const { refetch: fetchExportData } = useExportarRelatorio({ 
    tipo: ExportarRelatorioTipo.transacoes 
  }, { query: { enabled: false } });

  const createMutation = useCreateTransacao({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransacoesQueryKey() });
        toast({ title: "Transação criada com sucesso!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao criar transação", variant: "destructive" })
    }
  });

  const updateMutation = useUpdateTransacao({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransacoesQueryKey() });
        toast({ title: "Transação atualizada com sucesso!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao atualizar transação", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteTransacao({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransacoesQueryKey() });
        toast({ title: "Transação excluída com sucesso!" });
        setIsDeleteOpen(false);
      },
      onError: () => toast({ title: "Erro ao excluir transação", variant: "destructive" })
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      valor: 0,
      tipo: "despesa",
      data: new Date().toISOString().split('T')[0],
      status: "confirmado",
      categoriaId: null,
      contaId: null,
      observacoes: "",
    }
  });

  const openNewForm = () => {
    setSelectedItem(null);
    form.reset({ 
      descricao: "", 
      valor: 0, 
      tipo: "despesa", 
      data: new Date().toISOString().split('T')[0],
      status: "confirmado",
      categoriaId: null,
      contaId: contas.length > 0 ? contas[0].id : null,
      observacoes: "",
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item: Transacao) => {
    setSelectedItem(item);
    form.reset({
      descricao: item.descricao,
      valor: item.valor,
      tipo: item.tipo,
      data: item.data.split('T')[0],
      status: item.status,
      categoriaId: item.categoriaId,
      contaId: item.contaId,
      observacoes: item.observacoes || "",
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    // Coerce nulls if needed
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

  const handleExport = async (formato: ExportarRelatorioFormato) => {
    try {
      toast({ title: "Gerando relatório..." });
      const { data } = await fetchExportData();
      if (!data) throw new Error("No data");
      
      if (formato === ExportarRelatorioFormato.excel) {
        downloadExcel(data, "relatorio-transacoes");
      } else {
        downloadPDF(data, "relatorio-transacoes");
      }
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmado': return <Badge className="bg-emerald-100 text-emerald-800 border-transparent hover:bg-emerald-200">Confirmado</Badge>;
      case 'pendente': return <Badge className="bg-amber-100 text-amber-800 border-transparent hover:bg-amber-200">Pendente</Badge>;
      case 'cancelado': return <Badge className="bg-slate-100 text-slate-800 border-transparent hover:bg-slate-200">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setFilterTipo("todas");
    setFilterStatus("todas" as any);
    setFilterConta("todas");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <Header title="Transações">
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
          Nova Transação
        </Button>
      </Header>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center gap-4 mb-6 bg-card p-4 rounded-lg border shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descrição..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={(v: any) => { setFilterTipo(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os Tipos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v: any) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos Status</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterConta} onValueChange={(v) => { setFilterConta(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Contas</SelectItem>
              {contas.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(filterTipo !== "todas" || filterStatus !== "todas" || filterConta !== "todas" || search) && (
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              <FilterX className="h-4 w-4 mr-2" /> Limpar
            </Button>
          )}
        </div>

        <div className="rounded-md border flex-1 overflow-auto bg-card">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 float-right" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 float-right" /></TableCell>
                  </TableRow>
                ))
              ) : transacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhuma transação encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                transacoes.map((item) => (
                  <TableRow key={item.id} className={item.status === 'cancelado' ? "opacity-60" : ""}>
                    <TableCell className="text-sm">
                      {formatDate(item.data)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{item.descricao}</p>
                      {item.observacoes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.observacoes}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.contaNome || '-'}
                    </TableCell>
                    <TableCell>
                      {item.categoriaNome ? (
                         <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.categoriaCor || '#ccc' }} />
                           {item.categoriaNome}
                         </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`font-semibold flex items-center justify-end gap-1 ${item.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.tipo === 'receita' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                        {item.tipo === 'receita' ? '+' : '-'}{formatCurrency(item.valor)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setSelectedItem(item); setIsDeleteOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando página {page} de {totalPages} ({totalItems} itens)
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedItem}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className={form.watch('tipo') === 'receita' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Compra no supermercado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {contas.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {categorias.filter(c => c.tipo === form.watch('tipo')).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Anotações extras..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir esta transação de 
              <span className="font-semibold text-foreground"> {formatCurrency(selectedItem?.valor)}</span>?
              O saldo da conta será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedItem && deleteMutation.mutate({ id: selectedItem.id })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
