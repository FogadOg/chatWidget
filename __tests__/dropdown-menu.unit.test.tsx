import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DropdownMenuItem } from '../components/ui/dropdown-menu';

test('DropdownMenuItem calls onSelect with preventDefault and nativeEvent', () => {
  const onSelect = jest.fn();
  const { getByText } = render(<DropdownMenuItem onSelect={onSelect}>choose me</DropdownMenuItem>);
  const el = getByText('choose me');

  fireEvent.click(el);

  expect(onSelect).toHaveBeenCalled();
  const arg = onSelect.mock.calls[0][0];
  expect(typeof arg.preventDefault).toBe('function');
  expect(arg.nativeEvent).toBeDefined();
  // nativeEvent should be a click-like event
  expect(arg.nativeEvent.type).toBe('click');
});

test('DropdownMenuItem without onSelect does not throw on click', () => {
  const { getByText } = render(<DropdownMenuItem>no handler</DropdownMenuItem>);
  const el = getByText('no handler');
  expect(() => fireEvent.click(el)).not.toThrow();
});
