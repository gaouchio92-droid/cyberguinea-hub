import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Brain } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Quels sont les 3 risques cyber les plus critiques cette semaine ?",
  "Suggère mes priorités d'analyste pour aujourd'hui",
  "Évalue le niveau de risque global de notre parc d'opérateurs",
  "Quelles actions urgentes sur la dernière vague de phishing ?",
];

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    const t = text.trim(); if (!t || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setBusy(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: next }),
      });
      if (resp.status === 429) { toast.error("Limite atteinte. Réessayez plus tard."); setBusy(false); return; }
      if (resp.status === 402) { toast.error("Crédits IA épuisés."); setBusy(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Erreur");
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = ""; let acc = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m)); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assistant IA Cybersécurité" description="Suggestions de priorités, scoring de risque et conseils contextualisés" />

      <Card className="p-6 gradient-card border-primary/30 shadow-glow">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center"><Brain className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h3 className="font-semibold">Assistant ARPT</h3>
            <p className="text-xs text-muted-foreground">Connecté à vos données opérationnelles</p>
          </div>
        </div>
      </Card>

      <Card className="gradient-card flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Suggestions :</p>
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)} className="block w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-smooth text-sm border border-border hover:border-primary/40">
                  <Sparkles className="h-3 w-3 text-primary inline mr-2" />{s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {m.content || (busy && i === messages.length - 1 && <Loader2 className="h-4 w-4 animate-spin" />)}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="border-t border-border p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Posez votre question à l'assistant..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !input.trim()} size="icon" className="h-11 w-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
