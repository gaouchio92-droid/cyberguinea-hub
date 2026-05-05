import { useEffect, useState } from "react";
import { toast } from "sonner";

export const GPS_ACCURACY_THRESHOLD_M = 50; // au-delà : ajout bloqué
export const GPS_ACCURACY_WARN_M = 25; // au-delà : avertissement

/** Suivi GPS continu (watchPosition) — actif uniquement quand `enabled` est vrai. */
export function useGeoWatch(enabled: boolean) {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        setAccuracy(p.coords.accuracy);
      },
      (err) => toast.error("Géolocalisation: " + err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return { pos, accuracy };
}

/**
 * Récupère la position GPS courante et avertit selon la précision.
 * Renvoie une promesse résolue avec {lat, lng, accuracy} ou null si échec.
 */
export function getCurrentGeo(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation indisponible");
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const acc = p.coords.accuracy;
        if (acc > GPS_ACCURACY_THRESHOLD_M)
          toast.error(`Précision GPS insuffisante (±${Math.round(acc)} m). Seuil : ${GPS_ACCURACY_THRESHOLD_M} m.`);
        else if (acc > GPS_ACCURACY_WARN_M) toast.warning(`Précision GPS faible : ±${Math.round(acc)} m`);
        else toast.success(`Position GPS récupérée (±${Math.round(acc)} m)`);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: acc });
      },
      () => {
        toast.error("Impossible de récupérer la position");
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
