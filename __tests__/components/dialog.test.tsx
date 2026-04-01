import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from 'src/components/ui/dialog'

afterEach(() => cleanup())

describe('DialogTrigger and DialogClose', () => {
  test('DialogTrigger renders trigger element with data-slot', () => {
    render(
      <Dialog>
        <DialogTrigger>
          <button>Open</button>
        </DialogTrigger>
        <DialogContent>
          <div>inside</div>
        </DialogContent>
      </Dialog>
    )

    // trigger should render and expose the data-slot attribute
    const trigger = document.querySelector('[data-slot="dialog-trigger"]')
    expect(trigger).toBeTruthy()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  test('DialogClose closes an open dialog when clicked', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogClose>
            <button>CloseMe</button>
          </DialogClose>
          <div>visible-content</div>
        </DialogContent>
      </Dialog>
    )

    // confirm content is visible
    expect(screen.getByText('visible-content')).toBeInTheDocument()

    // click the close button and expect content to disappear
    fireEvent.click(screen.getByText('CloseMe'))
    expect(screen.queryByText('visible-content')).not.toBeInTheDocument()
  })
})
