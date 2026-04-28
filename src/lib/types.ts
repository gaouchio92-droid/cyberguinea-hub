export type AppRole = "admin" | "analyst" | "operator";
export const roleLabel: Record<AppRole, string> = {
  admin: "Administrateur",
  analyst: "Analyste",
  operator: "Opérateur",
};
export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "contained" | "resolved" | "closed";
export type IncidentType = "phishing" | "malware" | "ddos" | "account_compromise" | "data_leak" | "other";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const severityLabel: Record<Severity, string> = {
  low: "Faible", medium: "Moyenne", high: "Élevée", critical: "Critique",
};
export const severityColor: Record<Severity, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary/20 text-secondary border border-secondary/40",
  high: "bg-warning/20 text-warning border border-warning/40",
  critical: "bg-destructive/20 text-destructive border border-destructive/40",
};
export const incidentStatusLabel: Record<IncidentStatus, string> = {
  open: "Ouvert", investigating: "Investigation", contained: "Contenu", resolved: "Résolu", closed: "Clôturé",
};
export const incidentTypeLabel: Record<IncidentType, string> = {
  phishing: "Phishing", malware: "Malware", ddos: "DDoS",
  account_compromise: "Compromission de compte", data_leak: "Fuite de données", other: "Autre",
};
export const taskPriorityLabel: Record<TaskPriority, string> = {
  low: "Basse", medium: "Moyenne", high: "Haute", urgent: "Urgente",
};
export const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "À faire", in_progress: "En cours", done: "Terminé",
};
