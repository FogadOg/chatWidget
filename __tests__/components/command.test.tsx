import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { CommandDialog } from 'src/components/ui/command'

afterEach(() => {
  cleanup()
})

describe('CommandDialog', () => {
  test('renders title, description and children', () => {
    render(
      <CommandDialog defaultOpen title="My Title" description="My Description">
        <div>child-content</div>
      </CommandDialog>
    )

    expect(screen.getByText('My Title')).toBeInTheDocument()
    expect(screen.getByText('My Description')).toBeInTheDocument()
    expect(screen.getByText('child-content')).toBeInTheDocument()
  })

  test('forwards className to DialogContent and toggles close button', () => {
    const { rerender } = render(
      <CommandDialog defaultOpen className="my-extra">
        <span>x</span>
      </CommandDialog>
    )

    const content = document.querySelector('[data-slot="dialog-content"]')
    expect(content).toBeTruthy()
    if (content) {
      expect(content.className).toEqual(expect.stringContaining('overflow-hidden'))
      expect(content.className).toEqual(expect.stringContaining('my-extra'))
    }

    // close button should exist by default
    expect(screen.queryByRole('button', { name: /close/i })).toBeInTheDocument()

    // when showCloseButton=false, it should not render
    rerender(
      <CommandDialog defaultOpen showCloseButton={false}>
        <span>y</span>
      </CommandDialog>
    )

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })
})
