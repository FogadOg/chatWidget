import * as React from 'react'
import { render, screen } from '@testing-library/react'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../src/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../src/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../src/components/ui/hover-card'
import { Input } from '../src/components/ui/input'
import { Label } from '../src/components/ui/label'
import { Progress } from '../src/components/ui/progress'

jest.mock('lucide-react', () => ({
  SearchIcon: () => <svg data-testid="search-icon" />,
  CheckIcon: () => <svg data-testid="check-icon" />,
  ChevronRightIcon: () => <svg data-testid="chevron-right-icon" />,
  CircleIcon: () => <svg data-testid="circle-icon" />,
}))

jest.mock('cmdk', () => {
  const Root = ({ children, ...props }: any) => <div data-testid="cmdk-root" {...props}>{children}</div>
  const InputComp = (props: any) => <input data-testid="cmdk-input" {...props} />
  const List = ({ children, ...props }: any) => <div data-testid="cmdk-list" {...props}>{children}</div>
  const Empty = ({ children, ...props }: any) => <div data-testid="cmdk-empty" {...props}>{children}</div>
  const Group = ({ children, ...props }: any) => <div data-testid="cmdk-group" {...props}>{children}</div>
  const Separator = ({ ...props }: any) => <hr data-testid="cmdk-separator" {...props} />
  const Item = ({ children, ...props }: any) => <div data-testid="cmdk-item" {...props}>{children}</div>

  return {
    Command: Object.assign(Root, {
      Input: InputComp,
      List,
      Empty,
      Group,
      Separator,
      Item,
    }),
  }
})

jest.mock('@radix-ui/react-hover-card', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="hover-root" {...props}>{children}</div>,
  Trigger: ({ children, ...props }: any) => <button data-testid="hover-trigger" {...props}>{children}</button>,
  Portal: ({ children, ...props }: any) => <div data-testid="hover-portal" {...props}>{children}</div>,
  Content: ({ children, align, sideOffset, ...props }: any) => (
    <div data-testid="hover-content" data-align={align} data-side-offset={String(sideOffset)} {...props}>{children}</div>
  ),
}))

jest.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="dd-root" {...props}>{children}</div>,
  Portal: ({ children, ...props }: any) => <div data-testid="dd-portal" {...props}>{children}</div>,
  Trigger: ({ children, ...props }: any) => <button data-testid="dd-trigger" {...props}>{children}</button>,
  Content: ({ children, sideOffset, ...props }: any) => (
    <div data-testid="dd-content" data-side-offset={String(sideOffset)} {...props}>{children}</div>
  ),
  Group: ({ children, ...props }: any) => <div data-testid="dd-group" {...props}>{children}</div>,
  Item: ({ children, ...props }: any) => <div data-testid="dd-item" {...props}>{children}</div>,
  CheckboxItem: ({ children, checked, ...props }: any) => (
    <div data-testid="dd-checkbox-item" data-checked={String(checked)} {...props}>{children}</div>
  ),
  RadioGroup: ({ children, ...props }: any) => <div data-testid="dd-radio-group" {...props}>{children}</div>,
  RadioItem: ({ children, ...props }: any) => <div data-testid="dd-radio-item" {...props}>{children}</div>,
  Label: ({ children, ...props }: any) => <div data-testid="dd-label" {...props}>{children}</div>,
  Separator: ({ ...props }: any) => <hr data-testid="dd-separator" {...props} />,
  Sub: ({ children, ...props }: any) => <div data-testid="dd-sub" {...props}>{children}</div>,
  SubTrigger: ({ children, ...props }: any) => <div data-testid="dd-sub-trigger" {...props}>{children}</div>,
  SubContent: ({ children, ...props }: any) => <div data-testid="dd-sub-content" {...props}>{children}</div>,
  ItemIndicator: ({ children, ...props }: any) => <span data-testid="dd-item-indicator" {...props}>{children}</span>,
}))

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, ...props }: any) => <label data-testid="radix-label" {...props}>{children}</label>,
}))

jest.mock('@radix-ui/react-progress', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="radix-progress-root" {...props}>{children}</div>,
  Indicator: ({ ...props }: any) => <div data-testid="radix-progress-indicator" {...props} />,
}))

