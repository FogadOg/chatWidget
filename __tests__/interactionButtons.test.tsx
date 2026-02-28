'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InteractionButtons, { ButtonType } from '../components/InteractionButtons';

describe('InteractionButtons component', () => {
  const defaultProps = {
    buttons: [] as ButtonType[],
    clickedButtons: new Set<string>(),
    onButtonClick: jest.fn(),
    primaryColor: '#000',
    buttonBorderRadius: 4,
    fontStyles: {},
  };

  it('displays action text when label is missing', () => {
    const props = {
      ...defaultProps,
      buttons: [{ id: 'b1', action: '/foo', label: '' }],
    } as unknown as typeof defaultProps;
    render(<InteractionButtons {...props} />);
    expect(screen.getByRole('button')).toHaveTextContent('/foo');
  });

  it('uses label when present', () => {
    const props = {
      ...defaultProps,
      buttons: [{ id: 'b2', action: '/bar', label: 'Label' }],
    } as unknown as typeof defaultProps;
    render(<InteractionButtons {...props} />);
    expect(screen.getByRole('button')).toHaveTextContent('Label');
  });
});
