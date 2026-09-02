// ══════════════════════════════════════════════════════════════════
// Fonctionnalités & limites AFFICHÉES par formule athlète (Premium / Pro /
// Expert). Source unique pour : la page abonnement, la fiche « Mon abonnement »,
// et l'animation « nouvel abonnement ». Les CHIFFRES doivent rester cohérents
// avec src/lib/subscriptions/tier-limits.ts (le moteur de quotas).
//
// ⚠️ Contenu = décision produit. Ajuste librement ici, tout l'affichage suit.
// ══════════════════════════════════════════════════════════════════

export type DisplayTier = 'premium' | 'pro' | 'expert'

export interface TierFeatureRow {
  label: string
  /** Valeur par formule : texte, ou true/false pour une coche/croix. */
  values: Record<DisplayTier, string | boolean>
}

/** Tableau comparatif complet (lignes = fonctions, colonnes = formules). */
export const TIER_FEATURES: TierFeatureRow[] = [
  { label: 'Messages IA / mois',          values: { premium: '30',      pro: '100',       expert: '300'        } },
  { label: 'Modèle IA',                   values: { premium: 'Hermès',  pro: 'Athéna',    expert: 'Zeus'       } },
  { label: 'Tokens IA / mois',            values: { premium: '700 k',   pro: '3 M',       expert: '8 M'        } },
  { label: "Plans d'entraînement / mois", values: { premium: '2',       pro: '6',         expert: '20'         } },
  { label: 'Plans nutrition / mois',      values: { premium: '1',       pro: '3',         expert: '10'         } },
  { label: 'Actions outils IA / mois',    values: { premium: '50',      pro: '150',       expert: '400'        } },
  { label: 'Briefings',                   values: { premium: '4 / sem', pro: 'Quotidien', expert: 'Quotidien'  } },
  { label: 'Recherche web (briefing)',    values: { premium: false,     pro: true,        expert: true         } },
  { label: 'Compétitions suivies',        values: { premium: '3',       pro: '7',         expert: '20'         } },
  { label: 'Historique activités',        values: { premium: '6 mois',  pro: '24 mois',   expert: 'Illimité'   } },
  { label: 'Historique conversations',    values: { premium: '90 j',    pro: '180 j',     expert: 'Illimité'   } },
  { label: 'Sync Strava / mois',          values: { premium: '100',     pro: 'Illimité',  expert: 'Illimité'   } },
  { label: 'Stockage',                    values: { premium: '1 Go',    pro: '5 Go',      expert: '20 Go'      } },
  { label: 'Studio (agents IA)',          values: { premium: false,     pro: '300 k tk',  expert: '1 M tk'     } },
  { label: 'Communauté — créer un espace', values: { premium: true,     pro: true,        expert: true         } },
  { label: 'Espace privé + branding + vocal', values: { premium: false, pro: true,        expert: true         } },
  { label: 'Badge vérifié',               values: { premium: false,     pro: false,       expert: true         } },
]

/** Nom commercial d'une formule. */
export const TIER_NAME: Record<DisplayTier, string> = {
  premium: 'Premium',
  pro:     'Pro',
  expert:  'Expert',
}

/** Sous-titre d'accroche par formule. */
export const TIER_TAGLINE: Record<DisplayTier, string> = {
  premium: 'Démarrer le coaching IA',
  pro:     "Pour l'athlète sérieux",
  expert:  'Performance sans limites',
}

/**
 * Liste « ce que tu débloques » pour UNE formule (pour l'animation d'activation
 * et la fiche du plan). On ne garde que les lignes pertinentes (valeur vraie ou
 * texte non vide) et on formate « Label : valeur ».
 */
export function featuresForTier(tier: DisplayTier): string[] {
  const out: string[] = []
  for (const row of TIER_FEATURES) {
    const v = row.values[tier]
    if (v === false || v === '' || v == null) continue
    out.push(v === true ? row.label : `${row.label} : ${v}`)
  }
  return out
}
