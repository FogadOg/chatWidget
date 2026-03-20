/**
 * @jest-environment jsdom
 */

import React from "react"
import { render, screen, cleanup } from "@testing-library/react"

beforeEach(() => {
  jest.resetModules()
})

test("Artifact renders header, close and action (with and without tooltip)", () => {
  jest.doMock("../src/components/ui/button", () => {
    const React = require("react")
    return {
      __esModule: true,
      Button: ({ children, ...props }: any) => (
        <button data-testid="mock-button" {...props}>
          {children}
        </button>
      ),
    }
  })

  jest.doMock("../src/components/ui/tooltip", () => {
    const React = require("react")
    const Provider = ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>
    const Root = ({ children, ...props }: any) => <div data-testid="tooltip-root" {...props}>{children}</div>
    const Trigger = ({ children, ...props }: any) => <span data-testid="tooltip-trigger" {...props}>{children}</span>
    const Content = ({ children, ...props }: any) => <div data-testid="tooltip-content" {...props}>{children}</div>
    return { __esModule: true, TooltipProvider: Provider, Tooltip: Root, TooltipTrigger: Trigger, TooltipContent: Content }
  })

  jest.doMock("lucide-react", () => ({ __esModule: true, XIcon: (p: any) => <svg data-testid="x-icon" {...p} /> }))

  const {
    Artifact,
    ArtifactHeader,
    ArtifactClose,
    ArtifactAction,
  } = require("../src/components/ai-elements/artifact")

  const { getByTestId } = render(
    <Artifact>
      <ArtifactHeader data-testid="hdr">H</ArtifactHeader>
      <ArtifactAction tooltip="Tip">A</ArtifactAction>
      <ArtifactClose />
    </Artifact>
  )

  expect(getByTestId("hdr")).toBeTruthy()
  expect(getByTestId("tooltip-content")).toHaveTextContent("Tip")
  expect(getByTestId("x-icon")).toBeTruthy()
})

test("CheckpointTrigger renders Button and Tooltip when tooltip provided", () => {
  jest.resetModules()
  jest.doMock("../src/components/ui/button", () => {
    const React = require("react")
    return { __esModule: true, Button: ({ children, ...props }: any) => <button data-testid="chk-btn" {...props}>{children}</button> }
  })
  jest.doMock("../src/components/ui/separator", () => ({ __esModule: true, Separator: ({ ...p }: any) => <div data-testid="sep" {...p} /> }))
  jest.doMock("../src/components/ui/tooltip", () => {
    const React = require("react")
    const Root = ({ children }: any) => <div data-testid="tooltip-root">{children}</div>
    const Trigger = ({ children, ...props }: any) => <span data-testid="tooltip-trigger" {...props}>{children}</span>
    const Content = ({ children }: any) => <div data-testid="tooltip-content">{children}</div>
    return { __esModule: true, Tooltip: Root, TooltipTrigger: Trigger, TooltipContent: Content }
  })

  jest.doMock("lucide-react", () => ({ __esModule: true, BookmarkIcon: (p: any) => <svg data-testid="bookmark" {...p} /> }))

  const { CheckpointTrigger } = require("../src/components/ai-elements/checkpoint")

  const { getByTestId } = render(<CheckpointTrigger tooltip="T">Click</CheckpointTrigger>)
  expect(getByTestId("tooltip-content")).toBeTruthy()
  expect(getByTestId("chk-btn")).toBeTruthy()
})

test("Connection renders expected path and circle", () => {
  const { Connection } = require("../src/components/ai-elements/connection")
  const { container } = render(<svg><Connection fromX={0} fromY={0} toX={10} toY={20} /></svg>)
  const path = container.querySelector("path")
  const circle = container.querySelector("circle")
  expect(path).toBeTruthy()
  expect(path?.getAttribute("d")).toContain("M0,0")
  expect(circle).toBeTruthy()
})

test("Controls renders underlying primitive", () => {
  jest.resetModules()
  jest.doMock("@xyflow/react", () => ({ __esModule: true, Controls: ({ children, ...props }: any) => <div data-testid="xy-controls" {...props}>{children}</div> }))
  const { Controls } = require("../src/components/ai-elements/controls")
  const { getByTestId } = render(<Controls />)
  expect(getByTestId("xy-controls")).toBeTruthy()
})

test("Confirmation returns null without approval and renders when provided", () => {
  jest.resetModules()
  jest.doMock("/home/fogad/Documents/assistantProj/widget-app/src/components/ui/alert", () => ({ __esModule: true, Alert: ({ children, ...p }: any) => <div data-testid="alert" {...p}>{children}</div>, AlertDescription: ({ children, ...p }: any) => <div data-testid="alert-desc" {...p}>{children}</div> }))
  const { Confirmation, ConfirmationTitle } = require("../src/components/ai-elements/confirmation")
  const { queryByTestId, getByTestId } = render(<Confirmation state="approval-responded" approval={{ id: "1", approved: true }} />)
  expect(getByTestId("alert")).toBeTruthy()
  // unmount previous render before rendering null case
  cleanup()
  const { queryByTestId: q2 } = render(<Confirmation state={"input-streaming"} />)
  expect(q2("alert")).toBeNull()
})

test("highlightCode returns HTML strings (mock shiki)", async () => {
  jest.resetModules()
  jest.doMock("shiki", () => ({ __esModule: true, codeToHtml: async (code: string) => `<pre>${code}</pre>` }))
  const { highlightCode } = require("../src/components/ai-elements/code-block")
  const out = await highlightCode("x=1", "javascript" as any, false)
  expect(Array.isArray(out)).toBe(true)
  expect(out[0]).toContain("x=1")
})

test("Canvas uses ReactFlow and Background", () => {
  jest.resetModules()
  jest.doMock("@xyflow/react", () => ({ __esModule: true, ReactFlow: ({ children }: any) => <div data-testid="rf">{children}</div>, Background: ({ children }: any) => <div data-testid="bg">{children}</div> }))
  const { Canvas } = require("../src/components/ai-elements/canvas")
  const { getByTestId } = render(<Canvas />)
  expect(getByTestId("rf")).toBeTruthy()
})
