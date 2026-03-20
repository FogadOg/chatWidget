/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

beforeEach(() => {
  jest.resetModules()
})

test("Tooltip renders slots and arrow", () => {
  jest.doMock("@radix-ui/react-tooltip", () => {
    const React = require("react")
    const Provider = ({ children, delayDuration, ...props }: any) => (
      <div data-testid="radix-provider" {...props}>
        {children}
      </div>
    )
    const Root = ({ children, ...props }: any) => {
      const { sideOffset, ...rest } = props
      return (
        <div data-testid="radix-root" {...rest}>
          {children}
        </div>
      )
    }
    const Trigger = ({ children, ...props }: any) => (
      <button data-testid="radix-trigger" {...props}>
        {children}
      </button>
    )
    const Content = ({ children, sideOffset, ...props }: any) => (
      <div data-testid="radix-content" {...props}>
        {children}
      </div>
    )
    const Portal = ({ children }: any) => <div data-testid="radix-portal">{children}</div>
    const Arrow = ({ className }: any) => (
      <div data-testid="radix-arrow" className={className} />
    )
    return {
      __esModule: true,
      Provider,
      Root,
      Trigger,
      Content,
      Portal,
      Arrow,
    }
  })

  const { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } = require(
    "../src/components/ui/tooltip"
  )

  const { getByTestId } = render(
    <Tooltip>
      <TooltipTrigger>Open</TooltipTrigger>
      <TooltipContent>Help</TooltipContent>
    </Tooltip>
  )

  expect(getByTestId("radix-root").getAttribute("data-slot")).toBe("tooltip")
  expect(getByTestId("radix-trigger")).toBeTruthy()
  expect(getByTestId("radix-content")).toBeTruthy()
  expect(getByTestId("radix-arrow")).toBeTruthy()
})
