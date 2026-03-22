import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Loader2, Lock, CheckCircle2, AlertCircle, User, Search } from "lucide-react";
import { maskCPF, unmaskCPF, maskPhone, maskTitulo, validateCPF } from "@/lib/masks";
import { ASSUNTOS, ORIGENS_VISITA, STATUS_OPTIONS, UF_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface DadosPessoa {
  cpf: string;
  nome: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  whatsapp: string;
  instagram: string;
  outras_redes: string;
  titulo_eleitor: string;
  zona_eleitoral: string;
  secao_eleitoral: string;
  municipio: string;
  uf: string;
  situacao_titulo: string;
  observacoes_gerais: string;
}

interface DadosVisita {
  data_hora: string;
  assunto: string;
  descricao_assunto: string;
  quem_indicou: string;
  origem_visita: string;
  status: string;
  responsavel_tratativa: string;
  observacoes: string;
}

const EMPTY_PESSOA: DadosPessoa = {
  cpf: "", nome: "", data_nascimento: "", telefone: "", email: "",
  whatsapp: "", instagram: "", outras_redes: "",
  titulo_eleitor: "", zona_eleitoral: "", secao_eleitoral: "",
  municipio: "", uf: "", situacao_titulo: "", observacoes_gerais: "",
};

export default function NovaVisita() {
  const navigate = useNavigate();
  const { pessoaId } = useParams<{ pessoaId?: string }>();
  const { toast } = useToast();
  const { nomeUsuario, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingPessoaId, setExistingPessoaId] = useState<string | null>(pessoaId || null);
  const [locked, setLocked] = useState(false);
  const [showForm, setShowForm] = useState(!!pessoaId);
  const [pessoaStatus, setPessoaStatus] = useState<"idle" | "found" | "new" | "api">("idle");
  const [visitHistory, setVisitHistory] = useState<any[]>([]);

  // "visit_only" mode: person found, recepcao only fills visit data
  // "full" mode: new person, fill everything
  const formMode = pessoaStatus === "found" ? "visit_only" : "full";

  const [pessoa, setPessoa] = useState<DadosPessoa>({ ...EMPTY_PESSOA });
  const [visita, setVisita] = useState<DadosVisita>({
    data_hora: new Date().toISOString().slice(0, 16),
    assunto: "", descricao_assunto: "", quem_indicou: "",
    origem_visita: "", status: "Aguardando",
    responsavel_tratativa: "", observacoes: "",
  });

  useEffect(() => {
    if (pessoaId) loadExistingPessoa(pessoaId);
  }, [pessoaId]);

  async function loadExistingPessoa(id: string) {
    const { data } = await supabase.from("pessoas").select("*").eq("id", id).maybeSingle();
    if (data) {
      fillPessoa(data);
      setExistingPessoaId(id);
      setPessoaStatus("found");
      setLocked(true);
      setShowForm(true);
      setSearchInput(data.cpf && !data.cpf.startsWith("TEMP") ? maskCPF(data.cpf) : data.nome || "");
      loadVisitHistory(id);
    }
  }

  function fillPessoa(data: any) {
    setPessoa({
      cpf: data.cpf || "",
      nome: data.nome || "",
      data_nascimento: data.data_nascimento || "",
      telefone: data.telefone || "",
      email: data.email || "",
      whatsapp: data.whatsapp || "",
      instagram: data.instagram || "",
      outras_redes: data.outras_redes || "",
      titulo_eleitor: data.titulo_eleitor || "",
      zona_eleitoral: data.zona_eleitoral || "",
      secao_eleitoral: data.secao_eleitoral || "",
      municipio: data.municipio || "",
      uf: data.uf || "",
      situacao_titulo: data.situacao_titulo || "",
      observacoes_gerais: data.observacoes_gerais || "",
    });
  }

  async function loadVisitHistory(pessoaId: string) {
    const { data } = await supabase
      .from("visitas")
      .select("id, data_hora, assunto, status")
      .eq("pessoa_id", pessoaId)
      .order("data_hora", { ascending: false })
      .limit(5);
    setVisitHistory(data || []);
  }

  // Search by CPF (digits) or by name
  const handleSearch = useCallback(async () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    setSearching(true);
    const raw = unmaskCPF(trimmed);
    const isCPF = raw.length >= 11 && /^\d{11}$/.test(raw.slice(0, 11));

    if (isCPF) {
      if (!validateCPF(raw.slice(0, 11))) {
        toast({ title: "CPF inválido", variant: "destructive" });
        setSearching(false);
        return;
      }
      // Search by CPF in DB
      const { data: existente } = await supabase
        .from("pessoas")
        .select("*")
        .eq("cpf", raw.slice(0, 11))
        .maybeSingle();

      if (existente) {
        fillPessoa(existente);
        setExistingPessoaId(existente.id);
        setPessoaStatus("found");
        setLocked(true);
        setShowForm(true);
        loadVisitHistory(existente.id);
        setSearching(false);
        return;
      }

      // Try Brasil API
      try {
        const resp = await fetch(`https://brasilapi.com.br/api/cpf/v1/${raw.slice(0, 11)}`);
        if (resp.ok) {
          const data = await resp.json();
          setPessoa(prev => ({
            ...prev,
            cpf: raw.slice(0, 11),
            nome: data.nome || "",
            data_nascimento: data.data_nascimento ? data.data_nascimento.slice(0, 10) : "",
          }));
          setPessoaStatus("api");
        } else {
          setPessoa(prev => ({ ...prev, cpf: raw.slice(0, 11) }));
          setPessoaStatus("new");
        }
      } catch {
        setPessoa(prev => ({ ...prev, cpf: raw.slice(0, 11) }));
        setPessoaStatus("new");
      }

      setLocked(true);
      setShowForm(true);
    } else {
      // Search by name
      const { data: matches } = await supabase
        .from("pessoas")
        .select("*")
        .ilike("nome", `%${trimmed}%`)
        .limit(1);

      if (matches && matches.length > 0) {
        fillPessoa(matches[0]);
        setExistingPessoaId(matches[0].id);
        setPessoaStatus("found");
        setLocked(true);
        setShowForm(true);
        loadVisitHistory(matches[0].id);
      } else {
        setPessoa(prev => ({ ...prev, nome: trimmed }));
        setPessoaStatus("new");
        setLocked(true);
        setShowForm(true);
      }
    }

    setSearching(false);
  }, [searchInput, toast]);

  // Auto-search on CPF completion
  const handleInputChange = (value: string) => {
    const raw = unmaskCPF(value);
    if (/^\d+$/.test(raw) && raw.length <= 11) {
      setSearchInput(maskCPF(value));
      if (raw.length === 11) {
        // Trigger search automatically
        setTimeout(() => {
          const input = raw;
          setSearchInput(maskCPF(input));
        }, 0);
      }
    } else {
      setSearchInput(value);
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setLocked(false);
    setPessoaStatus("idle");
    setShowForm(false);
    setExistingPessoaId(null);
    setPessoa({ ...EMPTY_PESSOA });
    setVisitHistory([]);
  };

  const handleSave = async () => {
    if (!pessoa.nome && formMode === "full") {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!visita.assunto) {
      toast({ title: "Assunto obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let pid: string;

      if (existingPessoaId) {
        pid = existingPessoaId;
        // Only admin can update person data
        if (isAdmin && formMode === "full") {
          await supabase.from("pessoas").update({
            nome: pessoa.nome, telefone: pessoa.telefone || null,
            email: pessoa.email || null, whatsapp: pessoa.whatsapp || null,
            instagram: pessoa.instagram || null, outras_redes: pessoa.outras_redes || null,
            titulo_eleitor: pessoa.titulo_eleitor || null, zona_eleitoral: pessoa.zona_eleitoral || null,
            secao_eleitoral: pessoa.secao_eleitoral || null, municipio: pessoa.municipio || null,
            uf: pessoa.uf || null, data_nascimento: pessoa.data_nascimento || null,
            situacao_titulo: pessoa.situacao_titulo || null, observacoes_gerais: pessoa.observacoes_gerais || null,
            atualizado_em: new Date().toISOString(),
          }).eq("id", pid);
        }
      } else {
        const cpfToSave = pessoa.cpf || `TEMP${Date.now()}`;
        const { data: novaPessoa, error } = await supabase.from("pessoas").insert({
          cpf: cpfToSave, nome: pessoa.nome,
          telefone: pessoa.telefone || null, email: pessoa.email || null,
          whatsapp: pessoa.whatsapp || null, instagram: pessoa.instagram || null,
          outras_redes: pessoa.outras_redes || null, titulo_eleitor: pessoa.titulo_eleitor || null,
          zona_eleitoral: pessoa.zona_eleitoral || null, secao_eleitoral: pessoa.secao_eleitoral || null,
          municipio: pessoa.municipio || null, uf: pessoa.uf || null,
          data_nascimento: pessoa.data_nascimento || null, situacao_titulo: pessoa.situacao_titulo || null,
          observacoes_gerais: pessoa.observacoes_gerais || null,
        }).select("id").single();
        if (error) throw error;
        pid = novaPessoa.id;
      }

      const { error: visitaError } = await supabase.from("visitas").insert({
        pessoa_id: pid,
        data_hora: visita.data_hora ? new Date(visita.data_hora).toISOString() : new Date().toISOString(),
        assunto: visita.assunto, descricao_assunto: visita.descricao_assunto || null,
        quem_indicou: visita.quem_indicou || null, origem_visita: visita.origem_visita || null,
        status: visita.status, responsavel_tratativa: visita.responsavel_tratativa || null,
        observacoes: visita.observacoes || null, cadastrado_por: nomeUsuario || "",
      });
      if (visitaError) throw visitaError;

      toast({ title: "✅ Visita registrada!" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const InputField = ({ label, value, onChange, placeholder, type = "text", readonly = false }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; readonly?: boolean;
  }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readonly} placeholder={placeholder}
          className={cn(
            "w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow",
            readonly && "opacity-60 bg-muted"
          )}
        />
        {readonly && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </div>
    </div>
  );

  const SelectField = ({ label, value, onChange, options, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none">
        <option value="">{placeholder || "Selecione…"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aguardando": return "text-yellow-600 dark:text-yellow-400";
      case "Em andamento": return "text-blue-600 dark:text-blue-400";
      case "Resolvido": return "text-emerald-600 dark:text-emerald-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95 transition">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Nova Visita</h2>
      </div>

      {/* ── Search (CPF or Name) ── */}
      {!pessoaId && (
        <div className="card-section mb-4 animate-fade-in">
          <p className="text-sm font-semibold mb-2">Buscar visitante (CPF ou Nome)</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => !locked && handleInputChange(e.target.value)}
                readOnly={locked}
                placeholder="Digite CPF ou nome…"
                className={cn(
                  "w-full h-12 rounded-xl bg-card border border-border px-4 pr-12 text-base shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow",
                  locked && "opacity-70 bg-muted"
                )}
                onKeyDown={(e) => e.key === "Enter" && !locked && handleSearch()}
              />
              {searching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
            </div>
            {locked ? (
              <button onClick={clearSearch} className="h-12 px-4 rounded-xl border border-border text-sm font-medium active:scale-95 transition-transform">
                Trocar
              </button>
            ) : (
              <button onClick={handleSearch} disabled={searching || !searchInput.trim()}
                className="h-12 px-4 rounded-xl gradient-primary text-white font-semibold active:scale-95 transition-transform disabled:opacity-50">
                <Search size={18} />
              </button>
            )}
          </div>

          {/* Status feedback */}
          {pessoaStatus === "found" && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{pessoa.nome}</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                  Pessoa já cadastrada — preencha os dados da visita abaixo
                </p>
              </div>
            </div>
          )}
          {pessoaStatus === "api" && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <User size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">Nome encontrado: <strong>{pessoa.nome}</strong> — complete os dados</p>
            </div>
          )}
          {pessoaStatus === "new" && locked && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle size={18} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Pessoa não encontrada — preencha o cadastro abaixo</p>
            </div>
          )}

          {!locked && !searching && (
            <button onClick={() => { setPessoaStatus("new"); setLocked(true); setShowForm(true); }}
              className="w-full text-center text-xs text-muted-foreground mt-2 py-1.5 hover:text-foreground transition-colors">
              Cadastrar sem CPF
            </button>
          )}
        </div>
      )}

      {/* ── Visit History (if person found) ── */}
      {pessoaStatus === "found" && visitHistory.length > 0 && (
        <div className="card-section mb-4 animate-fade-in">
          <p className="text-sm font-semibold mb-2">Histórico de visitas ({visitHistory.length})</p>
          <div className="space-y-2">
            {visitHistory.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-xs font-medium">{v.assunto || "–"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {v.data_hora ? new Date(v.data_hora).toLocaleDateString("pt-BR") : "–"}
                  </p>
                </div>
                <span className={cn("text-[10px] font-semibold", getStatusColor(v.status))}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="space-y-4 animate-fade-in">

          {/* Person Data - only for new or admin editing */}
          {(formMode === "full" || isAdmin) && (
            <>
              <div className="card-section">
                <p className="text-sm font-semibold mb-3 text-primary">Dados Pessoais</p>
                <div className="space-y-3">
                  <InputField label="Nome completo *" value={pessoa.nome} onChange={(v) => setPessoa({ ...pessoa, nome: v })} placeholder="Nome do visitante" />
                  <InputField label="Data de nascimento" value={pessoa.data_nascimento} onChange={(v) => setPessoa({ ...pessoa, data_nascimento: v })} type="date" />
                  <InputField label="Telefone / WhatsApp" value={pessoa.telefone} onChange={(v) => setPessoa({ ...pessoa, telefone: maskPhone(v) })} placeholder="(00) 00000-0000" />
                  <InputField label="E-mail" value={pessoa.email} onChange={(v) => setPessoa({ ...pessoa, email: v })} type="email" placeholder="email@exemplo.com" />
                </div>
              </div>

              <div className="card-section">
                <p className="text-sm font-semibold mb-3 text-primary">Dados Eleitorais</p>
                <div className="space-y-3">
                  <InputField label="Título de eleitor" value={pessoa.titulo_eleitor} onChange={(v) => setPessoa({ ...pessoa, titulo_eleitor: maskTitulo(v) })} placeholder="0000 0000 0000" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Zona" value={pessoa.zona_eleitoral} onChange={(v) => setPessoa({ ...pessoa, zona_eleitoral: v.replace(/\D/g, "") })} placeholder="Ex: 42" />
                    <InputField label="Seção" value={pessoa.secao_eleitoral} onChange={(v) => setPessoa({ ...pessoa, secao_eleitoral: v.replace(/\D/g, "") })} placeholder="Ex: 123" />
                  </div>
                  <InputField label="Município" value={pessoa.municipio} onChange={(v) => setPessoa({ ...pessoa, municipio: v })} placeholder="Cidade" />
                  <SelectField label="UF" value={pessoa.uf} onChange={(v) => setPessoa({ ...pessoa, uf: v })} options={UF_OPTIONS} />
                  <SelectField label="Situação do título" value={pessoa.situacao_titulo} onChange={(v) => setPessoa({ ...pessoa, situacao_titulo: v })} options={["Regular", "Cancelado", "Suspenso", "Não possui"]} />
                </div>
              </div>
            </>
          )}

          {/* Person summary for recepcao when person found */}
          {formMode === "visit_only" && !isAdmin && (
            <div className="card-section">
              <p className="text-sm font-semibold mb-2 text-primary">Visitante</p>
              <p className="text-sm font-medium">{pessoa.nome}</p>
              {pessoa.telefone && <p className="text-xs text-muted-foreground">Tel: {pessoa.telefone}</p>}
              {pessoa.municipio && <p className="text-xs text-muted-foreground">{pessoa.municipio} - {pessoa.uf}</p>}
            </div>
          )}

          {/* Visit Data - always visible */}
          <div className="card-section">
            <p className="text-sm font-semibold mb-3 text-primary">Dados da Visita</p>
            <div className="space-y-3">
              <InputField label="Data e hora" value={visita.data_hora} onChange={(v) => setVisita({ ...visita, data_hora: v })} type="datetime-local" />
              <SelectField label="Assunto *" value={visita.assunto} onChange={(v) => setVisita({ ...visita, assunto: v })} options={ASSUNTOS} placeholder="Selecione o assunto" />
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</label>
                <textarea value={visita.descricao_assunto} onChange={(e) => setVisita({ ...visita, descricao_assunto: e.target.value })}
                  rows={2} placeholder="Detalhes…"
                  className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none" />
              </div>
              <InputField label="Quem indicou" value={visita.quem_indicou} onChange={(v) => setVisita({ ...visita, quem_indicou: v })} placeholder="Nome" />
              <SelectField label="Como chegou?" value={visita.origem_visita} onChange={(v) => setVisita({ ...visita, origem_visita: v })} options={ORIGENS_VISITA} />
            </div>
          </div>

          {/* Status/Tratativa */}
          <div className="card-section">
            <p className="text-sm font-semibold mb-3 text-primary">Tratativa</p>
            <div className="space-y-3">
              <SelectField label="Status" value={visita.status} onChange={(v) => setVisita({ ...visita, status: v })} options={STATUS_OPTIONS} />
              <InputField label="Responsável" value={visita.responsavel_tratativa} onChange={(v) => setVisita({ ...visita, responsavel_tratativa: v })} />
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
                <textarea value={visita.observacoes} onChange={(e) => setVisita({ ...visita, observacoes: e.target.value })}
                  rows={3} placeholder="Observações…"
                  className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none" />
              </div>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full h-12 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Salvando…" : "Salvar visita"}
          </button>
          <button onClick={() => navigate(-1)} className="w-full h-10 rounded-xl text-sm text-muted-foreground active:scale-95 transition-transform mb-4">
            Cancelar
          </button>
        </div>
      )}
    </AppLayout>
  );
}
