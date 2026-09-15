'use client'

import { useState } from 'react'

import { WagamiADevice } from '@/components/monitor/WagamiADevice'
import { resolveWagamiAPreviewState } from '@/lib/wagamiAPreviewState'
import { useMonitorStore } from '@/store/monitorStore'
import { DEFAULT_VITALS } from '@/types/vitals'

/** Room-free A3 preview. A4/A5 attach clinical actions and task destinations. */
export function WagamiAPreview() {
  const confirmed = useMonitorStore((state) => state.confirmed)
  const confirmedActive = useMonitorStore((state) => state.confirmedVitalActive)
  const [poweredOn, setPoweredOn] = useState(true)
  const display = resolveWagamiAPreviewState(confirmed, confirmedActive)

  return (
    <main data-testid="wagami-a-preview" className="fixed inset-0 grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-wagami-a-screen text-wagami-a-text max-[1023px]:min-w-0">
      <div className="hidden max-[1023px]:grid max-[1023px]:place-items-center max-[1023px]:p-8 max-[1023px]:text-center">
        <div className="font-sans text-xl font-semibold">Affichage paysage requis</div>
        <p className="mt-3 text-wagami-a-muted-text">Utilisez un iPad compatible en mode paysage ou un écran de 1024 pixels minimum.</p>
      </div>
      <div className="max-[1023px]:hidden">
        <WagamiADevice display={display} energy={DEFAULT_VITALS.joules} poweredOn={poweredOn} onPowerToggle={() => setPoweredOn((current) => !current)} />
      </div>
    </main>
  )
}
