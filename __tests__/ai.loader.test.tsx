/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

import { Loader } from "../src/components/ai-elements/loader"

test("Loader renders spinning wrapper and icon with default size", () => {
  const { container } = render(<Loader />)
  const wrapper = container.querySelector("div")
  const svg = container.querySelector("svg")

  expect(wrapper).toBeTruthy()
  expect(wrapper?.className).toContain("animate-spin")
  expect(svg).toBeTruthy()
  expect(svg?.getAttribute("width")).toBe("16")
  expect(svg?.getAttribute("height")).toBe("16")
})

test("Loader respects custom size and className", () => {
  const { container } = render(<Loader className="extra-loader" size={24} />)
  const wrapper = container.querySelector("div")
  const svg = container.querySelector("svg")

  expect(wrapper?.className).toContain("extra-loader")
  expect(svg?.getAttribute("width")).toBe("24")
  expect(svg?.getAttribute("height")).toBe("24")
})
