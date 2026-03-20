/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("../src/components/ui/card", () => ({
  __esModule: true,
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardAction: ({ children, ...props }: any) => <div data-testid="card-action" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div data-testid="card-description" {...props}>{children}</div>,
  CardFooter: ({ children, ...props }: any) => <div data-testid="card-footer" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>,
}))

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  Position: { Left: "left", Right: "right" },
  Handle: ({ type, position }: any) => <div data-testid={`handle-${type}-${position}`} />,
}))

import {
  Node,
  NodeAction,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "../src/components/ai-elements/node"

test("Node renders handles and card subcomponents", () => {
  const { getByTestId, getByText } = render(
    <Node handles={{ target: true, source: true }}>
      <NodeHeader>
        <NodeTitle>Title</NodeTitle>
        <NodeAction>Action</NodeAction>
      </NodeHeader>
      <NodeContent>
        <NodeDescription>Description</NodeDescription>
      </NodeContent>
      <NodeFooter>Footer</NodeFooter>
    </Node>
  )

  expect(getByTestId("handle-target-left")).toBeTruthy()
  expect(getByTestId("handle-source-right")).toBeTruthy()
  expect(getByText("Title")).toBeTruthy()
  expect(getByText("Description")).toBeTruthy()
  expect(getByText("Footer")).toBeTruthy()
})
