/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("../src/components/ui/button", () => ({
  __esModule: true,
  Button: ({ children, ...props }: any) => <button data-testid="plan-button" {...props}>{children}</button>,
}))

jest.mock("../src/components/ui/card", () => ({
  __esModule: true,
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardAction: ({ children, ...props }: any) => <div data-testid="card-action" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p data-testid="card-description" {...props}>{children}</p>,
  CardFooter: ({ children, ...props }: any) => <div data-testid="card-footer" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

jest.mock("../src/components/ui/collapsible", () => {
  const React = require("react")
  return {
    __esModule: true,
    Collapsible: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) return React.cloneElement(children, props)
      return <div data-testid="collapsible" {...props}>{children}</div>
    },
    CollapsibleContent: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) return React.cloneElement(children, props)
      return <div data-testid="collapsible-content" {...props}>{children}</div>
    },
    CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) return React.cloneElement(children, props)
      return <button data-testid="collapsible-trigger" {...props}>{children}</button>
    },
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  ChevronsUpDownIcon: (props: any) => <svg data-testid="chevrons" {...props} />,
}))

jest.mock("../src/components/ai-elements/shimmer", () => ({
  __esModule: true,
  Shimmer: ({ children }: any) => <span data-testid="shimmer">{children}</span>,
}))

import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "../src/components/ai-elements/plan"

test("Plan renders streaming shimmer and trigger", () => {
  const { getAllByTestId, getByTestId, getByText } = render(
    <Plan isStreaming>
      <PlanHeader>
        <PlanTitle>My Plan</PlanTitle>
        <PlanAction>Action</PlanAction>
      </PlanHeader>
      <PlanContent>
        <PlanDescription>Doing work</PlanDescription>
      </PlanContent>
      <PlanFooter>
        <PlanTrigger />
      </PlanFooter>
    </Plan>
  )

  expect(getAllByTestId("shimmer").length).toBe(2)
  expect(getByText("Action")).toBeTruthy()
  expect(getByTestId("plan-button")).toBeTruthy()
  expect(getByTestId("chevrons")).toBeTruthy()
})

test("PlanTitle throws outside Plan provider", () => {
  expect(() => render(<PlanTitle>No context</PlanTitle>)).toThrow(
    "Plan components must be used within Plan"
  )
})
