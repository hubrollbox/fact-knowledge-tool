CREATE OR REPLACE FUNCTION public.create_application_with_factos(_dossier_id uuid, _issue_id uuid, _rule_id uuid, _argumento text, _tipo text DEFAULT 'pro'::text, _facto_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _app_id uuid; _fid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dossiers WHERE id = _dossier_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF _issue_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.issues WHERE id = _issue_id AND dossier_id = _dossier_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF _rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rules WHERE id = _rule_id AND dossier_id = _dossier_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(_facto_ids,'{}'::uuid[])) f(id)
             WHERE NOT EXISTS (SELECT 1 FROM public.factos WHERE factos.id = f.id AND factos.dossier_id = _dossier_id)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO public.applications (dossier_id, issue_id, rule_id, argumento, tipo)
  VALUES (_dossier_id, _issue_id, _rule_id, _argumento, _tipo) RETURNING id INTO _app_id;
  FOREACH _fid IN ARRAY COALESCE(_facto_ids,'{}'::uuid[]) LOOP
    INSERT INTO public.application_factos (application_id, facto_id) VALUES (_app_id, _fid);
  END LOOP;
  RETURN _app_id;
END;
$function$;