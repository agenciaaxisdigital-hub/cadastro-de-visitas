import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "recepcao";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  nomeUsuario: string;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setNomeUsuario("");
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nome_usuario")
      .eq("user_id", userId)
      .maybeSingle();
    if (usuario) setNomeUsuario(usuario.nome_usuario);

    const { data: userRole } = await supabase.rpc("get_user_role", { _user_id: userId });
    if (userRole) {
      setRole(userRole as AppRole);
    }
  }

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
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
    <AuthContext.Provider value={{
      session, user: session?.user ?? null,
      nomeUsuario, role, loading,
      isAdmin: role === "admin",
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
