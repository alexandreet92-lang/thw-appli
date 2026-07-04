'use client'

// ══════════════════════════════════════════════════════════════
// MicButton — bouton de dictée vocale réutilisable.
// Se masque si la Web Speech API n'est pas supportée.
// Rouge + pulse pendant l'écoute. Branché via useSpeechToText.
// ══════════════════════════════════════════════════════════════

import { Mic } from 'lucide-react'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useI18n } from '@/lib/i18n'

interface Props {
  onTranscript: (text: string) => void
  iconSize?: number
  boxSize?: number
  dimColor?: string
}

export default function MicButton({ onTranscript, iconSize = 16, boxSize = 24, dimColor = 'var(--text-mid)' }: Props) {
  const { supported, isListening, toggle } = useSpeechToText(onTranscript)
  const { t } = useI18n()

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isListening ? t('ai.stopDictation') : t('ai.voiceDictation')}
      title={isListening ? t('ai.stopDictation') : t('ai.voiceDictation')}
      className={isListening ? 'mic-listening' : undefined}
      style={{
        width: boxSize, height: boxSize, borderRadius: '50%',
        background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0,
        color: isListening ? '#EF4444' : dimColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color 150ms',
      }}
    >
      <Mic size={iconSize} />
    </button>
  )
}
