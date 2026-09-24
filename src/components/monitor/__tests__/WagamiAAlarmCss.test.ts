import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('Wagami A vital alarm animation CSS', () => {
  it('uses a dedicated readable 1.9-second card animation', () => {
    expect(css).toContain(".wagami-a-vital-alarm-pulse[data-alarming='true']")
    expect(css).toContain('animation: wagami-a-vital-alarm-cycle 1.9s ease-in-out infinite !important')
    const keyframes = css.match(/@keyframes wagami-a-vital-alarm-cycle \{[\s\S]*?\n\}/)?.[0]
    expect(keyframes).toContain('background-color:')
    expect(keyframes).toContain('border-color:')
    expect(keyframes).toContain('box-shadow:')
    expect(keyframes).toContain('background-color: var(--color-wagami-a-surface)')
    expect(keyframes).toContain('box-shadow: none')
    expect(keyframes).not.toContain('opacity:')
    expect(keyframes).not.toContain('transform:')

    const activeRule = css.match(/\.wagami-a-vital-alarm-pulse\[data-alarming='true'\] \{[\s\S]*?\n\}/)?.[0]
    expect(activeRule).not.toMatch(/background-color:[^;]+!important/)
    expect(activeRule).not.toMatch(/border-color:[^;]+!important/)
    expect(activeRule).not.toMatch(/box-shadow:[\s\S]*?!important/)
  })

  it('replaces animation with a steady alarm treatment under reduced motion', () => {
    const reducedMotion = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedMotion).toContain(".wagami-a-vital-alarm-pulse[data-alarming='true']")
    expect(reducedMotion).toMatch(/\.wagami-a-vital-alarm-pulse\[data-alarming='true'\] \{\s*animation: none !important;/)
    expect(reducedMotion).toContain('background-color:')
    expect(reducedMotion).toContain('border-color: var(--color-wagami-a-alarm)')
  })
})
