-- Issue #39: daily site diary schema and audit coverage.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(9);
SELECT has_column('public','obras_visitas','tipo_registo','visit records support diary entry types');
SELECT has_column('public','obras_visitas','trabalhos_executados','visit records store executed work');
SELECT has_column('public','obras_visitas','equipa_intervenientes','visit records store teams and participants');
SELECT has_column('public','obras_visitas','equipamentos','visit records store equipment');
SELECT has_column('public','obras_visitas','materiais','visit records store materials');
SELECT has_column('public','obras_visitas','condicionantes','visit records store constraints');
SELECT has_column('public','obras_visitas','atrasos','visit records store delays');
SELECT has_trigger('public','obras_visitas','obras_visitas_historico','visit changes are captured in immutable history');
SELECT has_trigger('public','obras_visitas','obras_visitas_validar_autoria','diary entry authorship is set and immutable');
SELECT * FROM finish();
ROLLBACK;