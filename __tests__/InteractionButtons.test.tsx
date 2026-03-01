import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import InteractionButtons, { ButtonType } from '../components/InteractionButtons';

describe('InteractionButtons component', () => {
  const baseProps = {
    primaryColor: '#111',
    buttonBorderRadius: 4,
    fontStyles: {},
  };

  it('uses getLocalizedText when provided and returns value', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b1', label: { en: 'hi' }, action: 'act' };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set()}
        onButtonClick={cb}
        getLocalizedText={() => 'localized'}
      />
    );
    const btn = screen.getByText('localized');
    btn.click();
    expect(cb).toHaveBeenCalledWith(button);
  });

  it('renders string label directly', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b2', label: 'simple' };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set()}
        onButtonClick={cb}
      />
    );
    const btn = screen.getByText('simple');
    btn.click();
    expect(cb).toHaveBeenCalledWith(button);
  });

  it('prefers .en property when label object', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b3', label: { en: 'English', fr: 'Francais' } };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set()}
        onButtonClick={cb}
      />
    );
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('falls back to first value of label object when no .en', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b4', label: { fr: 'Bonjour', es: 'Hola' } };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set()}
        onButtonClick={cb}
      />
    );
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
  });

  it('uses action when label missing', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b5', action: 'doSomething' };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set()}
        onButtonClick={cb}
      />
    );
    expect(screen.getByText('doSomething')).toBeInTheDocument();
  });

  it('falls back to "Button" when nothing else available', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b6' };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set()}
        onButtonClick={cb}
      />
    );
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('disables button when clickedButtons contains id', () => {
    const cb = jest.fn();
    const button: ButtonType = { id: 'b7', label: 'Disabled' };
    render(
      <InteractionButtons
        {...baseProps}
        buttons={[button]}
        clickedButtons={new Set(['b7'])}
        onButtonClick={cb}
      />
    );
    const btn = screen.getByText('Disabled');
    expect(btn).toBeDisabled();
    btn.click();
    expect(cb).not.toHaveBeenCalled();
  });
});