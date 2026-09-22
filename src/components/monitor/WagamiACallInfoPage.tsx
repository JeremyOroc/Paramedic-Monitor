import { CallerInfoModal, type CallerInfoModalProps } from '@/components/monitor/CallerInfoModal'
import { WagamiAClinicalStatusLine } from '@/components/monitor/WagamiAClinicalStatusLine'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import type { WagamiALocale } from '@/types/wagamiA'
import type { AlarmChannel, PatientMode } from '@/types/vitals'

type WagamiACallInfoPageProps = {
  callerInfo: Omit<CallerInfoModalProps, 'open' | 'fullScreen' | 'contained' | 'onBack' | 'locale'>
  patientMode: PatientMode
  alarms: AlarmChannel[]
  locale: WagamiALocale
  onBack?: () => void
}

export function WagamiACallInfoPage({ callerInfo, patientMode, alarms, locale, onBack }: WagamiACallInfoPageProps) {
  const text = getWagamiAText(locale)

  return (
    <section data-testid="wagami-a-call-info-page" className="grid h-full min-h-0 w-full grid-rows-[56px_minmax(0,1fr)] overflow-hidden bg-wagami-a-screen text-wagami-a-text">
      <header className="flex min-w-0 items-center gap-3 border-b border-wagami-a-border bg-wagami-a-surface px-4">
        <button type="button" onClick={onBack} disabled={!onBack} className="min-h-[44px] shrink-0 rounded border border-wagami-a-border bg-wagami-a-surface-raised px-3 font-sans text-sm font-semibold focus-visible:outline-2 focus-visible:outline-wagami-a-pni disabled:cursor-default">
          ← {text.back}
        </button>
        <h1 className="min-w-0 truncate font-sans text-lg font-semibold">{text.callInfoTitle}</h1>
        <WagamiAClinicalStatusLine patientMode={patientMode} alarms={alarms} locale={locale} className="ml-auto max-w-[48%] shrink-0 justify-end text-right" />
      </header>
      <div className="relative min-h-0 overflow-hidden">
        <CallerInfoModal {...callerInfo} open fullScreen contained locale={locale} />
      </div>
    </section>
  )
}
