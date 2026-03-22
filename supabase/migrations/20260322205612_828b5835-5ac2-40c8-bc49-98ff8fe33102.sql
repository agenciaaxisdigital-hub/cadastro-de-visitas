
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_usuario varchar(100) UNIQUE NOT NULL,
  email varchar(255) NOT NULL,
  criado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Allow anon to read username/email for login lookup
CREATE POLICY "Allow anon read usuarios for login" ON public.usuarios
FOR SELECT TO anon USING (true);

-- Allow authenticated full read
CREATE POLICY "Allow authenticated read usuarios" ON public.usuarios
FOR SELECT TO authenticated USING (true);

-- Insert the admin user mapping
INSERT INTO public.usuarios (user_id, nome_usuario, email)
VALUES ('91e63621-4f57-488f-8546-f115597b371e', 'Administrador', 'admin@drafernandasarelli.com.br');
