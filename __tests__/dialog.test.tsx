import React from 'react'
import { render, screen } from '@testing-library/react'
import Dialog, { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../components/ui/dialog'

describe('Dialog UI component', () => {
  test('renders children correctly and asChild behavior', () => {
    render(<Dialog>
      <DialogContent data-testid="content">content</DialogContent>
      <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
      <DialogDescription asChild><div data-testid="desc">Desc</div></DialogDescription>
      <DialogFooter>Foot</DialogFooter>
      <DialogClose>Close</DialogClose>
    </Dialog>)

    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByTestId('desc')).toBeInTheDocument()
    expect(screen.getByText('Foot')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })
})
