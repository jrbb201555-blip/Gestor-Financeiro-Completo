import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 text-foreground">
      <div className="flex max-w-md flex-col items-center text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="mb-6 text-muted-foreground">
          A página que você tentou acessar não existe ou foi movida.
        </p>
        <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Voltar para o Dashboard
        </Link>
      </div>
    </div>
  );
}
