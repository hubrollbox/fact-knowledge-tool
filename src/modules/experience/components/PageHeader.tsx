import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  backTo?: string;
  onBack?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, backTo, onBack, actions, children }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {breadcrumbs && <Breadcrumb><BreadcrumbList className="flex-wrap break-words">
        {breadcrumbs.map((item, index) => <Fragment key={`${item.label}-${index}`}>
          {index > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem>{item.href ? <BreadcrumbLink asChild><Link to={item.href}>{item.label}</Link></BreadcrumbLink> : <BreadcrumbPage>{item.label}</BreadcrumbPage>}</BreadcrumbItem>
        </Fragment>)}
      </BreadcrumbList></Breadcrumb>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backTo ? <Button asChild variant="ghost" size="icon" className="shrink-0" title="Voltar" aria-label="Voltar"><Link to={backTo}><ArrowLeft className="h-4 w-4" /></Link></Button>
            : onBack ? <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0" title="Voltar" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button> : null}
          <div className="min-w-0 space-y-1">
            <h1 className="break-words text-2xl font-bold leading-tight text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {children}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}