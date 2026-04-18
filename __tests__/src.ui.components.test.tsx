import * as React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle } from '../src/components/ui/alert'
import { Badge } from '../src/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../src/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../src/components/ui/collapsible'

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <svg data-testid="arrow-left" />,
  ArrowRight: () => <svg data-testid="arrow-right" />,
}))

jest.mock('@radix-ui/react-collapsible', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="collapsible-root" {...props}>{children}</div>,
  CollapsibleTrigger: ({ children, ...props }: any) => <button data-testid="collapsible-trigger-inner" {...props}>{children}</button>,
  CollapsibleContent: ({ children, ...props }: any) => <div data-testid="collapsible-content-inner" {...props}>{children}</div>,
}))

const emblaHookMock = jest.fn()

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: (...args: any[]) => emblaHookMock(...args),
}))

describe('src ui components', () => {
  beforeEach(() => {
    emblaHookMock.mockReset()
  })

  test('Alert renders default and destructive variants with slots', () => {
    const { rerender } = render(
      <Alert className="custom-alert">
        <svg data-testid="alert-icon" />
        <AlertTitle className="custom-title">Heads up</AlertTitle>
        <AlertDescription className="custom-description">
          <p>Alert description</p>
        </AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('data-slot', 'alert')
    expect(alert).toHaveClass('bg-card')
    expect(alert).toHaveClass('custom-alert')

    const title = screen.getByText('Heads up')
    expect(title).toHaveAttribute('data-slot', 'alert-title')
    expect(title).toHaveClass('custom-title')

    const description = screen.getByText('Alert description').closest('[data-slot="alert-description"]')
    expect(description).toBeInTheDocument()
    expect(description).toHaveClass('custom-description')

    rerender(
      <Alert variant="destructive">Destructive alert</Alert>
    )
    expect(screen.getByRole('alert')).toHaveClass('text-destructive')
  })

  test('Badge supports variants and asChild rendering', () => {
    const { rerender } = render(<Badge>Default badge</Badge>)
    const badge = screen.getByText('Default badge')
    expect(badge).toHaveAttribute('data-slot', 'badge')
    expect(badge).toHaveClass('bg-primary')

    rerender(
      <Badge variant="outline" className="outline-extra">
        Outline badge
      </Badge>
    )
    const outline = screen.getByText('Outline badge')
    expect(outline).toHaveClass('outline-extra')
    expect(outline).toHaveClass('text-foreground')

    rerender(
      <Badge asChild variant="secondary">
        <Link href="/docs">Docs badge</Link>
      </Badge>
    )
    const anchorBadge = screen.getByRole('link', { name: 'Docs badge' })
    expect(anchorBadge).toHaveAttribute('data-slot', 'badge')
    expect(anchorBadge).toHaveClass('bg-secondary')
  })

  test('ButtonGroup variants, text wrapper and separator render', () => {
    const {
      ButtonGroup,
      ButtonGroupSeparator,
      ButtonGroupText,
    } = require('../src/components/ui/button-group')

    const { rerender } = render(
      <ButtonGroup className="group-extra">
        <button type="button">A</button>
        <button type="button">B</button>
      </ButtonGroup>
    )

    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('data-slot', 'button-group')
    expect(group).toHaveClass('group-extra')
    expect(group.className).toContain('rounded-l-none')

    rerender(
      <ButtonGroup orientation="vertical">
        <button type="button">A</button>
        <button type="button">B</button>
      </ButtonGroup>
    )
    const verticalGroup = screen.getByRole('group')
    expect(verticalGroup).toHaveAttribute('data-orientation', 'vertical')
    expect(verticalGroup).toHaveClass('flex-col')

    rerender(<ButtonGroupText className="text-extra">Prefix</ButtonGroupText>)
    expect(screen.getByText('Prefix')).toHaveClass('text-extra')

    rerender(
      <ButtonGroupText asChild>
        <span>As child text</span>
      </ButtonGroupText>
    )
    expect(screen.getByText('As child text').tagName).toBe('SPAN')

    rerender(<ButtonGroupSeparator className="sep-extra" />)
    const defaultSeparator = document.querySelector('[data-slot="button-group-separator"]')
    expect(defaultSeparator).toHaveAttribute('data-slot', 'button-group-separator')
    expect(defaultSeparator).toHaveAttribute('data-orientation', 'vertical')
    expect(defaultSeparator).toHaveClass('sep-extra')

    rerender(<ButtonGroupSeparator orientation="horizontal" />)
    expect(document.querySelector('[data-slot="button-group-separator"]')).toHaveAttribute('data-orientation', 'horizontal')
  })

  test('Card family components render expected slots', () => {
    render(
      <Card className="card-extra">
        <CardHeader className="header-extra">
          <CardTitle className="title-extra">Card title</CardTitle>
          <CardDescription className="desc-extra">Card description</CardDescription>
          <CardAction className="action-extra">Action</CardAction>
        </CardHeader>
        <CardContent className="content-extra">Body</CardContent>
        <CardFooter className="footer-extra">Footer</CardFooter>
      </Card>
    )

    const title = screen.getByText('Card title')
    const description = screen.getByText('Card description')

    expect(screen.getByText('Body').closest('[data-slot="card-content"]')).toHaveClass('content-extra')
    expect(screen.getByText('Footer').closest('[data-slot="card-footer"]')).toHaveClass('footer-extra')
    expect(screen.getByText('Action').closest('[data-slot="card-action"]')).toHaveClass('action-extra')
    expect(title.closest('[data-slot="card-title"]')).toHaveClass('title-extra')
    expect(description.closest('[data-slot="card-description"]')).toHaveClass('desc-extra')
    expect(title.closest('[data-slot="card"]')).toHaveClass('card-extra')
  })

  test('Collapsible wrappers pass through and set data slots', () => {
    render(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByTestId('collapsible-root')).toHaveAttribute('data-slot', 'collapsible')
    expect(screen.getByTestId('collapsible-trigger-inner')).toHaveAttribute('data-slot', 'collapsible-trigger')
    expect(screen.getByTestId('collapsible-content-inner')).toHaveAttribute('data-slot', 'collapsible-content')
    expect(screen.getByText('Hidden content')).toBeInTheDocument()
  })

  test('Carousel supports keyboard, buttons, orientation classes and setApi', async () => {
    const {
      Carousel,
      CarouselContent,
      CarouselItem,
      CarouselNext,
      CarouselPrevious,
    } = require('../src/components/ui/carousel')

    const handlers: Record<string, (...args: any[]) => void> = {}
    const api = {
      canScrollPrev: jest.fn(() => true),
      canScrollNext: jest.fn(() => false),
      scrollPrev: jest.fn(),
      scrollNext: jest.fn(),
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler
      }),
      off: jest.fn(),
    }

    emblaHookMock.mockReturnValue([jest.fn(), api])
    const setApi = jest.fn()

    const { unmount, rerender } = render(
      <Carousel setApi={setApi} className="carousel-extra">
        <CarouselContent data-testid="carousel-content-inner">
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )

    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('data-slot', 'carousel')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
    expect(region).toHaveClass('carousel-extra')

    await waitFor(() => {
      expect(setApi).toHaveBeenCalledWith(api)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Previous slide/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /Next slide/i })).toBeDisabled()
    })

    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: /Previous slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))

    expect(api.scrollPrev).toHaveBeenCalled()
    expect(api.scrollNext).toHaveBeenCalled()

    handlers.select?.(undefined as any)

    rerender(
      <Carousel orientation="vertical" opts={{ axis: 'y' }}>
        <CarouselContent data-testid="carousel-content-vertical">
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid="prev-vertical" />
        <CarouselNext data-testid="next-vertical" />
      </Carousel>
    )

    expect(screen.getByTestId('carousel-content-vertical').className).toContain('-mt-4')
    expect(screen.getByText('Slide 2').closest('[data-slot="carousel-item"]')).toHaveClass('pt-4')
    expect(screen.getByTestId('prev-vertical')).toHaveClass('rotate-90')
    expect(screen.getByTestId('next-vertical')).toHaveClass('rotate-90')

    unmount()
    expect(api.off).toHaveBeenCalledWith('select', expect.any(Function))
  })

  test('Carousel subcomponents outside provider throw useful error', () => {
    const {
      CarouselContent,
      CarouselItem,
      CarouselNext,
      CarouselPrevious,
    } = require('../src/components/ui/carousel')

    expect(() => render(<CarouselContent />)).toThrow('useCarousel must be used within a <Carousel />')
    expect(() => render(<CarouselItem />)).toThrow('useCarousel must be used within a <Carousel />')
    expect(() => render(<CarouselPrevious />)).toThrow('useCarousel must be used within a <Carousel />')
    expect(() => render(<CarouselNext />)).toThrow('useCarousel must be used within a <Carousel />')
  })
})
