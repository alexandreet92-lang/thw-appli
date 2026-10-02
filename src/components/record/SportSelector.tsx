'use client'
import { useEffect, useState } from 'react'
import { IconBike, IconRun, IconMountain, IconWalk, IconBarbell, IconStretching2, IconKayak, IconSwimming, IconSnowboarding, IconYoga, IconBallTennis, IconKarate, IconBolt } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { RkSheet, RkCta, RkIco, RK_ICON, RkSectionLabel, RkGroup, RkRow, RkTile } from './kit/RecordKit'

const SPORT_LABEL_KEY: Record<SportId, string> = {
  cycling: 'record.sportLabelCycling', mtb: 'record.sportLabelMtb', running: 'record.sportLabelRunning',
  trail: 'record.sportLabelTrail', hiking: 'record.sportLabelHiking', strength: 'record.sportLabelStrength',
  hyrox: 'record.sportLabelHyrox', rowing: 'record.sportLabelRowing', swim: 'record.sportLabelSwim',
  ski: 'record.sportLabelSki', yoga: 'record.sportLabelYoga', padel: 'record.sportLabelPadel',
  openwater: 'record.sportLabelOpenwater', hometrainer: 'record.sportLabelHometrainer', boxe: 'record.sportLabelBoxe',
  hybrid: 'record.sportLabelHybrid',
}
const SPORT_CAT_KEY: Record<string, string> = {
  'Sports sur roues': 'record.sportCatWheels', 'Sports à pied': 'record.sportCatFoot',
  'Musculation & fitness': 'record.sportCatStrength', 'Sports de combat': 'record.sportCatCombat',
  'Sports nautiques': 'record.sportCatWater', 'Sports de glisse': 'record.sportCatSnow',
  'Bien-être': 'record.sportCatWellness', 'Raquettes': 'record.sportCatRackets',
  'Natation': 'record.sportCatSwimming', 'Cyclisme indoor': 'record.sportCatIndoorCycling',
}

export type SportId =
  | 'cycling' | 'mtb'
  | 'running' | 'trail' | 'hiking'
  | 'strength' | 'hyrox'
  | 'rowing' | 'swim'
  | 'ski'
  | 'yoga'
  | 'padel'
  | 'openwater'
  | 'hometrainer'
  | 'boxe'
  | 'hybrid'

// ── Icons — mêmes pictogrammes Tabler que le Planning (SportIcon) ────
function BikeIcon()        { return <IconBike size={24} stroke={1.6} /> }
function MtbIcon()         { return <IconBike size={24} stroke={1.6} /> }
function RunIcon()         { return <IconRun size={24} stroke={1.6} /> }
function TrailIcon()       { return <IconMountain size={24} stroke={1.6} /> }
function HikingIcon()      { return <IconWalk size={24} stroke={1.6} /> }
function StrengthIcon()    { return <IconBarbell size={24} stroke={1.6} /> }
function HyroxIcon()       { return <IconStretching2 size={24} stroke={1.6} /> }
function RowingIcon()      { return <IconKayak size={24} stroke={1.6} /> }
function SwimIcon()        { return <IconSwimming size={24} stroke={1.6} /> }
function SkiIcon()         { return <IconSnowboarding size={24} stroke={1.6} /> }
function YogaIcon()        { return <IconYoga size={24} stroke={1.6} /> }
function PadelIcon()       { return <IconBallTennis size={24} stroke={1.6} /> }
function OpenWaterIcon()   { return <IconSwimming size={24} stroke={1.6} /> }
function HomeTrainerIcon() { return <IconBike size={24} stroke={1.6} /> }
function BoxeIcon()        { return <IconKarate size={24} stroke={1.6} /> }
function HybridIcon()      { return <IconBolt size={24} stroke={1.6} /> }

// ── Data ──────────────────────────────────────────────────────
interface Sport {
  id: SportId
  label: string
  icon: React.ReactNode
}

