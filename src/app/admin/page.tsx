'use client'

import { useState } from 'react'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import { VitalsControls } from '@/components/instructor/VitalsControls'
import { EcgRhythmSelector } from '@/components/instructor/EcgRhythmSelector'
import { Spo2WaveformSelector } from '@/components/instructor/Spo2WaveformSelector'
import { Etco2WaveformSelector } from '@/components/instructor/Etco2WaveformSelector'
import { CallerInfoForm } from '@/components/instructor/CallerInfoForm'
import { SaveButton } from '@/components/instructor/SaveButton'
import { SendButton } from '@/components/instructor/SendButton'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { cn } from '@/lib/utils'

type AdminTab = 'monitor' | 'caller'

export default function AdminPage() {
  useStoreHydration()
  const [tab, setTab] = useState<AdminTab>('monitor')
  const reset = useMonitorStore((s) => s.reset)
  const resetMonitorVitals = useMonitorStore((s) => s.resetMonitorVitals)
  const handleReset = tab === 'monitor' ? resetMonitorVitals : reset

  return (
    <InstructorLayout>
      <div className="grid grid-cols-2 border border-neutral-800 bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => setTab('monitor')}
          aria-pressed={tab === 'monitor'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'monitor'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Monitor
        </button>
        <button
          type="button"
          onClick={() => setTab('caller')}
          aria-pressed={tab === 'caller'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'caller'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Caller Info
        </button>
      </div>
      {tab === 'monitor' ? (
        <>
          <VitalsControls />
          <EcgRhythmSelector />
          <Spo2WaveformSelector />
          <Etco2WaveformSelector />
        </>
      ) : (
        <CallerInfoForm />
      )}
      <div className="flex items-center gap-3">
        <SaveButton />
        <SendButton />
        <button
          type="button"
          onClick={handleReset}
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
