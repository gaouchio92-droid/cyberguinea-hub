import { z } from "zod";

// ───── Mot de passe robuste (longueur + complexité) ─────
export const strongPassword = z
  .string()
  .min(10, "Min. 10 caractères")
  .max(128, "Max. 128 caractères")
  .refine((v) => /[a-z]/.test(v), "Doit contenir une minuscule")
  .refine((v) => /[A-Z]/.test(v), "Doit contenir une majuscule")
  .refine((v) => /[0-9]/.test(v), "Doit contenir un chiffre")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "Doit contenir un caractère spécial");

export const emailSchema = z.string().trim().toLowerCase().email("Email invalide").max(255);

// ───── Auth ─────
export const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Nom requis").max(100),
  email: emailSchema,
  password: strongPassword,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(128),
});

// ───── Coordonnées ─────
const lat = z.number({ invalid_type_error: "Latitude invalide" }).min(-90).max(90);
const lng = z.number({ invalid_type_error: "Longitude invalide" }).min(-180).max(180);

// ───── Incidents ─────
export const incidentSchema = z.object({
  title: z.string().trim().min(3, "Titre min. 3 caractères").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  type: z.enum(["phishing", "ddos", "malware", "data_breach", "intrusion", "fraud", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "investigating", "mitigating", "resolved", "closed"]),
  operator_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

// ───── Map markers ─────
export const mapMarkerSchema = z.object({
  type: z.enum(["incident", "signalement", "travaux", "maintenance"]),
  title: z.string().trim().min(3, "Titre min. 3 caractères").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  latitude: lat,
  longitude: lng,
});

// ───── Operators ─────
export const operatorSchema = z.object({
  name: z.string().trim().min(2, "Nom min. 2 caractères").max(150),
  type: z.enum(["telecom", "isp"]),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  contact_email: z.union([z.literal(""), emailSchema]).optional(),
  contact_phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+0-9 .()-]*$/, "Téléphone invalide")
    .optional()
    .or(z.literal("")),
  latitude: lat,
  longitude: lng,
});

// ───── Fiber links ─────
export const fiberLinkSchema = z.object({
  name: z.string().trim().min(2, "Nom min. 2 caractères").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide").default("#3b82f6"),
  operator_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["active", "down", "planned", "maintenance"]).default("active"),
});

// ───── Audits ─────
export const auditSchema = z.object({
  framework: z.enum(["ISO27001", "NIST", "ARPT", "PCI_DSS"]),
  score: z.number().int().min(0).max(100),
  findings: z.string().trim().max(5000).optional().or(z.literal("")),
  remediation_plan: z.string().trim().max(5000).optional().or(z.literal("")),
});

// Helper: récupère le 1er message d'erreur d'un parse Zod
export function firstZodError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Validation échouée";
}