const SPORT_CATEGORIES: { name: string; sports: Sport[] }[] = [
  {
    name: 'Sports sur roues',
    sports: [
      { id: 'cycling', label: 'Vélo',  icon: <BikeIcon /> },
      { id: 'mtb',     label: 'VTT',   icon: <MtbIcon /> },
    ],
  },
  {
    name: 'Sports à pied',
    sports: [
      { id: 'running', label: 'Running', icon: <RunIcon /> },
      { id: 'trail',   label: 'Trail',         icon: <TrailIcon /> },
      { id: 'hiking',  label: 'Randonnée',     icon: <HikingIcon /> },
    ],
  },
  {
    name: 'Musculation & fitness',
    sports: [
      { id: 'strength', label: 'Musculation', icon: <StrengthIcon /> },
      { id: 'hyrox',    label: 'Hyrox',       icon: <HyroxIcon /> },
      { id: 'hybrid',   label: 'Hybrid',      icon: <HybridIcon /> },
    ],
  },
  {
    name: 'Sports de combat',
    sports: [
      { id: 'boxe', label: 'Boxe', icon: <BoxeIcon /> },
    ],
  },
  {
    name: 'Sports nautiques',
    sports: [
      { id: 'rowing', label: 'Aviron',   icon: <RowingIcon /> },
      { id: 'swim',   label: 'Natation', icon: <SwimIcon /> },
    ],
  },
  {
    name: 'Sports de glisse',
    sports: [
      { id: 'ski', label: 'Ski / Snowboard', icon: <SkiIcon /> },
    ],
  },
  {
    name: 'Bien-être',
    sports: [
      { id: 'yoga', label: 'Yoga / Mobilité', icon: <YogaIcon /> },
    ],
  },
  {
    name: 'Raquettes',
    sports: [
      { id: 'padel', label: 'Padel / Tennis', icon: <PadelIcon /> },
    ],
  },
  {
    name: 'Natation',
    sports: [
      { id: 'openwater', label: 'Eau libre', icon: <OpenWaterIcon /> },
    ],
  },
  {
    name: 'Cyclisme indoor',
    sports: [
      { id: 'hometrainer', label: 'Home Trainer', icon: <HomeTrainerIcon /> },
    ],
  },
]

const ALL_SPORTS: Sport[] = SPORT_CATEGORIES.flatMap(c => c.sports)
const RECENT_IDS: SportId[] = ['cycling', 'running', 'trail', 'strength', 'swim']
const RECENT_SPORTS = RECENT_IDS.map(id => ALL_SPORTS.find(s => s.id === id)!).filter(Boolean)

// ── Helpers exportés ──────────────────────────────────────────
export function getSportIcon(id: SportId): React.ReactNode {
  return ALL_SPORTS.find(s => s.id === id)?.icon ?? null
}
export function getSportLabel(id: SportId): string {
  return ALL_SPORTS.find(s => s.id === id)?.label ?? id
}
/** Couleur fonctionnelle du sport (palette immuable --sport-*), portée par
 *  une tuile teintée / un point — jamais par une surface pleine. */
export function getSportColor(id: SportId): string {
  switch (id) {
    case 'cycling': case 'mtb': case 'hometrainer': return 'var(--sport-bike)'
    case 'running': case 'trail': case 'hiking': case 'padel': return 'var(--sport-run)'
    case 'strength': case 'boxe': return 'var(--sport-gym)'
    case 'hyrox': case 'hybrid': return 'var(--sport-hyrox)'
    case 'swim': case 'openwater': case 'ski': return 'var(--sport-swim)'
    case 'rowing': case 'yoga': return 'var(--sport-rowing)'
    default: return 'var(--primary)'
  }
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  selectedSport: SportId
  onSelect: (sport: SportId) => void
  onManual?: () => void
}

