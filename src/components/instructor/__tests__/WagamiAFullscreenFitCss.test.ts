import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('Wagami A Fullscreen Spectator fit CSS', () => {
  it('uses continuous container-relative containment without a fixed scale', () => {
    const canvasRule = css.match(/\.embedded-spectator-canvas-wagami-a-fullscreen \{[\s\S]*?\n\}/)?.[0]
    expect(canvasRule).toContain('width: 100%')
    expect(canvasRule).toContain('height: 100%')
    expect(canvasRule).toContain('transform: none')

    const containerRule = css.match(/\.wagami-a-fullscreen-fit-container \{[\s\S]*?\n\}/)?.[0]
    expect(containerRule).toContain('container-type: size')

    const shellRule = css.match(/\.wagami-a-shell-container-fit \{[\s\S]*?\n\}/)?.[0]
    expect(shellRule).toContain('width: min(100cqw, calc(100cqh * 1.53))')
    expect(shellRule).toContain('min-width: 0')
    expect(shellRule).toContain('max-width: none')
    expect(shellRule).not.toMatch(/\b[vd]?[wh]\b/)
  })

  it('reserves safe-area-aware header and device surfaces without decorative spacing', () => {
    const headerRule = css.match(/\.spectator-wagami-a-fullscreen-header \{[\s\S]*?\n\}/)?.[0]
    expect(headerRule).toContain('env(safe-area-inset-top)')
    expect(headerRule).toContain('env(safe-area-inset-right)')
    expect(headerRule).toContain('env(safe-area-inset-left)')

    const surfaceRule = css.match(/\.spectator-wagami-a-fullscreen-surface \{[\s\S]*?\n\}/)?.[0]
    expect(surfaceRule).toContain('env(safe-area-inset-right)')
    expect(surfaceRule).toContain('env(safe-area-inset-bottom)')
    expect(surfaceRule).toContain('env(safe-area-inset-left)')
    expect(surfaceRule).not.toMatch(/padding[^:]*:\s*[1-9][0-9]*px/)
  })
})
