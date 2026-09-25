export function WagamiAStartupScreen() {
  return (
    <div
      data-testid="wagami-a-startup-screen"
      role="status"
      aria-label="Wagami A starting. For simulation purposes only."
      className="relative grid h-full w-full place-items-center bg-wagami-a-screen font-sans text-wagami-a-text"
    >
      <div aria-hidden="true" className="text-[clamp(42px,7cqw,104px)] font-bold tracking-[0.12em]">
        WAGAMI A
      </div>
      <div aria-hidden="true" className="absolute bottom-[4%] left-[3%] font-mono text-[clamp(11px,1.05cqw,16px)] leading-relaxed">
        <div>For simulation purposes only</div>
        <div>À des fins de simulation seulement</div>
      </div>
    </div>
  )
}
