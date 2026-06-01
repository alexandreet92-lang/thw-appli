'use client'

import {
  List, Footprints, Mountain, Bike, Triangle, Waves, Sailboat, Dumbbell, Flame, Globe,
  Brain, Calendar, Zap, Apple, Moon, TrendingUp, Target,
} from 'lucide-react'
import type { Sport, CategorieCompetence } from '@/types/competences'

export type SportFilter = Sport | 'all'
export type CompetenceTab = 'toutes' | 'actives' | 'miennes'

export const SPORTS_ORDER: SportFilter[] = [
  'all', 'running', 'trail', 'cyclisme', 'triathlon', 'natation', 'rowing', 'muscu', 'hyrox', 'transversale',
]

export const SPORT_LABELS: Record<SportFilter, string> = {
  all: 'Tous',
  running: 'Running',
  trail: 'Trail',
  cyclisme: 'Cyclisme',
  triathlon: 'Triathlon',
  natation: 'Natation',
  rowing: 'Rowing',
  muscu: 'Musculation',
  hyrox: 'Hyrox',
  transversale: 'Transversale',
}

export const CATEGORIES_ORDER: CategorieCompetence[] = [
  'methodologie', 'periodisation', 'adaptation', 'nutrition', 'recuperation', 'force', 'hypertrophie', 'performance',
]

export const CATEGORY_LABELS: Record<CategorieCompetence, string> = {
  methodologie: 'Méthodologie',
  periodisation: 'Périodisation',
  adaptation: 'Adaptation',
  nutrition: 'Nutrition',
  recuperation: 'Récupération',
  force: 'Force',
  hypertrophie: 'Hypertrophie',
  performance: 'Performance',
}

export function sportIcon(s: SportFilter, size = 15): React.ReactNode {
  const p = { size, strokeWidth: 1.8 }
  switch (s) {
    case 'all':          return <List {...p} />
    case 'running':      return <Footprints {...p} />
    case 'trail':        return <Mountain {...p} />
    case 'cyclisme':     return <Bike {...p} />
    case 'triathlon':    return <Triangle {...p} />
    case 'natation':     return <Waves {...p} />
    case 'rowing':       return <Sailboat {...p} />
    case 'muscu':        return <Dumbbell {...p} />
    case 'hyrox':        return <Flame {...p} />
    case 'transversale': return <Globe {...p} />
  }
}

export function categoryIcon(c: CategorieCompetence, size = 15): React.ReactNode {
  const p = { size, strokeWidth: 1.8 }
  switch (c) {
    case 'methodologie':  return <Brain {...p} />
    case 'periodisation': return <Calendar {...p} />
    case 'adaptation':    return <Zap {...p} />
    case 'nutrition':     return <Apple {...p} />
    case 'recuperation':  return <Moon {...p} />
    case 'force':         return <Dumbbell {...p} />
    case 'hypertrophie':  return <TrendingUp {...p} />
    case 'performance':   return <Target {...p} />
  }
}
