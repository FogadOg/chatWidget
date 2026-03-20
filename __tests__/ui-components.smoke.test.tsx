import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import all UI primitives
import Button, { Button as NamedButton } from '../components/ui/button';
import Collapsible, { CollapsibleTrigger, CollapsibleContent } from '../components/ui/collapsible';
import Command, { CommandInput, CommandList, CommandItem } from '../components/ui/command';
import Dialog, { DialogContent, DialogTrigger, DialogTitle } from '../components/ui/dialog';
import DropdownMenu, { DropdownMenuItem, DropdownMenuContent } from '../components/ui/dropdown-menu';
import HoverCard, { HoverCardContent, HoverCardTrigger } from '../components/ui/hover-card';
import InputGroup, { InputGroupAddon, InputGroupButton, InputGroupTextarea } from '../components/ui/input-group';
import Progress from '../components/ui/progress';
import ScrollArea from '../components/ui/scroll-area';
import Select, { SelectTrigger, SelectValue, SelectItem } from '../components/ui/select';

describe('UI primitives smoke', () => {
  test('renders Button and named export', () => {
    const { getByText } = render(<Button>click</Button>);
    expect(getByText('click')).toBeTruthy();
    const { getByText: g2 } = render(<NamedButton>named</NamedButton>);
    expect(g2('named')).toBeTruthy();
  });

  test('renders Collapsible primitives', () => {
    const { getByText } = render(
      <Collapsible open>
        <CollapsibleTrigger>t</CollapsibleTrigger>
        <CollapsibleContent>c</CollapsibleContent>
      </Collapsible>
    );
    expect(getByText('t')).toBeTruthy();
    expect(getByText('c')).toBeTruthy();
  });

  test('renders Command primitives', () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="cmd" />
        <CommandList />
        <CommandItem>it</CommandItem>
      </Command>
    );
    expect(container).toBeTruthy();
  });

  test('renders Dialog primitives', () => {
    const { getByTestId } = render(
      <Dialog>
        <DialogContent>content</DialogContent>
        <DialogTitle>title</DialogTitle>
      </Dialog>
    );
    expect(getByTestId('dialog-content')).toBeTruthy();
  });

  test('renders DropdownMenu primitives', () => {
    const { getByText } = render(
      <DropdownMenu>
        <DropdownMenuContent />
        <DropdownMenuItem>choose</DropdownMenuItem>
      </DropdownMenu>
    );
    expect(getByText('choose')).toBeTruthy();
  });

  test('renders HoverCard primitives', () => {
    const { getByText } = render(
      <HoverCard>
        <HoverCardTrigger>t</HoverCardTrigger>
        <HoverCardContent>c</HoverCardContent>
      </HoverCard>
    );
    expect(getByText('t')).toBeTruthy();
    expect(getByText('c')).toBeTruthy();
  });

  test('renders InputGroup primitives', () => {
    const { getByPlaceholderText } = render(
      <InputGroup>
        <InputGroupAddon>+</InputGroupAddon>
        <InputGroupTextarea placeholder="ta" />
      </InputGroup>
    );
    expect(getByPlaceholderText('ta')).toBeTruthy();
  });

  test('renders Progress', () => {
    const { getByTestId } = render(<Progress value={50} />);
    expect(getByTestId('progress')).toHaveAttribute('data-value', '50');
  });

  test('renders ScrollArea', () => {
    const { container } = render(<ScrollArea>sc</ScrollArea>);
    expect(container).toBeTruthy();
  });

  test('renders Select primitives', () => {
    const { getByText } = render(
      <Select>
        <SelectTrigger>tr</SelectTrigger>
        <SelectValue>val</SelectValue>
        <SelectItem>it</SelectItem>
      </Select>
    );
    expect(getByText('val')).toBeTruthy();
    expect(getByText('it')).toBeTruthy();
  });
});
