/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  Position: { Bottom: "bottom" },
  NodeToolbar: ({ children, position, ...props }: any) => (
    <div data-testid="node-toolbar" data-position={position} {...props}>
      {children}
    </div>
  ),
}))

import { Toolbar } from "../src/components/ai-elements/toolbar"

test("Toolbar renders NodeToolbar with bottom position and merged classes", () => {
  const { getByTestId } = render(<Toolbar className="extra">Actions</Toolbar>)
  const toolbar = getByTestId("node-toolbar")

  expect(toolbar).toBeTruthy()
  expect(toolbar.getAttribute("data-position")).toBe("bottom")
  expect(toolbar.className).toContain("extra")
  expect(toolbar).toHaveTextContent("Actions")
})
