'use client'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import { VitalsControls } from '@/components/instructor/VitalsControls'
import { EcgRhythmSelector } from '@/components/instructor/EcgRhythmSelector'
import { Spo2WaveformSelector } from '@/components/instructor/Spo2WaveformSelector'
import { Etco2WaveformSelector } from '@/components/instructor/Etco2WaveformSelector'
import { SaveButton } from '@/components/instructor/SaveButton'
import { SendButton } from '@/components/instructor/SendButton'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'

export default function AdminPage() {
  useStoreHydration()
  const reset = useMonitorStore((s) => s.reset)

  return (
    <InstructorLayout>
      <VitalsControls />
      <EcgRhythmSelector />
      <Spo2WaveformSelector />
      <Etco2WaveformSelector />
      <div className="flex items-center gap-3">
        <SaveButton />
        <SendButton />
        <button
          type="button"
          onClick={reset}
          className="ml-auto px-3 py-2 border border-neutral-700 text-neutral-400 font-mono uppercase tracking-wider text-xs hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Open <span className="text-neutral-300">/</span> in another tab to see the monitor.
        Changes propagate after <span className="text-pending-amber">Send</span>.
      </p>
    </InstructorLayout>
  )
}