describe('extra src ui components', () => {
  test('Command components render with slots and classes', () => {
    render(
      <Command className="command-extra">
        <CommandInput className="input-extra" placeholder="Search" />
        <CommandList className="list-extra">
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup className="group-extra" heading="General">
            <CommandItem className="item-extra">Open</CommandItem>
            <CommandSeparator className="separator-extra" />
          </CommandGroup>
        </CommandList>
        <CommandShortcut className="shortcut-extra">⌘K</CommandShortcut>
      </Command>
    )

    expect(screen.getByTestId('cmdk-root')).toHaveAttribute('data-slot', 'command')
    expect(screen.getByTestId('cmdk-root')).toHaveClass('command-extra')
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    expect(screen.getByTestId('cmdk-input')).toHaveAttribute('data-slot', 'command-input')
    expect(screen.getByTestId('cmdk-input')).toHaveClass('input-extra')
    expect(screen.getByTestId('cmdk-list')).toHaveAttribute('data-slot', 'command-list')
    expect(screen.getByTestId('cmdk-list')).toHaveClass('list-extra')
    expect(screen.getByTestId('cmdk-empty')).toHaveAttribute('data-slot', 'command-empty')
    expect(screen.getByTestId('cmdk-group')).toHaveAttribute('data-slot', 'command-group')
    expect(screen.getByTestId('cmdk-group')).toHaveClass('group-extra')
    expect(screen.getByTestId('cmdk-item')).toHaveAttribute('data-slot', 'command-item')
    expect(screen.getByTestId('cmdk-item')).toHaveClass('item-extra')
    expect(screen.getByTestId('cmdk-separator')).toHaveAttribute('data-slot', 'command-separator')
    expect(screen.getByText('⌘K')).toHaveAttribute('data-slot', 'command-shortcut')
    expect(screen.getByText('⌘K')).toHaveClass('shortcut-extra')
  })

  test('HoverCard components render with default and custom content props', () => {
    const { rerender } = render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent>Preview</HoverCardContent>
      </HoverCard>
    )

    expect(screen.getByTestId('hover-root')).toHaveAttribute('data-slot', 'hover-card')
    expect(screen.getByTestId('hover-trigger')).toHaveAttribute('data-slot', 'hover-card-trigger')
    expect(screen.getByTestId('hover-content')).toHaveAttribute('data-slot', 'hover-card-content')
    expect(screen.getByTestId('hover-content')).toHaveAttribute('data-align', 'center')
    expect(screen.getByTestId('hover-content')).toHaveAttribute('data-side-offset', '4')

    rerender(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent align="start" sideOffset={10} className="hover-extra">Preview</HoverCardContent>
      </HoverCard>
    )

    expect(screen.getByTestId('hover-content')).toHaveAttribute('data-align', 'start')
    expect(screen.getByTestId('hover-content')).toHaveAttribute('data-side-offset', '10')
    expect(screen.getByTestId('hover-content')).toHaveClass('hover-extra')
  })

  test('DropdownMenu family renders all slots and variant props', () => {
    const { rerender } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel inset>Actions</DropdownMenuLabel>
              <DropdownMenuItem inset variant="destructive" className="item-extra">Delete</DropdownMenuItem>
              <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup value="a">
                <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator className="separator-extra" />
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="sub-content-extra">Nested</DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    )

    expect(screen.getByTestId('dd-root')).toHaveAttribute('data-slot', 'dropdown-menu')
    expect(screen.getByTestId('dd-trigger')).toHaveAttribute('data-slot', 'dropdown-menu-trigger')
    expect(screen.getAllByTestId('dd-portal')[0]).toHaveAttribute('data-slot', 'dropdown-menu-portal')
    expect(screen.getByTestId('dd-content')).toHaveAttribute('data-slot', 'dropdown-menu-content')
    expect(screen.getByTestId('dd-content')).toHaveAttribute('data-side-offset', '4')
    expect(screen.getByTestId('dd-group')).toHaveAttribute('data-slot', 'dropdown-menu-group')

    const label = screen.getByTestId('dd-label')
    expect(label).toHaveAttribute('data-slot', 'dropdown-menu-label')
    expect(label).toHaveAttribute('data-inset', 'true')

    const item = screen.getByText('Delete')
    expect(item).toHaveAttribute('data-slot', 'dropdown-menu-item')
    expect(item).toHaveAttribute('data-inset', 'true')
    expect(item).toHaveAttribute('data-variant', 'destructive')
    expect(item).toHaveClass('item-extra')

    expect(screen.getByTestId('dd-checkbox-item')).toHaveAttribute('data-slot', 'dropdown-menu-checkbox-item')
    expect(screen.getByTestId('dd-checkbox-item')).toHaveAttribute('data-checked', 'true')
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()

    expect(screen.getByTestId('dd-radio-group')).toHaveAttribute('data-slot', 'dropdown-menu-radio-group')
    expect(screen.getByTestId('dd-radio-item')).toHaveAttribute('data-slot', 'dropdown-menu-radio-item')
    expect(screen.getByTestId('circle-icon')).toBeInTheDocument()

    expect(screen.getByTestId('dd-separator')).toHaveAttribute('data-slot', 'dropdown-menu-separator')
    expect(screen.getByTestId('dd-separator')).toHaveClass('separator-extra')

    expect(screen.getByText('⌘D')).toHaveAttribute('data-slot', 'dropdown-menu-shortcut')

    expect(screen.getByTestId('dd-sub')).toHaveAttribute('data-slot', 'dropdown-menu-sub')
    expect(screen.getByTestId('dd-sub-trigger')).toHaveAttribute('data-slot', 'dropdown-menu-sub-trigger')
    expect(screen.getByTestId('dd-sub-trigger')).toHaveAttribute('data-inset', 'true')
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument()
    expect(screen.getByTestId('dd-sub-content')).toHaveAttribute('data-slot', 'dropdown-menu-sub-content')
    expect(screen.getByTestId('dd-sub-content')).toHaveClass('sub-content-extra')

    rerender(
      <DropdownMenu>
        <DropdownMenuContent sideOffset={10} />
      </DropdownMenu>
    )
    expect(screen.getByTestId('dd-content')).toHaveAttribute('data-side-offset', '10')
  })

  test('Input, Label and Progress render and apply computed values', () => {
    const { rerender } = render(
      <div>
        <Input type="email" className="input-extra" placeholder="you@example.com" />
        <Label className="label-extra">Email</Label>
        <Progress value={35} className="progress-extra" />
      </div>
    )

    const input = screen.getByPlaceholderText('you@example.com')
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveClass('input-extra')

    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('data-slot', 'label')
    expect(label).toHaveClass('label-extra')

    const progress = screen.getByTestId('radix-progress-root')
    const indicator = screen.getByTestId('radix-progress-indicator') as HTMLElement
    expect(progress).toHaveAttribute('data-slot', 'progress')
    expect(progress).toHaveClass('progress-extra')
    expect(indicator).toHaveAttribute('data-slot', 'progress-indicator')
    expect(indicator.style.transform).toBe('translateX(-65%)')

    rerender(<Progress />)
    expect((screen.getByTestId('radix-progress-indicator') as HTMLElement).style.transform).toBe('translateX(-100%)')
  })
})
