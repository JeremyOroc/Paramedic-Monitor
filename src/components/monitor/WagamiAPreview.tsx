const TASKS = ['12-lead', 'EtCO₂', 'Médicaments', 'Info appel', 'Imprimer / capturer', 'Configurer'] as const
const VITALS = [
  { label: 'FC', tone: 'text-wagami-a-ecg' },
  { label: 'SpO₂', tone: 'text-wagami-a-spo2' },
  { label: 'PNI', tone: 'text-wagami-a-pni' },
  { label: 'EtCO₂', tone: 'text-wagami-a-etco2' },
] as const

/** A2-only construction preview. A3/A4 replace the placeholders with live controls. */
export function WagamiAPreview() {
  return (
    <main
      data-testid="wagami-a-preview"
      className="fixed inset-0 grid min-h-[768px] min-w-[1024px] place-items-center overflow-hidden bg-wagami-a-screen p-5 text-wagami-a-text"
    >
      <div className="grid h-full max-h-[920px] w-full max-w-[1540px] grid-rows-[42px_minmax(0,1fr)_44px] gap-3 rounded-[36px] border-4 border-wagami-a-border bg-wagami-a-surface-raised p-4 shadow-2xl">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
          <div className="flex items-center gap-3">
            <span aria-label="Device alarm indicator" className="h-3 w-3 rounded-full bg-wagami-a-alarm shadow-[0_0_12px_currentColor] text-wagami-a-alarm" />
            <span className="font-mono text-xs tracking-[0.24em] text-wagami-a-muted-text">ALARME</span>
          </div>
          <div className="text-center font-mono text-xl font-bold tracking-[0.26em]">WAGAMI A</div>
          <div className="justify-self-end rounded-full border border-wagami-a-border px-4 py-1 font-mono text-xs tracking-[0.2em]">ALIMENTATION · ON</div>
        </div>

        <section aria-label="Wagami A construction preview screen" className="grid min-h-0 grid-cols-[minmax(0,1fr)_246px] gap-3 rounded-[20px] border-2 border-wagami-a-border bg-wagami-a-screen p-3">
          <div className="grid min-h-0 grid-rows-[108px_minmax(0,1fr)_44px] gap-3">
            <div className="grid grid-cols-4 gap-3">
              {VITALS.map((vital) => (
                <div key={vital.label} className="rounded-xl border border-wagami-a-border bg-wagami-a-surface p-4">
                  <div className={`font-mono text-sm font-semibold tracking-widest ${vital.tone}`}>{vital.label}</div>
                  <div className="mt-3 font-mono text-2xl text-wagami-a-muted-text">--</div>
                </div>
              ))}
            </div>
            <div className="grid min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <div className="rounded-xl border border-wagami-a-border bg-wagami-a-surface p-5">
                <div className="font-mono text-sm tracking-widest text-wagami-a-ecg">ECG · AUCUN PATIENT</div>
                <div className="grid h-full place-items-center font-mono text-lg tracking-wider text-wagami-a-muted-text">Vue de développement · signaux indisponibles</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-wagami-a-border bg-wagami-a-surface p-5 font-mono text-sm tracking-widest text-wagami-a-spo2">SpO₂ · --</div>
                <div className="rounded-xl border border-wagami-a-border bg-wagami-a-surface p-5 font-mono text-sm tracking-widest text-wagami-a-etco2">EtCO₂ · --</div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-wagami-a-border bg-wagami-a-surface px-4 font-mono text-xs tracking-widest text-wagami-a-muted-text">
              <span>MODE ADULTE</span><span>PRÉVISUALISATION · HORS SALLE</span>
            </div>
          </div>

          <aside aria-label="Future right-side task dock" className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_116px] gap-3">
            <div className="rounded-lg border border-wagami-a-pending px-3 py-2 text-center font-mono text-sm font-bold tracking-[0.22em] text-wagami-a-pending">PREVIEW</div>
            <div className="grid grid-cols-2 grid-rows-3 gap-2">
              {TASKS.map((task) => (
                <div key={task} className="grid place-items-center rounded-xl border border-wagami-a-border bg-wagami-a-surface-raised px-2 text-center font-mono text-xs font-semibold text-wagami-a-muted-text">{task}</div>
              ))}
            </div>
            <div className="rounded-xl border border-wagami-a-border bg-wagami-a-surface p-4 font-mono text-xs leading-6 text-wagami-a-muted-text">DÉFIBRILLATION<br />Statut : indisponible<br />Commandes activées en A3/A4</div>
          </aside>
        </section>

        <div className="grid grid-cols-3 items-center px-8 font-mono text-sm tracking-[0.2em] text-wagami-a-muted-text">
          <span>CHARGE · COQUE</span><span className="text-center">PREVIEW · NON CLINIQUE</span><span className="justify-self-end text-wagami-a-alarm">CHOC · COQUE</span>
        </div>
      </div>
    </main>
  )
}
