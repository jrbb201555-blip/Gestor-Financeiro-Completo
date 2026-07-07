import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Tags, 
  Wallet, 
  CalendarMinus, 
  CalendarPlus, 
  TrendingUp,
  Landmark
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
    { href: "/contas-a-pagar", label: "A Pagar", icon: CalendarMinus },
    { href: "/contas-a-receber", label: "A Receber", icon: CalendarPlus },
    { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp },
    { href: "/contas", label: "Contas", icon: Wallet },
    { href: "/categorias", label: "Categorias", icon: Tags },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
        <Landmark className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">ControlFin</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function Header({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
