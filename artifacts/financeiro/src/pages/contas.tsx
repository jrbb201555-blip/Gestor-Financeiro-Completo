import { useState } from "react";
import { 
  useListContas, 
  useCreateConta, 
  useUpdateConta, 
  useDeleteConta,
  Conta,
  ContaTipo,
  ContaInput,
  ContaUpdate
} from "@workspace/api-client-react";
import { getListContasQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Search, Wallet, Building2, Landmark, Briefcase, SwitchCamera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório"),
  tipo: z.enum(["corrente", "poupanca", "investimento", "carteira", "outro"]),
  banco: z.string().optional(),
  saldoInicial: z.coerce.number({ invalid_type_error: "Deve ser um número" }),
  cor: z.string().optional(),
  ativa: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Contas() {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Conta | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contas = [], isLoading } = useListContas();

  const filteredContas = contas.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    (c.banco && c.banco.toLowerCase().includes(search.toLowerCase()))
  );

  const createMutation = useCreateConta({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasQueryKey() });
        toast({ title: "Conta criada com sucesso!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao criar conta", variant: "destructive" })
    }
  });

  const updateMutation = useUpdateConta({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasQueryKey() });
        toast({ title: "Conta atualizada com sucesso!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao atualizar conta", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteConta({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContasQueryKey() });
        toast({ title: "Conta excluída com sucesso!" });
        setIsDeleteOpen(false);
      },
      onError: () => toast({ title: "Erro ao excluir conta", variant: "destructive" })
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      tipo: "corrente",
      banco: "",
      saldoInicial: 0,
      cor: "#3b82f6",
      ativa: true,
    }
  });

  const openNewForm = () => {
    setSelectedItem(null);
    form.reset({ nome: "", tipo: "corrente", banco: "", saldoInicial: 0, cor: "#3b82f6", ativa: true });
    setIsFormOpen(true);
  };

  const openEditForm = (item: Conta) => {
    setSelectedItem(item);
    form.reset({
      nome: item.nome,
      tipo: item.tipo,
      banco: item.banco || "",
      saldoInicial: item.saldoInicial,
      cor: item.cor || "#3b82f6",
      ativa: item.ativa,
    });
    setIsFormOpen(true);
  };

  const openDeleteDialog = (item: Conta) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (selectedItem) {
      updateMutation.mutate({ 
        id: selectedItem.id, 
        data: {
          nome: data.nome,
          tipo: data.tipo,
          banco: data.banco,
          cor: data.cor,
          ativa: data.ativa
        } as ContaUpdate 
      });
    } else {
      createMutation.mutate({ 
        data: {
          nome: data.nome,
          tipo: data.tipo,
          banco: data.banco,
          saldoInicial: data.saldoInicial,
          cor: data.cor,
        } as ContaInput 
      });
    }
  };

  const toggleAtiva = (item: Conta, checked: boolean) => {
    updateMutation.mutate({ id: item.id, data: { ativa: checked } });
  };

  const getTipoIcon = (tipo: string) => {
    switch(tipo) {
      case 'corrente': return <Landmark className="h-4 w-4" />;
      case 'poupanca': return <Building2 className="h-4 w-4" />;
      case 'carteira': return <Wallet className="h-4 w-4" />;
      case 'investimento': return <TrendingUp className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };
  
  // Use local import or directly lucide component
  const TrendingUp = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;

  return (
    <div className="flex flex-col h-full bg-background">
      <Header title="Contas Bancárias e Carteiras">
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </Header>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar conta ou banco..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border flex-1 overflow-auto bg-card">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 float-right" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 float-right" /></TableCell>
                  </TableRow>
                ))
              ) : filteredContas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhuma conta encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContas.map((item) => (
                  <TableRow key={item.id} className={!item.ativa ? "opacity-60 grayscale" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white" 
                          style={{ backgroundColor: item.cor || 'hsl(var(--primary))' }}
                        >
                          {getTipoIcon(item.tipo)}
                        </div>
                        <div>
                          <p className="font-semibold text-base">{item.nome}</p>
                          {item.banco && <p className="text-xs text-muted-foreground">{item.banco}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {item.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`font-semibold ${item.saldoAtual < 0 ? 'text-destructive' : item.saldoAtual > 0 ? 'text-emerald-600' : ''}`}>
                        {formatCurrency(item.saldoAtual)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center items-center">
                        <Switch 
                          checked={item.ativa} 
                          onCheckedChange={(c) => toggleAtiva(item, c)}
                          disabled={updateMutation.isPending}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Conta</FormLabel>
                    <FormControl>
                      <Input placeholder="Itaú, Nubank, Dinheiro..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrente">Conta Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                          <SelectItem value="investimento">Investimento</SelectItem>
                          <SelectItem value="carteira">Carteira Física</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="banco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco / Instituição</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="saldoInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo Inicial</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          disabled={!!selectedItem} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor Identificadora</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                        </FormControl>
                        <Input type="text" {...field} className="uppercase font-mono text-sm" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {selectedItem && (
                <FormField
                  control={form.control}
                  name="ativa"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Conta Ativa</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Contas inativas não aparecem em novas transações.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
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
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente a conta <span className="font-semibold text-foreground">{selectedItem?.nome}</span> e 
              todas as transações vinculadas a ela. Recomenda-se inativar a conta em vez de excluí-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedItem && deleteMutation.mutate({ id: selectedItem.id })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir Conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
