import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  nomeUsuario: string;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        fetchNomeUsuario(session.user.id);
      } else {
        setNomeUsuario("");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        fetchNomeUsuario(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchNomeUsuario(userId: string) {
    const { data } = await supabase
      .from("usuarios")
      .select("nome_usuario")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setNomeUsuario(data.nome_usuario);
  }

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
    // Look up email by username
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("email")
      .eq("nome_usuario", username)
      .maybeSingle();

    if (!usuario) {
      return { error: "Usuário não encontrado" };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password,
    });

    if (error) {
      return { error: "Senha incorreta" };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, nomeUsuario, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
