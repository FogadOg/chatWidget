import React from 'react'
import { render, screen } from '@testing-library/react'
import { Button } from '../components/ui/button'
import Dialog, { DialogTitle, DialogDescription } from '../components/ui/dialog'
import ScrollArea from '../components/ui/scroll-area'

describe('UI component smoke tests', () => {
  test('Button renders children', () => {
    render(<Button>Click</Button>)
    expect(screen.getByText('Click')).toBeInTheDocument()
  })

  test('Dialog and subcomponents render', () => {
    render(<Dialog><DialogTitle>Hi</DialogTitle><DialogDescription>desc</DialogDescription></Dialog>)
    expect(screen.getByText('Hi')).toBeInTheDocument()
    expect(screen.getByText('desc')).toBeInTheDocument()
  })

  test('ScrollArea renders children', () => {
    render(<ScrollArea><div>inside</div></ScrollArea>)
    expect(screen.getByText('inside')).toBeInTheDocument()
  })
})
