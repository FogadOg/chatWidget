/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("motion/react", () => ({
  motion: {
    p: ({ children, ...props }: any) => <p data-testid="motion-p" {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span data-testid="motion-span" {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>,
  },
}))

import { Shimmer } from "../src/components/ai-elements/shimmer"

test("Shimmer renders as default paragraph with computed spread", () => {
  const { getByTestId } = render(<Shimmer>Hello</Shimmer>)
  const p = getByTestId("motion-p")
  expect(p).toBeTruthy()
  expect(p).toHaveTextContent("Hello")
  // 5 chars * default spread 2
  expect((p as HTMLElement).style.getPropertyValue("--spread")).toBe("10px")
})

test("Shimmer renders as span and respects custom spread", () => {
  const { getByTestId } = render(
    <Shimmer as="span" spread={3} className="extra-shimmer">
      Test
    </Shimmer>
  )

  const span = getByTestId("motion-span")
  expect(span).toBeTruthy()
  expect(span).toHaveClass("extra-shimmer")
  // 4 chars * spread 3
  expect((span as HTMLElement).style.getPropertyValue("--spread")).toBe("12px")
})
