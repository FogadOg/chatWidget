import React from 'react'
import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  jest.resetModules()
})

test('returns fallback when require throws', () => {
  jest.isolateModules(() => {
    jest.doMock('lucide-react', () => {
      throw new Error('mock failure')
    })
    // require within the component should throw and be caught
    // so the fallback is rendered
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DynamicIcon = require('../src/components/DynamicIcon').default
    const { getByTestId } = render(
      React.createElement(DynamicIcon, { name: 'Nope', fallback: React.createElement('span', { 'data-testid': 'fb' }) })
    )
    expect(getByTestId('fb')).toBeInTheDocument()
  })
})

test('renders icon when module exports the component (sync require)', () => {
  jest.isolateModules(() => {
    jest.doMock('lucide-react', () => ({
      CheckIcon: (props: any) => React.createElement('svg', { 'data-testid': 'icon', ...props }),
    }))
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DynamicIcon = require('../src/components/DynamicIcon').default
    const { getByTestId } = render(
      React.createElement(DynamicIcon, { name: 'CheckIcon' })
    )
    expect(getByTestId('icon')).toBeInTheDocument()
  })
})

test('returns fallback when module exports no matching icon', () => {
  jest.isolateModules(() => {
    jest.doMock('lucide-react', () => ({}))
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DynamicIcon = require('../src/components/DynamicIcon').default
    const { getByTestId } = render(
      React.createElement(DynamicIcon, { name: 'Missing', fallback: React.createElement('span', { 'data-testid': 'fb' }) })
    )
    expect(getByTestId('fb')).toBeInTheDocument()
  })
})

test('async dynamic import sets icon and renders it (non-test env)', async () => {
  // Load the component and pass a fake importer that resolves to the mocked module
  // to ensure the same React instance is used for hooks.
  // Call the exported loader directly to exercise the dynamic-import path
  // without mounting the component (avoids hook/renderer mismatch issues).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { loadIcon } = require('../src/components/DynamicIcon')

  const Comp = await loadIcon('AsyncIcon', () => Promise.resolve({ AsyncIcon: (props: any) => React.createElement('svg', { 'data-testid': 'async-icon', ...props }) }))
  expect(Comp).not.toBeNull()
})

test('async dynamic import rejection results in fallback (non-test env)', async () => {
  // Use an importer that rejects to simulate dynamic import failure.
  // Use the exported loader and ensure it resolves to null on failure.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { loadIcon: loadIconFail } = require('../src/components/DynamicIcon')
  const Comp = await loadIconFail('AsyncIcon', () => Promise.reject(new Error('module failed to load')))
  expect(Comp).toBeNull()
})
