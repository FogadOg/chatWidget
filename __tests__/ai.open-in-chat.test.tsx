/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("../src/components/ui/button", () => ({
  __esModule: true,
  Button: ({ children, ...props }: any) => <button data-testid="openin-button" {...props}>{children}</button>,
}))

jest.mock("../src/components/ui/dropdown-menu", () => {
  const React = require("react")
  return {
    __esModule: true,
    DropdownMenu: ({ children, ...props }: any) => <div data-testid="dd-root" {...props}>{children}</div>,
    DropdownMenuContent: ({ children, ...props }: any) => <div data-testid="dd-content" {...props}>{children}</div>,
    DropdownMenuItem: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) return React.cloneElement(children, props)
      return <div data-testid="dd-item" {...props}>{children}</div>
    },
    DropdownMenuLabel: ({ children, ...props }: any) => <div data-testid="dd-label" {...props}>{children}</div>,
    DropdownMenuSeparator: (props: any) => <hr data-testid="dd-sep" {...props} />,
    DropdownMenuTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) return React.cloneElement(children, props)
      return <button data-testid="dd-trigger" {...props}>{children}</button>
    },
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  ChevronDownIcon: (props: any) => <svg data-testid="chev-down" {...props} />,
  ExternalLinkIcon: (props: any) => <svg data-testid="ext-link" {...props} />,
  MessageCircleIcon: (props: any) => <svg data-testid="msg-circle" {...props} />,
}))

import {
  OpenIn,
  OpenInChatGPT,
  OpenInClaude,
  OpenInContent,
  OpenInCursor,
  OpenInLabel,
  OpenInScira,
  OpenInSeparator,
  OpenInT3,
  OpenInTrigger,
  OpenInv0,
} from "../src/components/ai-elements/open-in-chat"

test("OpenIn trigger default and provider links render", () => {
  const { getByText, getAllByTestId } = render(
    <OpenIn query="hello world">
      <OpenInTrigger />
      <OpenInContent>
        <OpenInLabel>Providers</OpenInLabel>
        <OpenInSeparator />
        <OpenInChatGPT />
        <OpenInClaude />
        <OpenInT3 />
        <OpenInScira />
        <OpenInv0 />
        <OpenInCursor />
      </OpenInContent>
    </OpenIn>
  )

  expect(getByText("Open in chat")).toBeTruthy()
  expect(getAllByTestId("ext-link").length).toBeGreaterThan(0)

  const chatgptAnchor = getByText("Open in ChatGPT").closest("a")
  expect(chatgptAnchor?.getAttribute("href")).toContain("chatgpt.com")

  const cursorAnchor = getByText("Open in Cursor").closest("a")
  expect(cursorAnchor?.getAttribute("href")).toContain("cursor.com/link/prompt")
})

test("OpenIn item throws outside provider", () => {
  expect(() => render(<OpenInChatGPT />)).toThrow(
    "OpenIn components must be used within an OpenIn provider"
  )
})
