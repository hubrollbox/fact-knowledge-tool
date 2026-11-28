CREATE OR REPLACE FUNCTION private.validar_obras_recepcao()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE item jsonb;
BEGIN
  IF NEW.estado IN ('concluida','recebida_com_reservas') THEN
    IF NEW.estado = 'concluida' AND length(btrim(COALESCE(NEW.reservas,''))) > 0 THEN
      RAISE EXCEPTION 'Uma recepção com reservas deve manter o estado recebida_com_reservas';
    END IF;
    IF jsonb_array_length(NEW.pendencias) > 0 THEN
      FOR item IN SELECT value FROM jsonb_array_elements(NEW.pendencias) LOOP
        IF COALESCE(item->>'decisao','') NOT IN ('resolvida','reserva_aceite')
           OR (item->>'decisao' = 'reserva_aceite' AND length(btrim(COALESCE(item->>'justificacao',''))) = 0) THEN
          RAISE EXCEPTION 'Todas as pendências têm de estar resolvidas ou justificadas como reserva';
        END IF;
      END LOOP;
    END IF;
    NEW.recebido_em := COALESCE(NEW.recebido_em, clock_timestamp());
    NEW.recebido_por := COALESCE(NEW.recebido_por, (SELECT auth.uid()));
  ELSE
    NEW.recebido_em := NULL;
    NEW.recebido_por := NULL;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;