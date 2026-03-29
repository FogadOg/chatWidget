import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import DynamicIcon from '../src/components/DynamicIcon'

test('mounted async branch: renders fallback first, then resolved icon', async () => {
  const AsyncIcon = (props: any) => React.createElement('svg', { 'data-testid': 'dynamic-icon', ...props })

  let resolveImporter: (value: any) => void
  const importer = () => new Promise((resolve) => {
    resolveImporter = resolve
  })

  render(
    <DynamicIcon
      name="Any"
      importer={importer}
      forceAsync
      className="my-icon"
      fallback={<span data-testid="icon-fallback">loading</span>}
    />,
  )

  expect(screen.getByTestId('icon-fallback')).toBeInTheDocument()

  resolveImporter!({ Any: AsyncIcon })

  await waitFor(() => expect(screen.getByTestId('dynamic-icon')).toBeInTheDocument())

  expect(screen.queryByTestId('icon-fallback')).not.toBeInTheDocument()
  expect(screen.getByTestId('dynamic-icon')).toHaveClass('my-icon')
})
