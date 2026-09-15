import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WagamiAPreview } from '../WagamiAPreview'

describe('Wagami A construction preview', () => {
  it('shows a powered-on, visibly non-clinical A screen and all six future tasks', () => {
    render(<WagamiAPreview />)

    expect(screen.getByTestId('wagami-a-preview')).toBeInTheDocument()
    expect(screen.getByText('PREVIEW')).toBeInTheDocument()
    expect(screen.getByText('ALIMENTATION · ON')).toBeInTheDocument()
    expect(screen.getByText('PRÉVISUALISATION · HORS SALLE')).toBeInTheDocument()
    expect(screen.getByText('Info appel')).toBeInTheDocument()
    expect(screen.getByLabelText('Future right-side task dock').children[1].children).toHaveLength(6)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
