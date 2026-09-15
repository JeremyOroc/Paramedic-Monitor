import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { WagamiAScreen } from './WagamiAScreen'

type WagamiADeviceProps = {
  display: WagamiADisplayState
  energy: number
  poweredOn: boolean
  onPowerToggle: () => void
  canCharge?: boolean
  canShock?: boolean
  onCharge?: () => void
  onShock?: () => void
}

function PowerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current stroke-[2.2] [stroke-linecap:round]"><path d="M12 2v9" /><path d="M7.2 5.1a8.5 8.5 0 1 0 9.6 0" /></svg>
}

function ShockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current"><path d="m13.6 1-8 13h5.1L9 23l9.5-14h-5.1z" /></svg>
}

export function WagamiADevice({
  display,
  energy,
  poweredOn,
  onPowerToggle,
  canCharge = false,
  canShock = false,
  onCharge,
  onShock,
}: WagamiADeviceProps) {
  const alarming = display.alarms.length > 0 && poweredOn
  return (
    <div data-testid="wagami-a-shell" className="wagami-a-shell relative aspect-[1.53] w-[min(96vw,calc(89vh*1.53))] max-w-[1500px] min-w-[920px] overflow-hidden text-wagami-a-text [container-type:inline-size]">
      <div aria-hidden="true" className="wagami-a-shell-inner absolute inset-[1.4%]" />
      <div aria-hidden="true" className="wagami-a-shell-grip absolute left-[1.8%] top-[47%] h-[22%] w-[2.1%]" />
      <div aria-hidden="true" className="wagami-a-shell-grip absolute right-[1.8%] top-[41%] h-[24%] w-[2.1%]" />
      <span
        data-testid="wagami-a-shell-led"
        data-alarming={alarming ? 'true' : 'false'}
        aria-label={alarming ? 'Voyant alarme actif' : 'Voyant alarme normal'}
        className="wagami-a-shell-led absolute left-[7.4%] top-[4%] z-10 h-[clamp(10px,1.35cqw,19px)] w-[clamp(10px,1.35cqw,19px)] rounded-full"
      />
      <div className="absolute left-[14%] top-[2.7%] z-10 font-sans text-[clamp(19px,2.35cqw,36px)] font-bold tracking-[0.1em]">WAGAMI A</div>

      <div className="absolute left-[6.9%] right-[6.9%] top-[10.5%] bottom-[10.6%] overflow-hidden rounded-[12px] border-[clamp(3px,0.4cqw,7px)] border-wagami-a-border bg-wagami-a-screen shadow-inner">
        {poweredOn ? (
          <WagamiAScreen display={display} energy={energy} />
        ) : (
          <div data-testid="wagami-a-screen-off" className="grid h-full w-full place-items-center bg-wagami-a-screen font-mono text-[clamp(12px,1.2cqw,18px)] tracking-widest text-wagami-a-muted-text">ALIMENTATION COUPÉE</div>
        )}
      </div>

      <button type="button" aria-label="Alimentation WAGAMI A" aria-pressed={poweredOn} onClick={onPowerToggle} className="wagami-a-power-button absolute right-[3.2%] top-[2.4%] z-20 grid h-[clamp(44px,5cqw,76px)] w-[clamp(44px,5cqw,76px)] place-items-center rounded-[9px] border-2 border-wagami-a-border bg-wagami-a-screen text-wagami-a-text enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-pni"><PowerIcon /></button>
      <button type="button" aria-label="Charge WAGAMI A" disabled={!canCharge || !onCharge || !poweredOn} title={!onCharge ? 'Disponible en phase A4' : undefined} onClick={onCharge} className="wagami-a-charge-button absolute left-[0.6%] top-[29%] z-20 grid h-[20%] w-[6.2%] place-items-center border-2 border-wagami-a-pending bg-wagami-a-pending font-sans text-[clamp(10px,1.15cqw,16px)] font-bold text-wagami-a-screen disabled:cursor-not-allowed enabled:hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-pending">CHARGE</button>
      <div aria-hidden="true" className="wagami-a-shock-guard absolute right-[0.2%] bottom-[17%] z-10 h-[23%] w-[7.2%]" />
      <button type="button" aria-label="Choc WAGAMI A" disabled={!canShock || !onShock || !poweredOn} title={!onShock ? 'Disponible en phase A4' : undefined} onClick={onShock} className="wagami-a-shock-button absolute right-[0.8%] bottom-[18%] z-20 grid h-[21%] w-[6%] place-content-center justify-items-center gap-1 border-2 border-wagami-a-alarm bg-wagami-a-shock-shell font-sans text-[clamp(10px,1.15cqw,17px)] font-bold text-wagami-a-text disabled:cursor-not-allowed enabled:hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wagami-a-alarm">CHOC<ShockIcon /></button>
      <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 font-mono text-[clamp(9px,1cqw,15px)] tracking-widest text-wagami-a-muted-text">PREVIEW · HORS SALLE</div>
    </div>
  )
}
