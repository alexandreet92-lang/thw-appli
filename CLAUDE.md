# THW Coaching — Contexte projet Claude Code

## Stack technique
- Next.js 15 (App Router), TypeScript strict, Tailwind CSS
- Supabase (PostgreSQL) — auth, data, Edge Functions
- Vercel — déploiement branche main
- Repo : alexandreet92-lang/thw-appli

## Conventions code
- Composants : src/components/
- Pages : src/app/ (App Router uniquement)
- Types : src/types/
- Lib / utils : src/lib/
- Zéro mock data en production
- Zéro librairie de chart externe (recharts, chart.js, etc.)
- SVG raw uniquement pour les visualisations
- TypeScript strict — pas de `any`

## Règles critiques
- Ne jamais modifier src/lib/sync/strava.ts sans demande explicite
- Ne jamais toucher au schéma Supabase sans migration SQL explicite
- Mapping streams obligatoire : r.streams ?? r.raw_data?.streams
- Toujours vérifier la null-safety sur la colonne streams (backfill partiel)

## Features actives (ne pas casser)
- SyncCharts : SVG raw, cursor partagé, zone coloring, drag-to-select, zone time distribution
- Activities page : filtres dropdown, tabs, KPIs sport-spécifique (running, cycling, gym, Hyrox)
- Sidebar : hover-to-open desktop, mobile touch scroll fixé, createPortal pour z-index

## Sports supportés
running | cycling | hyrox | gym

## En cours / à venir
- CTL/ATL/TSB : pas encore commencé — architecture à valider avant tout code
- Training load analytics : calcul EWMA, table dédiée, recalcul post-sync Strava

## Modèle de données clé
Table `activities` :
- id, user_id, sport, date, duration, distance, load
- streams (JSONB) — heartrate, velocity, altitude, cadence, watts
- raw_data (JSONB) — fallback si streams null

## Objectif produit
App de coaching sportif hybride (endurance + force).
Benchmark UI/UX : Strava + TrainingPeaks.

## Règle d'interconnexion des pages
Toutes les pages de l'app sont interconnectées. Chaque page qui affiche une entité (activité, blessure, compétition, séance) doit avoir un lien cliquable vers la page dédiée de cette entité. Une page ne refuse jamais d'afficher un lien vers une autre page sous prétexte que les données ne sont "pas pertinentes". L'interconnexion est obligatoire et permanente.

## Design System
Avant toute modification ou création de composant UI, lis `docs/DESIGN_SYSTEM.md` et applique ses règles sans exception.

---
## Notes Notion
Fonctionnalités / Evolutions pour plus tard : 
- Page formation : 
- Intégrations externes - transfert de séances 
- Page Challenge (a mettre en place lorsque l’app a plusieurs milliers d’utilisateurs) 
- Outils HRV inclus dans l’app (a partir de l’abonnement Pro) 
- Interface coach 
- Exécuté phase 4 = mémoire chat discussions + plan B
- Exécuté phase 5 = 
- Rajouter action rapide : Analyser une activité 
- Rajouter pour le bouton Créer un plan d’entrainement : 
- Main actions rapides en première page : 
- Lister toutes les actions rapides + définir leurs procédés tv
- Sous actions rapide Créer un plan d’entrainement : 
All Pages
### Tasks this week
- Finir la fonctionnalité : Créer un plan d’entrainement 
- Lister TOUTES les actions rapides 
- Lister le process des main actions rapides 
- Priorité action rapide = Créer un plan d’entrainement 
token_meta_temporaire.txt : EAAcb8fMi5zIBRT30jCCIYjAIGZBw3EVTfjERDhPkZAzYXww1ZCERMRZAXE6KQUukNHfoYQd15l9ZBzVDlTlJeyR44aARTZBFgk53JyGJefD3bZBIafnvrZB6aoD2TYafZAp3HXd93mhnsyTzLH7m2uMBwVMJNnJHuc190HDUutBIkSgr21vq7mZA8GZBpeqqBxKHk4av7bZBS8CYnA9GoASCwgHJhSzmgx7b28odhwwC7nhTW3yLZCAOgIYrtWYrxX6Np71zPWZCnnfCbsG6SR7yenUZBisirNC
instagram business id : 17841449112603067
clé secrète : 2f2f1473d571d775987b003d8b071ac9

https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=2052520568982613&client_secret=2f2f1473d571d775987b003d8b071ac9&fb_exchange_token=EAAcb8fMi5zIBRT30jCCIYjAIGZBw3EVTfjERDhPkZAzYXww1ZCERMRZAXE6KQUukNHfoYQd15l9ZBzVDlTlJeyR44aARTZBFgk53JyGJefD3bZBIafnvrZB6aoD2TYafZAp3HXd93mhnsyTzLH7m2uMBwVMJNnJHuc190HDUutBIkSgr21vq7mZA8GZBpeqqBxKHk4av7bZBS8CYnA9GoASCwgHJhSzmgx7b28odhwwC7nhTW3yLZCAOgIYrtWYrxX6Np71zPWZCnnfCbsG6SR7yenUZBisirNC