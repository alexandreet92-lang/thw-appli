'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — barre haute flottante.
// ☰ (tiroir des conversations) · pilule modèle centrée (ouvre la feuille
// « Modèle ») · nouvelle conversation · sortie (›). Boutons ronds blancs
// (--float-bg) comme les boutons flottants du shell mobile. Pas de titre.
// ══════════════════════════════════════════════════════════════

import { ChevronDown, ChevronRight, Menu, SquarePen } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { ModelEffigy } from '../ModelEffigy'
import type { AimModel } from './types'

const MODEL_NAMES: Record<AimModel, string> = { hermes: 'Hermès', athena: 'Athéna', zeus: 'Zeus' }

export const aimFab: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', border: 'none', padding: 0, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)',
  WebkitTransform: 'translateZ(0)',
}

export function MobileTopBar({
  model,
  modelLocked,
  generating,
  showModel,
  onMenu,
  onModel,
  onNew,
  onClose,
}: {
  model: AimModel
  modelLocked: boolean
  /** Génération en cours → le shuriken du modèle tourne. */
  generating?: boolean
  showModel: boolean
  onMenu: () => void
  onModel: () => void
  onNew: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <div style={{
      position: 'absolute', top: 8, left: 12, right: 12, zIndex: 6, height: 44,
      display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
    }}>
      <button type="button" onClick={onMenu} aria-label={t('aim.top.conversations')} className="aim-press" style={{ ...aimFab, pointerEvents: 'auto' }}>
        <Menu size={20} strokeWidth={2} />
      </button>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
        {showModel && (
          <button
            type="button"
            onClick={() => { if (!modelLocked) onModel() }}
            aria-label={`${t('aip.model.label')} : ${MODEL_NAMES[model]}`}
            title={modelLocked ? t('aip.model.locked') : undefined}
            aria-disabled={modelLocked}
            className="aim-press"
            style={{
              pointerEvents: 'auto', height: 44, padding: '0 14px 0 16px', borderRadius: 'var(--r-pill)', border: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 7, cursor: modelLocked ? 'default' : 'pointer',
              background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, opacity: modelLocked && !generating ? 0.6 : 1,
              maxWidth: '100%',
            }}
          >
            <ModelEffigy model={model} size={18} spinning={!!generating} />
            <span style={{ whiteSpace: 'nowrap' }}>{MODEL_NAMES[model]}</span>
            <ChevronDown size={16} strokeWidth={2.2} style={{ flexShrink: 0, color: 'var(--text-mid)' }} />
          </button>
        )}
      </div>

      <button type="button" onClick={onNew} aria-label={t('aim.top.newConversation')} className="aim-press" style={{ ...aimFab, pointerEvents: 'auto' }}>
        <SquarePen size={18} strokeWidth={2} />
      </button>
      <button type="button" onClick={onClose} aria-label={t('aim.top.exit')} className="aim-press" style={{ ...aimFab, pointerEvents: 'auto' }}>
        <ChevronRight size={20} strokeWidth={2} />
      </button>
    </div>
  )
}

export function aimModelName(m: AimModel): string {
  return MODEL_NAMES[m]
}
