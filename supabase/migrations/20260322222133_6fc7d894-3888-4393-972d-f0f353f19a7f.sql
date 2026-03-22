
ALTER TABLE public.pessoas
  ALTER COLUMN cpf TYPE text,
  ALTER COLUMN nome TYPE text,
  ALTER COLUMN telefone TYPE text,
  ALTER COLUMN email TYPE text,
  ALTER COLUMN whatsapp TYPE text,
  ALTER COLUMN instagram TYPE text,
  ALTER COLUMN titulo_eleitor TYPE text,
  ALTER COLUMN zona_eleitoral TYPE text,
  ALTER COLUMN secao_eleitoral TYPE text,
  ALTER COLUMN municipio TYPE text,
  ALTER COLUMN uf TYPE text,
  ALTER COLUMN situacao_titulo TYPE text,
  ALTER COLUMN origem TYPE text;

ALTER TABLE public.visitas
  ALTER COLUMN assunto TYPE text,
  ALTER COLUMN cadastrado_por TYPE text,
  ALTER COLUMN quem_indicou TYPE text,
  ALTER COLUMN origem_visita TYPE text,
  ALTER COLUMN status TYPE text,
  ALTER COLUMN responsavel_tratativa TYPE text;

ALTER TABLE public.usuarios
  ALTER COLUMN email TYPE text,
  ALTER COLUMN nome_usuario TYPE text;
