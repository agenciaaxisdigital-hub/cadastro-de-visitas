
CREATE TABLE public.pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf varchar(11) UNIQUE NOT NULL,
  nome varchar(255),
  data_nascimento date,
  telefone varchar(20),
  email varchar(255),
  instagram varchar(100),
  whatsapp varchar(20),
  outras_redes text,
  titulo_eleitor varchar(20),
  zona_eleitoral varchar(10),
  secao_eleitoral varchar(10),
  municipio varchar(100),
  uf varchar(2),
  situacao_titulo varchar(50),
  origem varchar(50),
  observacoes_gerais text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE public.visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid REFERENCES public.pessoas(id) ON DELETE CASCADE,
  data_hora timestamp with time zone DEFAULT now(),
  assunto varchar(50),
  descricao_assunto text,
  quem_indicou varchar(255),
  origem_visita varchar(50),
  status varchar(30) DEFAULT 'Aguardando',
  responsavel_tratativa varchar(255),
  observacoes text,
  cadastrado_por varchar(255),
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read pessoas" ON public.pessoas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert pessoas" ON public.pessoas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update pessoas" ON public.pessoas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete pessoas" ON public.pessoas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read visitas" ON public.visitas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert visitas" ON public.visitas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update visitas" ON public.visitas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete visitas" ON public.visitas FOR DELETE TO authenticated USING (true);
