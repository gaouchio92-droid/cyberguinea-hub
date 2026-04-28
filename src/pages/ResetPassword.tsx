import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import arptLogo from "@/assets/arpt-logo.png";

export default function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash and triggers a PASSWORD_RECOVERY event
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If the user already has a session via recovery link
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    if (password.length < 8) return toast.error("Mot de passe trop court (min. 8 caractères)");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe réinitialisé");
    await supabase.auth.signOut();
    nav("/auth");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 glass shadow-elegant">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-glow mb-3 ring-1 ring-primary/30 bg-background/40">
            <img src={arptLogo} alt="Logo ARPT" width={80} height={80} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Réinitialiser le mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-1">Définissez un nouveau mot de passe sécurisé</p>
        </div>
        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">Lien invalide ou expiré. Demandez un nouveau lien depuis la page de connexion.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Nouveau mot de passe</Label><Input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div>
            <div><Label>Confirmer</Label><Input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
            <Button className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Mettre à jour</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
