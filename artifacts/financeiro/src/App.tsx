import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout';

import Dashboard from '@/pages/dashboard';
import Transacoes from '@/pages/transacoes';
import Categorias from '@/pages/categorias';
import Contas from '@/pages/contas';
import ContasAPagar from '@/pages/contas-a-pagar';
import ContasAReceber from '@/pages/contas-a-receber';
import FluxoCaixa from '@/pages/fluxo-caixa';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transacoes" component={Transacoes} />
        <Route path="/categorias" component={Categorias} />
        <Route path="/contas" component={Contas} />
        <Route path="/contas-a-pagar" component={ContasAPagar} />
        <Route path="/contas-a-receber" component={ContasAReceber} />
        <Route path="/fluxo-caixa" component={FluxoCaixa} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
