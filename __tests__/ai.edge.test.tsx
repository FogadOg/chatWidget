/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

let mockSourceNode: any
let mockTargetNode: any

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  Position: {
    Left: "left",
    Right: "right",
    Top: "top",
    Bottom: "bottom",
  },
  BaseEdge: ({ id, path, style, markerEnd, className }: any) => (
    <div
      data-testid="base-edge"
      data-id={id}
      data-path={path}
      data-marker={markerEnd}
      data-class={className}
      data-dash={style?.strokeDasharray}
    />
  ),
  getSimpleBezierPath: () => ["M0,0 C1,1 2,2 3,3"],
  getBezierPath: () => ["M10,10 C20,20 30,30 40,40"],
  useInternalNode: (nodeId: string) => {
    if (nodeId === "source") return mockSourceNode
    if (nodeId === "target") return mockTargetNode
    return undefined
  },
}))

import { Edge } from "../src/components/ai-elements/edge"

test("Edge.Temporary renders dashed BaseEdge", () => {
  const { getByTestId } = render(
    <svg>
      <Edge.Temporary
        id="temp1"
        sourceX={0}
        sourceY={0}
        targetX={10}
        targetY={10}
        sourcePosition={"right" as any}
        targetPosition={"left" as any}
      />
    </svg>
  )

  const edge = getByTestId("base-edge")
  expect(edge.getAttribute("data-id")).toBe("temp1")
  expect(edge.getAttribute("data-dash")).toBe("5, 5")
})

test("Edge.Animated returns null when nodes are missing", () => {
  mockSourceNode = undefined
  mockTargetNode = undefined

  const { container } = render(
    <svg>
      <Edge.Animated id="a1" source="source" target="target" />
    </svg>
  )

  expect(container.querySelector('[data-testid="base-edge"]')).toBeNull()
})

test("Edge.Animated renders edge and moving circle when nodes exist", () => {
  mockSourceNode = {
    internals: {
      positionAbsolute: { x: 0, y: 0 },
      handleBounds: {
        source: [{ position: "right", x: 10, y: 10, width: 4, height: 4 }],
        target: [{ position: "left", x: 2, y: 2, width: 4, height: 4 }],
      },
    },
  }
  mockTargetNode = {
    internals: {
      positionAbsolute: { x: 100, y: 100 },
      handleBounds: {
        source: [{ position: "right", x: 10, y: 10, width: 4, height: 4 }],
        target: [{ position: "left", x: 2, y: 2, width: 4, height: 4 }],
      },
    },
  }

  const { getByTestId, container } = render(
    <svg>
      <Edge.Animated
        id="anim1"
        source="source"
        target="target"
        markerEnd="url(#arrow)"
        style={{ stroke: "red" }}
      />
    </svg>
  )

  expect(getByTestId("base-edge")).toBeTruthy()
  expect(container.querySelector("circle")).toBeTruthy()
  expect(container.querySelector("animateMotion")).toBeTruthy()
})
