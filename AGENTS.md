# Architecture rules

- Keep the neutral analysis Core in `src/components/processos/` immutable; new cross-cutting presentation features live in `src/modules/experience/` to isolate changes from domain logic.
- AppLayout owns authenticated page width and outer spacing; route pages own only their internal content spacing to avoid doubled gutters.
- Use PageHeader for operational page titles, breadcrumbs and actions; print reports retain their dedicated print layout.
- Render notifications through one Sonner host; the legacy useToast API delegates to the experience adapter so immutable Core callers remain compatible.