// Sur ORDINATEUR, une activité live ne peut être lancée que pour les sports
// « sur place » (on ne déplace pas son ordinateur pour courir/rouler dehors).
// Les sports de déplacement (vélo/VTT/trail/rando/natation/eau libre/ski, aviron
// dehors) sont masqués ici. Le running desktop = tapis (géré dans record/page).
// NB : ce filtre ne concerne QUE le lancement live ; la création/génération d'un
// entraînement (ManualEntrySheet) garde tous les sports.
const DESKTOP_ALLOWED: SportId[] = ['hometrainer', 'running', 'strength', 'hyrox', 'boxe', 'hybrid', 'rowing', 'padel']

export default function SportSelector({ open, onClose, selectedSport, onSelect, onManual }: Props) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => { if (!open) setSearch('') }, [open])
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const upd = () => setIsDesktop(mq.matches); upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])

  const sportLabelText = (s: Sport) => t(SPORT_LABEL_KEY[s.id] ?? '') || s.label
  const catNameText = (name: string) => t(SPORT_CAT_KEY[name] ?? '') || name
  const filteredCats = SPORT_CATEGORIES.map(c => ({
    ...c,
    sports: c.sports.filter(s =>
      sportLabelText(s).toLowerCase().includes(search.toLowerCase())
      && (!isDesktop || DESKTOP_ALLOWED.includes(s.id))),
  })).filter(c => c.sports.length > 0)
  const pick = (id: SportId) => { haptic('light'); onSelect(id) }

  return (
    <RkSheet open={open} onClose={onClose} title={t('record.sportSelectorTitle')} full zIndex={10050}
      footer={onManual ? (
        <RkCta variant="white" onClick={() => { onClose(); onManual() }}>
          <RkIco d={RK_ICON.plus} size={18} />
          {t('record.sportSelectorManual') || 'Créer une activité manuellement'}
        </RkCta>
      ) : undefined}>
      {/* Recherche */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-card)', color: 'var(--text-dim)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input className="rk-input" placeholder={t('record.sportSelectorSearch')} value={search} onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 16, flex: 1, minHeight: 44 }} />
      </label>

      {/* Récents : tuiles rondes teintées du sport */}
      {!search && (
        <div className="rk-chips" style={{ gap: 14, margin: '16px -16px 4px', padding: '2px 16px' }}>
          {RECENT_SPORTS.filter(s => !isDesktop || DESKTOP_ALLOWED.includes(s.id)).map(sport => {
            const active = selectedSport === sport.id
            const col = getSportColor(sport.id)
            return (
              <button key={sport.id} type="button" onClick={() => pick(sport.id)} className="rk-press"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span style={{
                  width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: col, background: `color-mix(in srgb, ${col} ${active ? 24 : 13}%, var(--surface-card))`,
                  boxShadow: active ? `0 0 0 2px ${col}` : 'none', transition: 'box-shadow 200ms ease, background-color 200ms ease',
                }}>
                  {sport.icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, textAlign: 'center', color: active ? 'var(--text)' : 'var(--text-mid)' }}>
                  {sportLabelText(sport)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Liste par catégories (listes groupées) */}
      {filteredCats.map(category => (
        <div key={category.name}>
          <RkSectionLabel>{catNameText(category.name)}</RkSectionLabel>
          <RkGroup>
            {category.sports.map(sport => {
              const active = selectedSport === sport.id
              return (
                <RkRow key={sport.id}
                  icon={<RkTile color={getSportColor(sport.id)}>{sport.icon}</RkTile>}
                  label={sportLabelText(sport)}
                  onClick={() => pick(sport.id)} chevron={false}
                  right={active ? <span style={{ color: 'var(--primary)', display: 'flex' }}><RkIco d={RK_ICON.check} size={20} sw={2.6} /></span> : undefined} />
              )
            })}
          </RkGroup>
        </div>
      ))}
      {filteredCats.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-mid)', padding: '28px 16px', fontSize: 14 }}>
          {t('record.sportSelectorEmpty')}
        </p>
      )}
    </RkSheet>
  )
}
