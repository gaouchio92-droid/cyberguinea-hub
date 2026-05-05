INSERT INTO public.compliance_requirements (framework, code, title, description, category, weight) VALUES
('ISO27001','A.5.1','Politiques de sécurité de l''information','Définir, approuver, publier et communiquer les politiques de sécurité','Gouvernance',3),
('ISO27001','A.6.1','Rôles et responsabilités','Attribuer et documenter les responsabilités sécurité','Organisation',2),
('ISO27001','A.8.1','Inventaire des actifs','Tenir un inventaire à jour des actifs informationnels','Actifs',2),
('ISO27001','A.9.2','Gestion des accès utilisateurs','Processus formel de provisioning/déprovisioning','Accès',3),
('ISO27001','A.12.6','Gestion des vulnérabilités techniques','Identifier et corriger les vulnérabilités en temps opportun','Exploitation',3),
('ISO27001','A.16.1','Gestion des incidents','Procédure de réponse aux incidents documentée et testée','Incidents',3),
('ISO27001','A.17.1','Continuité d''activité','PCA/PRA documenté et testé annuellement','Continuité',3),
('PCIDSS','1.1','Pare-feu et routeurs','Configuration sécurisée des équipements réseau','Réseau',3),
('PCIDSS','3.4','Chiffrement des données titulaires','PAN rendu illisible par chiffrement fort','Données',3),
('PCIDSS','6.2','Correctifs de sécurité','Application des patchs critiques sous 1 mois','Vulnérabilités',3),
('PCIDSS','8.3','Authentification multi-facteurs','MFA pour accès non-console au CDE','Accès',3),
('PCIDSS','10.1','Journalisation','Pistes d''audit pour tous les accès aux données','Audit',2),
('PCIDSS','11.3','Tests d''intrusion','Pentests externes annuels et après changements significatifs','Tests',2)
ON CONFLICT DO NOTHING;