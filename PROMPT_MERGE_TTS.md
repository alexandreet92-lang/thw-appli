# PROMPT + JOURNAL — Déploiement du fix sécurité TTS (dans le bon ordre)

> Objectif : déployer proprement le fix anti denial-of-wallet, **migration Supabase d'abord**, code ensuite.

## 1. Migration Supabase — ✅ APPLIQUÉE ET VÉRIFIÉE (avant tout déploiement de code)

- **Projet ciblé** : `thw-v2` (`sfrcnyzntgrxlwlmwifi`, eu-west-1) — le **seul** projet `ACTIVE_HEALTHY`
  (les deux autres, `thw-coaching-db` et `thw-coaching`, sont `INACTIVE`/en pause).
- **Migration** : `add_tts_usage_type` — élargit la contrainte `usage_logs_type_check` pour accepter `type='tts'`.
- **Avant** : `CHECK (type IN ('message','plan_generation','tool_use','briefing','nutrition_plan','micro_agent'))`
- **Après** (vérifié) : `CHECK (type IN (…,'micro_agent','tts'))`
- **Preuve** : un `INSERT … type='tts'` a été exécuté dans un bloc transactionnel **rollbacké** → accepté par la
  contrainte, et **0 ligne de test persistée** (`probe_rows = 0`).

➡️ **La couche 2 (quota mensuel de caractères) est maintenant fonctionnelle** dès que le code sera en ligne.
La migration est **rétro-compatible** : l'ancien code n'insère jamais `type='tts'`, donc l'avoir appliquée avant
le déploiement du code ne casse rien.

## 2. Déployer le code

Le code du fix est sur la branche `claude/cost-margin-analysis-n0r28i` (non mergée). **Vercel déploie la branche
`main`** (cf. CLAUDE.md) → déployer = merger dans `main`.

**Commande exacte (à lancer une fois que tu valides) :**
```bash
git checkout main
git pull origin main
git merge --no-ff claude/cost-margin-analysis-n0r28i
git push origin main        # Vercel auto-déploie main
```
> Je n'ai **pas** de capacité de déploiement Vercel (pas de CLI/token Vercel ici) et je **n'ai pas mergé** :
> la règle de branche interdit de pousser sur `main` sans ton feu vert explicite. Dis-moi « merge » si tu veux
> que je le fasse, ou lance les commandes ci-dessus.

**Aucune variable d'env n'est requise** : les seuils ont des défauts dans `src/lib/ai/cost-limits.ts`. Tu peux
les surcharger sur Vercel (Settings → Environment Variables) : `TTS_CHARS_*`, `TTS_RATE_*`,
`WEB_SEARCH_MAX_USES_*` — puis redeploy.

**Rappel couche 4 (manuel)** : pose le hard cap de dépense sur ta clé OpenAI (voir `PROMPT_SECU_TTS.md`).

## 3. Transcription de la voix utilisateur (entrée) : Whisper ou navigateur ?

**➡️ OpenAI Whisper — PAYANT.** La transcription finale passe par la route serveur **`/api/stt`**
(`src/app/api/stt/route.ts`), modèle **`gpt-4o-mini-transcribe`** (repli **`whisper-1`**), endpoint
`https://api.openai.com/v1/audio/transcriptions`.

- `VoiceConversation.tsx` capte le micro (getUserMedia + PCM/WAV) et **POST `/api/stt`** pour la vraie transcription
  (commentaire du code : « la transcription FINALE reste Whisper »).
- Le `webkitSpeechRecognition` du navigateur **n'est utilisé QUE pour l'affichage live des mots** pendant que la
  personne parle — **pas** pour la transcription réelle. Donc **ce n'est pas** la reconnaissance native gratuite
  qui fait le travail.
- Même chose pour la **dictée** dans `AIPanel.tsx` → `/api/stt` (Whisper).

## 4. Quels appels tapent le plafond de dépense OpenAI ?

**Les DEUX** :
| Route | Modèle OpenAI | Tape le plafond OpenAI ? | Protégé par le fix ? |
|---|---|---|---|
| `/api/tts` (voix du coach, sortie) | `gpt-4o-mini-tts` / `tts-1` | **Oui** | ✅ **Oui** (tier + quota + rate-limit) |
| `/api/stt` (voix de l'utilisateur, entrée) | `gpt-4o-mini-transcribe` / `whisper-1` | **Oui** | ❌ **NON — ENCORE OUVERT** |

## ⚠️ FAILLE DÉCOUVERTE — `/api/stt` (Whisper) est un second trou « denial of wallet »

`/api/stt` ne vérifie **que l'authentification** (comme `/api/tts` avant le fix) : **aucun tier, aucun quota,
aucun rate-limit**. N'importe quel compte connecté (même Free) peut envoyer des fichiers audio en boucle →
facture Whisper illimitée, qui tape le **même** plafond OpenAI. **Fermer seulement le TTS laisse la moitié du
trou ouvert.**

- Coût Whisper : `whisper-1` ≈ 0,006 $/min d'audio ; `gpt-4o-mini-transcribe` ≈ 0,003 $/min. Le cost driver est la
  **durée/taille audio**, pas les caractères → il faut un quota en **minutes/secondes** (ou taille de fichier),
  pas le quota caractères du TTS.
- Recommandation : appliquer la **même défense en couches** à `/api/stt` (tier + quota mensuel en minutes +
  rate-limit + borne de taille/durée par requête), avec les seuils dans le **même** `cost-limits.ts`.

## Fichiers touchés (par ce fix, déjà commités sur la branche)

`src/lib/ai/cost-limits.ts` (nouveau) · `src/lib/tts/guard.ts` (nouveau) ·
`src/supabase/migrations/add_tts_usage_type.sql` (nouveau, **appliqué en prod**) · `src/app/api/tts/route.ts` ·
`src/lib/subscriptions/check-quota.ts` · `src/app/api/coach-stream/route.ts` · `src/app/api/briefing/generate/route.ts`.
*(La protection `/api/stt` n'est PAS encore implémentée — décision en attente.)*

## À tester manuellement APRÈS déploiement

- [ ] **TTS** : Free → 403 + repli voix navigateur ; payant normal → OK ; quota/rate-limit → 429 (voir `PROMPT_SECU_TTS.md`).
- [ ] **En base** : `select type, count(*), sum((metadata->>'chars')::int) from usage_logs where type='tts' group by 1;`
      → les lignes `tts` s'accumulent bien (preuve que migration + code fonctionnent ensemble).
- [ ] **STT (tant que non protégé)** : surveiller la facture OpenAI (poste transcription) — trou encore ouvert.
