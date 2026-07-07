import { useState } from "react";
import { 
  useListCategorias, 
  useCreateCategoria, 
  useUpdateCategoria, 
  useDeleteCategoria,
  Categoria,
  CategoriaTipo,
  CategoriaInput,
  CategoriaUpdate
} from "@workspace/api-client-react";
import { getListCategoriasQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Search, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório"),
  tipo: z.enum(["receita", "despesa"]),
  cor: z.string().min(1, "A cor é obrigatória"),
  icone: z.string().min(1, "O ícone é obrigatório"),
  descricao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Categorias() {
  const [filterTipo, setFilterTipo] = useState<CategoriaTipo | "todas">("todas");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Categoria | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categorias = [], isLoading } = useListCategorias(
    filterTipo === "todas" ? {} : { tipo: filterTipo }
  );

  const filteredCategorias = categorias.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    (c.descricao && c.descricao.toLowerCase().includes(search.toLowerCase()))
  );

  const createMutation = useCreateCategoria({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriasQueryKey() });
        toast({ title: "Categoria criada com sucesso!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao criar categoria", variant: "destructive" })
    }
  });

  const updateMutation = useUpdateCategoria({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriasQueryKey() });
        toast({ title: "Categoria atualizada com sucesso!" });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro ao atualizar categoria", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteCategoria({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriasQueryKey() });
        toast({ title: "Categoria excluída com sucesso!" });
        setIsDeleteOpen(false);
      },
      onError: () => toast({ title: "Erro ao excluir categoria", variant: "destructive" })
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      tipo: "despesa",
      cor: "#000000",
      icone: "Tag",
      descricao: "",
    }
  });

  const openNewForm = () => {
    setSelectedItem(null);
    form.reset({ nome: "", tipo: "despesa", cor: "#10b981", icone: "Tag", descricao: "" });
    setIsFormOpen(true);
  };

  const openEditForm = (item: Categoria) => {
    setSelectedItem(item);
    form.reset({
      nome: item.nome,
      tipo: item.tipo,
      cor: item.cor || "#000000",
      icone: item.icone || "Tag",
      descricao: item.descricao || "",
    });
    setIsFormOpen(true);
  };

  const openDeleteDialog = (item: Categoria) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: data as CategoriaUpdate });
    } else {
      createMutation.mutate({ data: data as CategoriaInput });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <Header title="Categorias">
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </Header>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar categoria..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={(v: any) => setFilterTipo(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border flex-1 overflow-auto bg-card">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 float-right" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCategorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategorias.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold" 
                          style={{ backgroundColor: item.cor || '#000' }}
                        >
                          {item.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{item.nome}</p>
                          {item.descricao && <p className="text-xs text-muted-foreground">{item.descricao}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.tipo === 'receita' ? (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800">
                          <ArrowUpCircle className="mr-1 h-3 w-3" /> Receita
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800">
                          <ArrowDownCircle className="mr-1 h-3 w-3" /> Despesa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: item.cor }} />
                        <span className="text-xs font-mono">{item.cor}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(item.createdAt)}
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
            <DialogTitle>{selectedItem ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Alimentação, Salário..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!selectedItem}>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
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
                <FormField
                  control={form.control}
                  name="icone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <FormControl>
                        <Input placeholder="Tag" {...field} />
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
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição da categoria..." {...field} />
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
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria
              <span className="font-semibold text-foreground"> {selectedItem?.nome}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedItem && deleteMutation.mutate({ id: selectedItem.id })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir Categoria"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
