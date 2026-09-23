'use client'

import { useEffect, useRef } from 'react'

import { getWagamiAText } from '@/lib/wagamiALocalization'
import { cn } from '@/lib/utils'
import type { PatientInfo, PatientSex } from '@/types/patientInfo'
import type { WagamiALocale } from '@/types/wagamiA'

type WagamiAPatientInfoPanelProps = {
  patientInfo: PatientInfo
  locale: WagamiALocale
  selectedAction?: string | null
  readOnly?: boolean
  onDecreaseAge: () => void
  onIncreaseAge: () => void
  onSelectSex: (sex: PatientSex) => void
  onDone: () => void
}

const CONTROL = 'min-h-[44px] rounded border border-wagami-a-border bg-wagami-a-surface-raised px-4 font-sans font-semibold text-wagami-a-text enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-wagami-a-pni disabled:cursor-default disabled:opacity-40'

export function WagamiAPatientInfoPanel({
  patientInfo,
  locale,
  selectedAction,
  readOnly = false,
  onDecreaseAge,
  onIncreaseAge,
  onSelectSex,
  onDone,
}: WagamiAPatientInfoPanelProps) {
  const text = getWagamiAText(locale)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (readOnly) return
    panelRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [readOnly])

  const selected = (id: string) => selectedAction === id

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-label={text.patientInfoTitle}
      className="absolute inset-0 z-30 grid grid-rows-[auto_minmax(0,1fr)_auto] bg-wagami-a-screen p-[clamp(12px,2cqw,28px)]"
    >
      <h2 className="font-sans text-[clamp(18px,2cqw,30px)] font-semibold text-wagami-a-text">
        {text.patientInfoTitle}
      </h2>

      <div className="grid content-center gap-[clamp(12px,2cqw,28px)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded border border-wagami-a-border bg-wagami-a-surface p-4">
          <span className="font-sans text-[clamp(14px,1.5cqw,22px)] font-semibold">{text.patientAge}</span>
          <button
            type="button"
            aria-label={text.decreaseAge}
            disabled={readOnly || patientInfo.age <= 0}
            onClick={onDecreaseAge}
            className={cn(CONTROL, selected('patientAgeDown') && 'border-wagami-a-pni bg-wagami-a-pni text-wagami-a-screen')}
          >
            −
          </button>
          <output aria-label={text.patientAge} className="min-w-[5ch] text-center font-mono text-[clamp(20px,2.5cqw,38px)] font-bold text-wagami-a-pni">
            {patientInfo.age}
          </output>
          <button
            type="button"
            aria-label={text.increaseAge}
            disabled={readOnly || patientInfo.age >= 120}
            onClick={onIncreaseAge}
            className={cn(CONTROL, selected('patientAgeUp') && 'border-wagami-a-pni bg-wagami-a-pni text-wagami-a-screen')}
          >
            +
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded border border-wagami-a-border bg-wagami-a-surface p-4">
          <span className="font-sans text-[clamp(14px,1.5cqw,22px)] font-semibold">{text.patientSex}</span>
          {(['M', 'F'] as const).map((sex) => {
            const id = sex === 'M' ? 'patientSexM' : 'patientSexF'
            return (
              <button
                key={sex}
                type="button"
                aria-pressed={patientInfo.sex === sex}
                disabled={readOnly}
                onClick={() => onSelectSex(sex)}
                className={cn(
                  CONTROL,
                  patientInfo.sex === sex && 'border-wagami-a-pni text-wagami-a-pni',
                  selected(id) && 'bg-wagami-a-pni text-wagami-a-screen',
                )}
              >
                {sex}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={readOnly}
        onClick={onDone}
        className={cn(CONTROL, 'justify-self-stretch', selected('patientInfoDone') && 'border-wagami-a-pni bg-wagami-a-pni text-wagami-a-screen')}
      >
        {text.done}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {text.patientAge} {patientInfo.age}, {text.patientSex} {patientInfo.sex}
      </p>
    </section>
  )
}
