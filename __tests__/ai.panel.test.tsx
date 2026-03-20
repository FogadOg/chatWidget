/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("@xyflow/react", () => ({
  __esModule: true,
  Panel: ({ children, ...props }: any) => <div data-testid="xy-panel" {...props}>{children}</div>,
}))

import { Panel } from "../src/components/ai-elements/panel"

test("Panel renders primitive with merged classes", () => {
  const { getByTestId } = render(<Panel className="extra">Body</Panel>)
  const panel = getByTestId("xy-panel")
  expect(panel).toBeTruthy()
  expect(panel).toHaveTextContent("Body")
  expect(panel).toHaveClass("extra")
})
