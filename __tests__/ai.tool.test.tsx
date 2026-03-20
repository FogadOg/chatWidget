/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("../src/components/ui/badge", () => ({
  __esModule: true,
  Badge: ({ children, ...props }: any) => <div data-testid="badge" {...props}>{children}</div>,
}))

jest.mock("../src/components/ui/collapsible", () => {
  const React = require("react")
  return {
    __esModule: true,
    Collapsible: ({ children, ...props }: any) => <div data-testid="collapsible" {...props}>{children}</div>,
    CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props)
      }
      return <button data-testid="collapsible-trigger" {...props}>{children}</button>
    },
    CollapsibleContent: ({ children, ...props }: any) => <div data-testid="collapsible-content" {...props}>{children}</div>,
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  CheckCircleIcon: (p: any) => <svg data-testid="check-circle" {...p} />,
  ChevronDownIcon: (p: any) => <svg data-testid="chev" {...p} />,
  CircleIcon: (p: any) => <svg data-testid="circle" {...p} />,
  ClockIcon: (p: any) => <svg data-testid="clock" {...p} />,
  WrenchIcon: (p: any) => <svg data-testid="wrench" {...p} />,
  XCircleIcon: (p: any) => <svg data-testid="x-circle" {...p} />,
}))

jest.mock("../src/components/ai-elements/code-block", () => ({
  __esModule: true,
  CodeBlock: ({ code }: any) => <pre data-testid="code-block">{code}</pre>,
}))

import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "../src/components/ai-elements/tool"

test("Tool header/input/output render expected content", () => {
  const { getByText, getAllByTestId } = render(
    <Tool>
      <ToolHeader type="tool-search" state="output-available" />
      <ToolContent>
        <ToolInput input={{ q: "weather" }} />
        <ToolOutput output={{ ok: true }} errorText={undefined as any} />
      </ToolContent>
    </Tool>
  )

  expect(getByText("search")).toBeTruthy()
  expect(getByText("Completed")).toBeTruthy()
  expect(getByText("Parameters")).toBeTruthy()
  expect(getAllByTestId("code-block").length).toBeGreaterThan(0)
})

test("ToolOutput handles string output and error text", () => {
  const { getByText } = render(
    <div>
      <ToolOutput output={"plain text" as any} errorText={undefined as any} />
      <ToolOutput output={undefined as any} errorText={"failed" as any} />
    </div>
  )

  expect(getByText("Result")).toBeTruthy()
  expect(getByText("Error")).toBeTruthy()
  expect(getByText("failed")).toBeTruthy()
})
