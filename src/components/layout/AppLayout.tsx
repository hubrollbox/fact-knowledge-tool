import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, BookOpen, Settings, Users,
  Archive, FileText, Clock, ChevronDown, ChevronRight,
  LogOut, Menu, X, Scale, Sun, Moon, UserCircle, Landmark
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CountdownFab } from '@/components/dashboard/CountdownFab';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    label: 'Projectos', href: '/processos', icon: FolderOpen, children: [
      { label: 'Cronologia', href: '/processos/cronologia', icon: Clock },
    ]
  },
  {
    label: 'Conhecimento', href: '/conhecimento', icon: BookOpen, children: [
      { label: 'Arquivo', href: '/gestao/arquivo', icon: Archive },
    ]
  },
  {
    label: 'Gestão', icon: Settings, children: [
      { label: 'Clientes', href: '/gestao/clientes', icon: Users },
      { label: 'Relatórios', href: '/gestao/relatorios', icon: FileText },
      { label: 'Tesouraria', href: '/gestao/tesouraria', icon: Landmark },
    ]
  },
];

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some(c => c.href && location.pathname.startsWith(c.href === '/' ? '/x' : c.href));
  });

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  if (item.children) {
    return (
      <div>
        <div
          className={cn(
            'w-full flex items-center gap-1 rounded-md transition-colors',
            open && 'bg-sidebar-accent'
          )}
        >
          {item.href ? (
            <Link
              to={item.href}
              className={cn(
                'flex flex-1 items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            </Link>
          ) : (
            <button
              onClick={() => setOpen(!open)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          )}
          {!collapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(!open)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label={`Alternar submenu ${item.label}`}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
        </div>
        {open && !collapsed && (
          <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
            {item.children.map(child => (
              <Link
                key={child.href}
                to={child.href!}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive(child.href)
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <child.icon className="h-4 w-4 shrink-0" />
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive(item.href)
          ? 'bg-primary text-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fkt-theme') === 'dark' ||
        (!localStorage.getItem('fkt-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('fkt-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('fkt-theme', 'light');
    }
  }, [dark]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-sidebar-border',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <Scale className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-sidebar-foreground tracking-wider">FKT</p>
            <p className="text-xs text-muted-foreground">Factual Knowledge Tool</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => (
          <NavItemComponent key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User */}
      <div className={cn(
        'border-t border-sidebar-border p-3',
        collapsed && 'flex flex-col items-center gap-2'
      )}>
        {!collapsed && (
          <p className="text-xs text-muted-foreground mb-2 truncate px-1">{user?.email}</p>
        )}
        <Button
          asChild
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <Link to="/gestao/perfil">
            <UserCircle className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Perfil</span>}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={handleSignOut}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar border-r border-sidebar-border md:hidden transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent collapsed={false} />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center border-b border-border bg-background px-4 gap-3 shrink-0">
          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Desktop collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <CountdownFab contentSide="bottom" />

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(d => !d)}
            aria-label="Alternar modo escuro"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
