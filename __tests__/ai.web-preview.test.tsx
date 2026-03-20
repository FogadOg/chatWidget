/**
 * @jest-environment jsdom
 */

import React from "react"
import { fireEvent, render } from "@testing-library/react"

jest.mock("../src/components/ui/button", () => ({
  __esModule: true,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

jest.mock("../src/components/ui/input", () => ({
  __esModule: true,
  Input: (props: any) => <input data-testid="url-input" {...props} />,
}))

jest.mock("../src/components/ui/collapsible", () => {
  const React = require("react")
  return {
    __esModule: true,
    Collapsible: ({ children, onOpenChange, ...props }: any) => <div data-testid="collapsible" {...props}>{children}</div>,
    CollapsibleContent: ({ children, ...props }: any) => <div data-testid="collapsible-content" {...props}>{children}</div>,
    CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props)
      }
      return <button data-testid="collapsible-trigger" {...props}>{children}</button>
    },
  }
})

jest.mock("../src/components/ui/tooltip", () => {
  const React = require("react")
  return {
    __esModule: true,
    TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
    Tooltip: ({ children }: any) => <div data-testid="tooltip-root">{children}</div>,
    TooltipTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props)
      }
      return <span data-testid="tooltip-trigger" {...props}>{children}</span>
    },
    TooltipContent: ({ children, ...props }: any) => <div data-testid="tooltip-content" {...props}>{children}</div>,
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  ChevronDownIcon: (props: any) => <svg data-testid="chevron-down" {...props} />,
}))

import {
  WebPreview,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "../src/components/ai-elements/web-preview"

test("WebPreview URL enter updates iframe and calls onUrlChange", () => {
  const onUrlChange = jest.fn()

  const { getByTestId, getByTitle } = render(
    <WebPreview defaultUrl="https://start.test" onUrlChange={onUrlChange}>
      <WebPreviewNavigation>
        <WebPreviewNavigationButton tooltip="Back">B</WebPreviewNavigationButton>
        <WebPreviewUrl />
      </WebPreviewNavigation>
      <WebPreviewBody />
      <WebPreviewConsole />
    </WebPreview>
  )

  const input = getByTestId("url-input") as HTMLInputElement
  fireEvent.change(input, { target: { value: "https://example.com" } })
  fireEvent.keyDown(input, { key: "Enter" })

  expect(onUrlChange).toHaveBeenCalledWith("https://example.com")
  const iframe = getByTitle("Preview") as HTMLIFrameElement
  expect(iframe.getAttribute("src")).toBe("https://example.com")
  expect(getByTestId("tooltip-content")).toHaveTextContent("Back")
})

test("WebPreviewConsole renders logs", () => {
  const logs = [{ level: "error" as const, message: "Boom", timestamp: new Date("2025-01-01T00:00:00Z") }]
  const { getByText } = render(
    <WebPreview>
      <WebPreviewConsole logs={logs} />
    </WebPreview>
  )
  expect(getByText("Boom")).toBeTruthy()
})
