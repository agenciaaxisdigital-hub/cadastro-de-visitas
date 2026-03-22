import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Search, Loader2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { maskCPF, unmaskCPF, maskPhone, maskTitulo, validateCPF, formatDate } from "@/lib/masks";
import { ASSUNTOS, ORIGENS_VISITA, STATUS_OPTIONS, UF_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Step = "cpf" | "form";

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

export default function NovaVisita() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("cpf");
  const [cpfInput, setCpfInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [cpfReadonly, setCpfReadonly] = useState(false);
  const [existingPessoa, setExistingPessoa] = useState<any>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pessoais: true,
    redes: true,
    eleitorais: true,
    visita: true,
    tratativa: true,
  });

  const [pessoa, setPessoa] = useState<DadosPessoa>({
    cpf: "", nome: "", data_nascimento: "", telefone: "", email: "",
    whatsapp: "", instagram: "", outras_redes: "",
    titulo_eleitor: "", zona_eleitoral: "", secao_eleitoral: "",
    municipio: "", uf: "",
  });

  const [visita, setVisita] = useState<DadosVisita>({
    data_hora: new Date().toISOString().slice(0, 16),
    assunto: "", descricao_assunto: "", quem_indicou: "",
    origem_visita: "", status: "Aguardando",
    responsavel_tratativa: "", observacoes: "",
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCPFSearch = async () => {
    const raw = unmaskCPF(cpfInput);
    if (!validateCPF(raw)) {
      toast({ title: "CPF inválido", description: "Verifique os números digitados.", variant: "destructive" });
      return;
    }

    setSearching(true);

    // Check local DB first
    const { data: existente } = await supabase
      .from("pessoas")
      .select("*, visitas(count)")
      .eq("cpf", raw)
      .maybeSingle();

    if (existente) {
      setExistingPessoa(existente);
      setSearching(false);
      return;
    }

    // Try Brasil API
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cpf/v1/${raw}`);
      if (resp.ok) {
        const data = await resp.json();
        setApiData(data);
        setPessoa((prev) => ({
          ...prev,
          cpf: raw,
          nome: data.nome || "",
          data_nascimento: data.data_nascimento ? data.data_nascimento.slice(0, 10) : "",
        }));
      } else {
        setPessoa((prev) => ({ ...prev, cpf: raw }));
        setStep("form");
        setCpfReadonly(true);
      }
    } catch {
      toast({ title: "Erro na busca", description: "Não foi possível buscar os dados. Preencha manualmente." });
      setPessoa((prev) => ({ ...prev, cpf: raw }));
      setStep("form");
      setCpfReadonly(true);
    }

    setSearching(false);
  };

  const confirmApiData = () => {
    setCpfReadonly(true);
    setStep("form");
    setApiData(null);
  };

  const useExistingPessoa = () => {
    navigate(`/nova-visita-existente/${existingPessoa.id}`);
  };

  const skipCPF = () => {
    setPessoa((prev) => ({ ...prev, cpf: "" }));
    setStep("form");
  };

  const handleSave = async () => {
    if (!pessoa.nome && !pessoa.cpf) {
      toast({ title: "Nome obrigatório", description: "Preencha o nome do visitante.", variant: "destructive" });
      return;
    }
    if (!visita.assunto) {
      toast({ title: "Assunto obrigatório", description: "Selecione o assunto da visita.", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      // Upsert pessoa
      let pessoaId: string;
      if (pessoa.cpf) {
        const { data: existing } = await supabase.from("pessoas").select("id").eq("cpf", pessoa.cpf).maybeSingle();
        if (existing) {
          pessoaId = existing.id;
          await supabase.from("pessoas").update({
            nome: pessoa.nome,
            telefone: pessoa.telefone,
            email: pessoa.email,
            whatsapp: pessoa.whatsapp,
            instagram: pessoa.instagram,
            outras_redes: pessoa.outras_redes,
            titulo_eleitor: pessoa.titulo_eleitor,
            zona_eleitoral: pessoa.zona_eleitoral,
            secao_eleitoral: pessoa.secao_eleitoral,
            municipio: pessoa.municipio,
            uf: pessoa.uf,
            data_nascimento: pessoa.data_nascimento || null,
            atualizado_em: new Date().toISOString(),
          }).eq("id", pessoaId);
        } else {
          const { data: novaPessoa, error } = await supabase.from("pessoas").insert({
            cpf: pessoa.cpf,
            nome: pessoa.nome,
            telefone: pessoa.telefone,
            email: pessoa.email,
            whatsapp: pessoa.whatsapp,
            instagram: pessoa.instagram,
            outras_redes: pessoa.outras_redes,
            titulo_eleitor: pessoa.titulo_eleitor,
            zona_eleitoral: pessoa.zona_eleitoral,
            secao_eleitoral: pessoa.secao_eleitoral,
            municipio: pessoa.municipio,
            uf: pessoa.uf,
            data_nascimento: pessoa.data_nascimento || null,
          }).select("id").single();
          if (error) throw error;
          pessoaId = novaPessoa.id;
        }
      } else {
        // No CPF — generate a temp one based on timestamp
        const tempCpf = `TEMP${Date.now()}`;
        const { data: novaPessoa, error } = await supabase.from("pessoas").insert({
          cpf: tempCpf,
          nome: pessoa.nome,
          telefone: pessoa.telefone,
          email: pessoa.email,
        }).select("id").single();
        if (error) throw error;
        pessoaId = novaPessoa.id;
      }

      // Insert visita
      const { error: visitaError } = await supabase.from("visitas").insert({
        pessoa_id: pessoaId,
        data_hora: visita.data_hora ? new Date(visita.data_hora).toISOString() : new Date().toISOString(),
        assunto: visita.assunto,
        descricao_assunto: visita.descricao_assunto,
        quem_indicou: visita.quem_indicou,
        origem_visita: visita.origem_visita,
        status: visita.status,
        responsavel_tratativa: visita.responsavel_tratativa,
        observacoes: visita.observacoes,
        cadastrado_por: user?.email || "",
      });

      if (visitaError) throw visitaError;

      toast({ title: "Visita registrada com sucesso!" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const SectionHeader = ({ title, sectionKey }: { title: string; sectionKey: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-2"
    >
      <span className="section-title">{title}</span>
      {openSections[sectionKey] ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
    </button>
  );

  const InputField = ({
    label, value, onChange, placeholder, type = "text", readonly = false, icon,
  }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; readonly?: boolean; icon?: React.ReactNode;
  }) => (
    <div className="space-y-1">
      <label className="label-micro">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readonly}
          placeholder={placeholder}
          className={cn(
            "w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow",
            icon && "pl-10",
            readonly && "opacity-60"
          )}
        />
        {readonly && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </div>
    </div>
  );

  const SelectField = ({
    label, value, onChange, options, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
  }) => (
    <div className="space-y-1">
      <label className="label-micro">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none"
      >
        <option value="">{placeholder || "Selecione…"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const TextareaField = ({
    label, value, onChange, rows = 3, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
  }) => (
    <div className="space-y-1">
      <label className="label-micro">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none"
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95 transition">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Nova Visita</h2>
      </div>

      {step === "cpf" && !apiData && !existingPessoa && (
        <div className="card-section animate-fade-in">
          <p className="text-sm font-medium mb-3">Digite o CPF do visitante</p>
          <div className="relative mb-3">
            <input
              type="text"
              value={cpfInput}
              onChange={(e) => setCpfInput(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full h-12 rounded-xl bg-card border border-border px-4 pr-12 text-lg shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              maxLength={14}
            />
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            onClick={handleCPFSearch}
            disabled={searching}
            className="w-full h-12 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {searching ? "Buscando…" : "Buscar dados"}
          </button>
          <button onClick={skipCPF} className="w-full text-center text-sm text-muted-foreground mt-3 py-2">
            Não tem CPF? Pular esta etapa
          </button>
        </div>
      )}

      {apiData && (
        <div className="card-section animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <span className="text-lg">✅</span>
            <p className="font-semibold text-sm">Dados encontrados</p>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Nome:</span> {apiData.nome}</p>
            {apiData.data_nascimento && (
              <p><span className="text-muted-foreground">Data de nasc.:</span> {formatDate(apiData.data_nascimento)}</p>
            )}
            <p><span className="text-muted-foreground">Situação CPF:</span> {apiData.situacao?.descricao || "Regular"}</p>
          </div>
          <p className="text-xs text-yellow-500 mt-2">⚠️ Dados eleitorais precisam ser preenchidos manualmente</p>
          <div className="flex gap-2 mt-3">
            <button onClick={confirmApiData} className="flex-1 h-10 rounded-xl font-semibold text-white gradient-primary active:scale-[0.98] transition-transform text-sm">
              Confirmar e continuar
            </button>
            <button onClick={() => { setApiData(null); setCpfReadonly(true); setStep("form"); }} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium active:scale-[0.98] transition-transform">
              Corrigir
            </button>
          </div>
        </div>
      )}

      {existingPessoa && (
        <div className="card-section animate-fade-in">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <span className="text-lg">⚠️</span>
            <p className="font-semibold text-sm">Pessoa já cadastrada</p>
          </div>
          <p className="text-sm font-medium">{existingPessoa.nome}</p>
          <p className="text-xs text-muted-foreground">Total de visitas: {existingPessoa.visitas?.[0]?.count || 0}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={useExistingPessoa} className="flex-1 h-10 rounded-xl font-semibold text-white gradient-primary active:scale-[0.98] transition-transform text-sm">
              Registrar nova visita
            </button>
            <button onClick={() => navigate(`/pessoa/${existingPessoa.id}`)} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium active:scale-[0.98] transition-transform">
              Ver perfil
            </button>
          </div>
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4 animate-fade-in">
          {/* Seção 1 — Dados Pessoais */}
          <div className="card-section">
            <SectionHeader title="Dados Pessoais" sectionKey="pessoais" />
            {openSections.pessoais && (
              <div className="space-y-3">
                <InputField label="CPF" value={maskCPF(pessoa.cpf)} onChange={() => {}} readonly={cpfReadonly} />
                <InputField label="Nome completo" value={pessoa.nome} onChange={(v) => setPessoa({ ...pessoa, nome: v })} placeholder="Nome do visitante" />
                <InputField label="Data de nascimento" value={pessoa.data_nascimento} onChange={(v) => setPessoa({ ...pessoa, data_nascimento: v })} type="date" />
                <InputField label="Telefone" value={pessoa.telefone} onChange={(v) => setPessoa({ ...pessoa, telefone: maskPhone(v) })} placeholder="(00) 00000-0000" />
                <InputField label="E-mail" value={pessoa.email} onChange={(v) => setPessoa({ ...pessoa, email: v })} type="email" placeholder="email@exemplo.com" />
              </div>
            )}
          </div>

          {/* Seção 2 — Redes Sociais */}
          <div className="card-section">
            <SectionHeader title="Redes Sociais" sectionKey="redes" />
            {openSections.redes && (
              <div className="space-y-3">
                <InputField label="WhatsApp" value={pessoa.whatsapp} onChange={(v) => setPessoa({ ...pessoa, whatsapp: maskPhone(v) })} placeholder="(00) 00000-0000" />
                <InputField label="Instagram" value={pessoa.instagram} onChange={(v) => setPessoa({ ...pessoa, instagram: v.startsWith("@") ? v : `@${v}` })} placeholder="@usuario" />
                <TextareaField label="Outras redes / links" value={pessoa.outras_redes} onChange={(v) => setPessoa({ ...pessoa, outras_redes: v })} rows={2} />
              </div>
            )}
          </div>

          {/* Seção 3 — Dados Eleitorais */}
          <div className="card-section">
            <SectionHeader title="Dados Eleitorais" sectionKey="eleitorais" />
            {openSections.eleitorais && (
              <div className="space-y-3">
                <InputField label="Título de eleitor" value={pessoa.titulo_eleitor} onChange={(v) => setPessoa({ ...pessoa, titulo_eleitor: maskTitulo(v) })} placeholder="0000 0000 0000" />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Zona" value={pessoa.zona_eleitoral} onChange={(v) => setPessoa({ ...pessoa, zona_eleitoral: v.replace(/\D/g, "") })} placeholder="000" />
                  <InputField label="Seção" value={pessoa.secao_eleitoral} onChange={(v) => setPessoa({ ...pessoa, secao_eleitoral: v.replace(/\D/g, "") })} placeholder="000" />
                </div>
                <InputField label="Município" value={pessoa.municipio} onChange={(v) => setPessoa({ ...pessoa, municipio: v })} />
                <SelectField label="UF" value={pessoa.uf} onChange={(v) => setPessoa({ ...pessoa, uf: v })} options={UF_OPTIONS} />
              </div>
            )}
          </div>

          {/* Seção 4 — Dados da Visita */}
          <div className="card-section">
            <SectionHeader title="Dados da Visita" sectionKey="visita" />
            {openSections.visita && (
              <div className="space-y-3">
                <InputField label="Data e hora" value={visita.data_hora} onChange={(v) => setVisita({ ...visita, data_hora: v })} type="datetime-local" />
                <SelectField label="Assunto *" value={visita.assunto} onChange={(v) => setVisita({ ...visita, assunto: v })} options={ASSUNTOS} placeholder="Selecione o assunto" />
                <TextareaField label="Descrição do assunto" value={visita.descricao_assunto} onChange={(v) => setVisita({ ...visita, descricao_assunto: v })} />
                <InputField label="Quem indicou" value={visita.quem_indicou} onChange={(v) => setVisita({ ...visita, quem_indicou: v })} placeholder="Nome de quem indicou" />
                <SelectField label="Como chegou até o comitê?" value={visita.origem_visita} onChange={(v) => setVisita({ ...visita, origem_visita: v })} options={ORIGENS_VISITA} />
              </div>
            )}
          </div>

          {/* Seção 5 — Tratativa */}
          <div className="card-section">
            <SectionHeader title="Tratativa" sectionKey="tratativa" />
            {openSections.tratativa && (
              <div className="space-y-3">
                <SelectField label="Status" value={visita.status} onChange={(v) => setVisita({ ...visita, status: v })} options={STATUS_OPTIONS} />
                <InputField label="Responsável pela tratativa" value={visita.responsavel_tratativa} onChange={(v) => setVisita({ ...visita, responsavel_tratativa: v })} />
                <TextareaField label="Observações" value={visita.observacoes} onChange={(v) => setVisita({ ...visita, observacoes: v })} rows={4} />
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Salvando…" : "Salvar visita"}
          </button>
          <button onClick={() => navigate(-1)} className="w-full h-10 rounded-xl text-sm text-muted-foreground active:scale-95 transition-transform">
            Cancelar
          </button>
        </div>
      )}
    </AppLayout>
  );
}
