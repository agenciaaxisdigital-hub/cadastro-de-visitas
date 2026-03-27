import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Moon, Sun, UserPlus, Loader2, Shield, Headset } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ConfigPage() {
  const { user, nomeUsuario, role, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);

  // User management (admin only)
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ nome_usuario: "", role: "recepcao" as string });
  const [creatingUser, setCreatingUser] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
    if (isAdmin) loadUsuarios();
  }, [isAdmin]);

  async function loadUsuarios() {
    const { data } = await supabase.from("usuarios").select("*").order("criado_em", { ascending: false });
    if (data) {
      const enriched = await Promise.all(data.map(async (u) => {
        const { data: roleData } = await supabase.rpc("get_user_role", { _user_id: u.user_id });
        return { ...u, role: roleData || "recepcao" };
      }));
      setUsuarios(enriched);
    }
  }

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  const handleCreateUser = async () => {
    if (!newUser.nome_usuario.trim()) {
      toast({ title: "Preencha o nome do usuário", variant: "destructive" });
      return;
    }

    const autoEmail = `${newUser.nome_usuario.toLowerCase().replace(/\s+/g, ".")}@interno.app`;
    const autoPassword = newUser.nome_usuario.trim().toLowerCase().replace(/\s+/g, "") + "@123";

    setCreatingUser(true);
    setGeneratedPassword(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: autoEmail,
        password: autoPassword,
        options: { data: { nome: newUser.nome_usuario } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      const { error: userError } = await supabase.from("usuarios").insert({
        user_id: authData.user.id,
        nome_usuario: newUser.nome_usuario,
        email: autoEmail,
      });
      if (userError) throw userError;

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: newUser.role as any,
      });
      if (roleError) throw roleError;

      setGeneratedPassword(autoPassword);
      setNewUser({ nome_usuario: "", role: "recepcao" });
      loadUsuarios();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setCreatingUser(false);
  };

  const roleLabel = (r: string) => {
    switch (r) {
      case "admin": return "Administrador";
      case "recepcao": return "Recepção";
      default: return r;
    }
  };

  const RoleIcon = ({ r }: { r: string }) => {
    if (r === "admin") return <Shield size={14} className="text-primary" />;
    return <Headset size={14} className="text-muted-foreground" />;
  };

  return (
    <AppLayout>
      <h2 className="text-xl font-bold mb-6">Configurações</h2>

      <div className="space-y-4">
        <div className="card-section">
          <p className="section-title">Conta</p>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Usuário</span>
            <span className="font-medium">{nomeUsuario || "–"}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Perfil</span>
            <span className="font-medium flex items-center gap-1">
              <RoleIcon r={role || ""} />
              {roleLabel(role || "")}
            </span>
          </div>
        </div>

        {/* User Management - Admin Only */}
        {isAdmin && (
          <div className="card-section">
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">Usuários do Sistema</p>
              <button onClick={() => setShowAddUser(!showAddUser)}
                className="text-xs font-semibold text-primary flex items-center gap-1 active:scale-95 transition-transform">
                <UserPlus size={14} />
                Novo
              </button>
            </div>

            {showAddUser && (
              <div className="space-y-3 p-3 rounded-xl bg-muted/50 mb-3 animate-fade-in">
                <input type="text" placeholder="Nome do usuário" value={newUser.nome_usuario}
                  onChange={(e) => { setNewUser({ ...newUser, nome_usuario: e.target.value }); setGeneratedPassword(null); }}
                  className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
                  <option value="recepcao">Recepção</option>
                  <option value="admin">Administrador</option>
                </select>
                <button onClick={handleCreateUser} disabled={creatingUser}
                  className="w-full h-10 rounded-lg gradient-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70">
                  {creatingUser ? <Loader2 size={14} className="animate-spin" /> : null}
                  {creatingUser ? "Criando…" : "Criar usuário"}
                </button>
                {generatedPassword && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Usuário criado! Anote a senha inicial:</p>
                    <p className="font-mono text-sm font-bold text-green-800 dark:text-green-300">{generatedPassword}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {usuarios.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{u.nome_usuario}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <RoleIcon r={u.role} />
                      {roleLabel(u.role)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card-section">
          <p className="section-title">Aparência</p>
          <button onClick={toggleDark} className="w-full flex items-center justify-between py-2">
            <span className="text-sm">Modo escuro</span>
            <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${darkMode ? "translate-x-5" : ""}`}>
                {darkMode ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </div>
          </button>
        </div>

        <button onClick={signOut}
          className="w-full h-12 rounded-xl border border-destructive/30 text-destructive font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </AppLayout>
  );
}
