'use client'

import { useEffect, useState } from 'react'

type AcquiringDialogProps = {
  /** Fill time for the progress bar, in ms — matched to the page's acquire timer. */
  durationMs: number
}

/**
 * Centered "Acquiring 12-Lead" card with a green progress bar that fills over
 * durationMs. Purely visual: the page owns the completion timer so Back can
 * cancel the acquisition.
 */
export function AcquiringDialog({ durationMs }: AcquiringDialogProps) {
  const [fill, setFill] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="absolute inset-0 z-30 grid place-items-center p-6">
      <section
        aria-label="Acquiring 12-Lead"
        className="w-full max-w-[360px] rounded-xl border border-neutral-300 bg-white px-6 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      >
        <h2 className="mb-3 text-center font-sans text-lg font-semibold text-black">
          Acquiring 12-Lead
        </h2>
        <div
          role="progressbar"
          aria-label="Acquisition progress"
          className="h-4 w-full overflow-hidden rounded-sm bg-neutral-200"
        >
          <div
            className="h-full rounded-sm bg-acquire-green transition-[width] ease-linear"
            style={{
              width: fill ? '100%' : '0%',
              transitionDuration: `${durationMs}ms`,
            }}
          />
        </div>
      </section>
    </div>
  )
}
