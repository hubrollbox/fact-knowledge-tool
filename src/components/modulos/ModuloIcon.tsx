import {
  Scale, Dog, Code, FolderKanban, Clock, FileText, GitBranch, Users, Printer,
  CalendarDays, Heart, BedDouble, Syringe, FolderGit2, GitPullRequest,
  BookOpen, ListChecks, BarChart3, LucideIcon,
} from 'lucide-react';

const map: Record<string, LucideIcon> = {
  Scale, Dog, Code, FolderKanban, Clock, FileText, GitBranch, Users, Printer,
  CalendarDays, Heart, BedDouble, Syringe, FolderGit2, GitPullRequest,
  BookOpen, ListChecks, BarChart3,
};

export function ModuloIcon({ name, className }: { name: string; className?: string }) {
  const Icon = map[name] ?? FileText;
  return <Icon className={className} />;
}
