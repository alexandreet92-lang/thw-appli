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

## Design System
Avant toute modification ou création de composant UI, lis `docs/DESIGN_SYSTEM.md` et applique ses règles sans exception.
