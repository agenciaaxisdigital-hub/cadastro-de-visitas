import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ASSUNTOS, ORIGENS_VISITA, STATUS_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function NovaVisitaExistente() {
  const { pessoaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [visita, setVisita] = useState({
    data_hora: new Date().toISOString().slice(0, 16),
    assunto: "",
    descricao_assunto: "",
    quem_indicou: "",
    origem_visita: "",
    status: "Aguardando",
    responsavel_tratativa: "",
    observacoes: "",
  });

  const handleSave = async () => {
    if (!visita.assunto) {
      toast({ title: "Assunto obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("visitas").insert({
      pessoa_id: pessoaId,
      data_hora: new Date(visita.data_hora).toISOString(),
      assunto: visita.assunto,
      descricao_assunto: visita.descricao_assunto,
      quem_indicou: visita.quem_indicou,
      origem_visita: visita.origem_visita,
      status: visita.status,
      responsavel_tratativa: visita.responsavel_tratativa,
      observacoes: visita.observacoes,
      cadastrado_por: user?.email || "",
    });
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visita registrada com sucesso!" });
      navigate("/");
    }
    setSaving(false);
  };

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="space-y-1">
      <label className="label-micro">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none">
        <option value="">Selecione…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Nova Visita</h2>
      </div>

      <div className="card-section space-y-3 animate-fade-in">
        <div className="space-y-1">
          <label className="label-micro">Data e hora</label>
          <input type="datetime-local" value={visita.data_hora} onChange={(e) => setVisita({ ...visita, data_hora: e.target.value })} className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow" />
        </div>
        <SelectField label="Assunto *" value={visita.assunto} onChange={(v) => setVisita({ ...visita, assunto: v })} options={ASSUNTOS} />
        <div className="space-y-1">
          <label className="label-micro">Descrição</label>
          <textarea value={visita.descricao_assunto} onChange={(e) => setVisita({ ...visita, descricao_assunto: e.target.value })} rows={3} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none" />
        </div>
        <div className="space-y-1">
          <label className="label-micro">Quem indicou</label>
          <input type="text" value={visita.quem_indicou} onChange={(e) => setVisita({ ...visita, quem_indicou: e.target.value })} className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow" />
        </div>
        <SelectField label="Como chegou?" value={visita.origem_visita} onChange={(v) => setVisita({ ...visita, origem_visita: v })} options={ORIGENS_VISITA} />
        <SelectField label="Status" value={visita.status} onChange={(v) => setVisita({ ...visita, status: v })} options={STATUS_OPTIONS} />
        <div className="space-y-1">
          <label className="label-micro">Responsável</label>
          <input type="text" value={visita.responsavel_tratativa} onChange={(e) => setVisita({ ...visita, responsavel_tratativa: e.target.value })} className="w-full h-11 rounded-xl bg-card border border-border px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow" />
        </div>
        <div className="space-y-1">
          <label className="label-micro">Observações</label>
          <textarea value={visita.observacoes} onChange={(e) => setVisita({ ...visita, observacoes: e.target.value })} rows={4} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {saving ? "Salvando…" : "Salvar visita"}
      </button>
    </AppLayout>
  );
}
