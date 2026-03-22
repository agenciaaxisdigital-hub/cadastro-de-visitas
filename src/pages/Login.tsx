import { useState } from "react";
import { ShapeGridBackground } from "@/components/ShapeGridBackground";
import candidataImg from "@/assets/candidata.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, User, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Digite o nome de usuário");
      return;
    }
    setLoading(true);
    const { error } = await signIn(username.trim(), password);
    if (error) {
      setError(error);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ShapeGridBackground />

      <div className="relative z-10 w-full max-w-sm mx-4 animate-slide-up">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-pink-500 to-rose-400">
              <img
                src={candidataImg}
                alt="Dra. Fernanda Sarelli"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" />
          </div>
          <h1 className="text-white text-xl font-bold">Dra. Fernanda Sarelli</h1>
          <p className="text-pink-400 text-[11px] uppercase tracking-widest mt-1">
            Recepção do Comitê
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 40px rgba(236,72,153,0.1)",
          }}
        >
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-white/50">
              Usuário
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-12 rounded-xl pl-11 pr-4 text-white outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(236,72,153,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                placeholder="Nome de usuário"
                autoCapitalize="none"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-white/50">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 rounded-xl px-4 text-white outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(236,72,153,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-pink-500"
            />
            <span className="text-sm text-white/60">Lembrar de mim</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
