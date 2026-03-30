import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import {
  LogOut, Moon, Sun, UserPlus, Loader2, Shield, Headset,
  Pencil, X, Check, Key, ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Client separado para criar usuários sem afetar a sessão do admin
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

interface UsuarioComRole {
  id: string;
  user_id: string;
  nome_usuario: string;
  email: string;
  role: string;
}

export default function ConfigPage() {
  const { user, nomeUsuario, role, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);

  // User management (admin only)
  const [usuarios, setUsuarios] = useState<UsuarioComRole[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ nome_usuario: "", email: "", password: "", role: "recepcao" });
  const [creatingUser, setCreatingUser] = useState(false);

  // Editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  // Password change
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Expanded user
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

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
        return { ...u, role: roleData || "recepcao" } as UsuarioComRole;
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
    const nome = newUser.nome_usuario.trim();
    const email = newUser.email.trim();
    const password = newUser.password;

    if (!nome || !email || !password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setCreatingUser(true);
    try {
      // Usa o client separado para não deslogar o admin
      const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      const { error: userError } = await supabase.from("usuarios").insert({
        user_id: authData.user.id,
        nome_usuario: nome,
        email,
      });
      if (userError) throw userError;

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: newUser.role as any,
      });
      if (roleError) throw roleError;

      setNewUser({ nome_usuario: "", email: "", password: "", role: "recepcao" });
      setShowAddUser(false);
      toast({ title: "Sucesso!", description: `Usuário "${nome}" criado com sucesso.` });
      loadUsuarios();
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    }
    setCreatingUser(false);
  };

  const handleUpdateRole = async (userId: string) => {
    setSavingRole(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: editRole as any })
        .eq("user_id", userId);
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Perfil atualizado." });
      setEditingUserId(null);
      loadUsuarios();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSavingRole(false);
  };

  const handleChangePassword = async (userEmail: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      // Para alterar a senha de outro usuário pelo client-side,
      // precisamos usar a API de reset. Porém, a forma mais direta
      // é gerar um magic link / password reset via e-mail.
      // Como alternativa funcional, fazemos login no client separado
      // e atualizamos a senha. Mas precisaríamos da senha antiga.
      // A solução mais limpa: usar o password reset do Supabase.
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;

      toast({
        title: "Link de redefinição enviado!",
        description: `Um e-mail foi enviado para ${userEmail} com o link para redefinir a senha.`,
      });
      setChangingPasswordUserId(null);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSavingPassword(false);
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

  const toggleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setEditingUserId(null);
      setChangingPasswordUserId(null);
    } else {
      setExpandedUserId(userId);
      setEditingUserId(null);
      setChangingPasswordUserId(null);
    }
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
              <button onClick={() => { setShowAddUser(!showAddUser); }}
                className="text-xs font-semibold text-primary flex items-center gap-1 active:scale-95 transition-transform">
                {showAddUser ? <X size={14} /> : <UserPlus size={14} />}
                {showAddUser ? "Cancelar" : "Novo"}
              </button>
            </div>

            {showAddUser && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/50 mb-4 animate-fade-in border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Novo Usuário</p>

                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Nome</label>
                  <input type="text" placeholder="Ex: Maria Silva" value={newUser.nome_usuario}
                    onChange={(e) => setNewUser({ ...newUser, nome_usuario: e.target.value })}
                    className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">E-mail</label>
                  <input type="email" placeholder="Ex: maria@email.com" value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Senha</label>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Perfil</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
                    <option value="recepcao">Recepção</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <button onClick={handleCreateUser} disabled={creatingUser}
                  className="w-full h-11 rounded-lg gradient-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70 mt-1">
                  {creatingUser ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={16} />}
                  {creatingUser ? "Criando…" : "Criar usuário"}
                </button>
              </div>
            )}

            <div className="space-y-1">
              {usuarios.map((u) => {
                const isExpanded = expandedUserId === u.user_id;
                const isEditingRole = editingUserId === u.user_id;
                const isChangingPw = changingPasswordUserId === u.user_id;
                const isSelf = u.user_id === user?.id;

                return (
                  <div key={u.id} className="rounded-xl border border-border/50 overflow-hidden transition-all">
                    {/* User row */}
                    <button
                      onClick={() => toggleExpand(u.user_id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {u.nome_usuario.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {u.nome_usuario}
                            {isSelf && <span className="text-[10px] text-primary ml-1">(você)</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <RoleIcon r={u.role} />
                            {roleLabel(u.role)}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                    </button>

                    {/* Expanded actions */}
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 animate-fade-in border-t border-border/30 pt-2">
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>

                        {/* Edit Role */}
                        {!isEditingRole ? (
                          <button
                            onClick={() => { setEditingUserId(u.user_id); setEditRole(u.role); setChangingPasswordUserId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 text-sm transition-colors"
                          >
                            <Pencil size={13} className="text-muted-foreground" />
                            <span>Alterar perfil</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                              className="flex-1 h-9 rounded-lg bg-card border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
                              <option value="recepcao">Recepção</option>
                              <option value="admin">Administrador</option>
                            </select>
                            <button onClick={() => handleUpdateRole(u.user_id)} disabled={savingRole}
                              className="h-9 w-9 rounded-lg bg-green-500 text-white flex items-center justify-center shrink-0 active:scale-90 transition-transform disabled:opacity-60">
                              {savingRole ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditingUserId(null)}
                              className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 active:scale-90 transition-transform">
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Change password */}
                        {!isChangingPw ? (
                          <button
                            onClick={() => { setChangingPasswordUserId(u.user_id); setNewPassword(""); setEditingUserId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 text-sm transition-colors"
                          >
                            <Key size={13} className="text-muted-foreground" />
                            <span>Redefinir senha</span>
                          </button>
                        ) : (
                          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-xs text-muted-foreground">
                              Um e-mail será enviado para <strong>{u.email}</strong> com o link para redefinir a senha.
                            </p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleChangePassword(u.email)} disabled={savingPassword}
                                className="flex-1 h-9 rounded-lg gradient-primary text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-60">
                                {savingPassword ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                                Enviar link
                              </button>
                              <button onClick={() => setChangingPasswordUserId(null)}
                                className="h-9 px-3 rounded-lg bg-muted text-muted-foreground text-xs font-medium active:scale-90 transition-transform">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {usuarios.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário registrado</p>
              )}
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
