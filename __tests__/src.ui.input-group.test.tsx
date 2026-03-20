/**
 * @jest-environment jsdom
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"

beforeEach(() => {
  jest.resetModules()
})

test("InputGroupAddon click focuses input when not clicking a button", () => {
  jest.doMock("../src/components/ui/input", () => {
    const React = require("react")
    return {
      __esModule: true,
      Input: ({ className, ...props }: any) => (
        <input data-testid="mock-input" className={className} {...props} />
      ),
    }
  })

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

  jest.doMock("../src/components/ui/textarea", () => {
    const React = require("react")
    return {
      __esModule: true,
      Textarea: ({ className, ...props }: any) => (
        <textarea data-testid="mock-textarea" className={className} {...props} />
      ),
    }
  })

  const {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
  } = require("../src/components/ui/input-group")

  render(
    <InputGroup>
      <InputGroupAddon data-testid="addon">Prefix</InputGroupAddon>
      <InputGroupInput />
    </InputGroup>
  )

  const input = screen.getByTestId("mock-input")
  const addon = screen.getByTestId("addon")

  expect(document.activeElement).not.toBe(input)
  fireEvent.click(addon)
  expect(document.activeElement).toBe(input)
})

test("InputGroupAddon clicking a button inside does not focus input", () => {
  jest.doMock("../src/components/ui/input", () => {
    const React = require("react")
    return {
      __esModule: true,
      Input: ({ className, ...props }: any) => (
        <input data-testid="mock-input" className={className} {...props} />
      ),
    }
  })

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

  jest.doMock("../src/components/ui/textarea", () => {
    const React = require("react")
    return {
      __esModule: true,
      Textarea: ({ className, ...props }: any) => (
        <textarea data-testid="mock-textarea" className={className} {...props} />
      ),
    }
  })

  const {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
  } = require("../src/components/ui/input-group")

  render(
    <InputGroup>
      <InputGroupAddon data-testid="addon">
        <button data-testid="child-btn">Click</button>
      </InputGroupAddon>
      <InputGroupInput />
    </InputGroup>
  )

  const input = screen.getByTestId("mock-input")
  const childBtn = screen.getByTestId("child-btn")

  fireEvent.click(childBtn)
  expect(document.activeElement).not.toBe(input)
})

test("InputGroupText renders content and merges className", () => {
  const { InputGroupText } = require("../src/components/ui/input-group")
  const { container } = render(
    <InputGroupText className="extra">Label</InputGroupText>
  )
  const span = container.querySelector("span")
  expect(span).toBeTruthy()
  expect(span).toHaveTextContent("Label")
  expect(span).toHaveClass("extra")
})

test("InputGroupInput and Textarea pass data-slot attribute to underlying control", () => {
  jest.doMock("../src/components/ui/input", () => {
    const React = require("react")
    return {
      __esModule: true,
      Input: ({ className, ...props }: any) => (
        <input data-testid="mock-input" className={className} {...props} />
      ),
    }
  })

  jest.doMock("../src/components/ui/textarea", () => {
    const React = require("react")
    return {
      __esModule: true,
      Textarea: ({ className, ...props }: any) => (
        <textarea data-testid="mock-textarea" className={className} {...props} />
      ),
    }
  })

  const { InputGroupInput, InputGroupTextarea } = require("../src/components/ui/input-group")

  const { getByTestId } = render(
    <>
      <InputGroupInput />
      <InputGroupTextarea />
    </>
  )

  expect(getByTestId("mock-input").getAttribute("data-slot")).toBe(
    "input-group-control"
  )
  expect(getByTestId("mock-textarea").getAttribute("data-slot")).toBe(
    "input-group-control"
  )
})
