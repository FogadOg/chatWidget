/**
 * @jest-environment jsdom
 */

import React from "react"
import { fireEvent, render } from "@testing-library/react"

// Mock controllable state hook to behave predictably in tests
jest.mock("@radix-ui/react-use-controllable-state", () => ({
  useControllableState: ({ prop, defaultProp, onChange }: any) => {
    const React = require("react")
    const [state, setState] = React.useState(prop ?? defaultProp)
    const setter = (v: any) => {
      setState(v)
      if (onChange) onChange(v)
    }
    return [state, setter]
  },
}))

// Simple UI primitives mocks: Collapsible will inject onClick handler onto trigger
jest.mock("@/components/ui/collapsible", () => {
  const React = require("react")

  const Collapsible = ({ children, open, onOpenChange }: any) => {
    // find trigger (button with data-testid 'cot-trigger') and attach click handler
    const processed = React.Children.map(children, (child: any) => {
      if (React.isValidElement(child) && child.props["data-testid"] === "cot-trigger") {
        return React.cloneElement(child, {
          onClick: () => onOpenChange && onOpenChange(!open),
        })
      }
      return child
    })

    return React.createElement("div", { "data-testid": "collapsible", "data-open": String(open) }, processed)
  }

  const CollapsibleTrigger = ({ children, ...props }: any) => {
    const { open } = props as any
    const attrs: any = { "data-testid": "cot-trigger", ...props }
    if (typeof open !== "undefined") {
      attrs["data-state"] = open ? "open" : "closed"
      attrs["aria-expanded"] = String(!!open)
    }
    return React.createElement("button", attrs, children)
  }

  const CollapsibleContent = ({ children, ...props }: any) => {
    return React.createElement("div", { "data-testid": "cot-content", ...props }, children)
  }

  return { __esModule: true, Collapsible, CollapsibleTrigger, CollapsibleContent }
}, { virtual: true })

jest.mock("@/components/ui/badge", () => ({ Badge: ({ children, ...p }: any) => <span {...p}>{children}</span> }), { virtual: true })

jest.mock("lucide-react", () => ({
  __esModule: true,
  BrainIcon: (p: any) => <svg data-testid="brain" {...p} />,
  ChevronDownIcon: (p: any) => <svg data-testid="chev" {...p} />,
  DotIcon: (p: any) => <svg data-testid="dot" {...p} />,
}))

import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "../src/components/ai-elements/chain-of-thought"

test("useChainOfThought throws when used outside provider (header)", () => {
  // rendering header without ChainOfThought provider should throw
  expect(() => render(<ChainOfThoughtHeader />)).toThrow(
    /ChainOfThought components must be used within ChainOfThought/
  )
})

test("ChainOfThought provides context and toggles open state via trigger", () => {
  const { getByText, getByRole } = render(
    <ChainOfThought>
      <ChainOfThoughtHeader />
      <ChainOfThoughtContent>
        <div>Details</div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  )

  // header text present
  expect(getByText("Chain of Thought")).toBeTruthy()

  const trigger = getByRole("button")
  // initially closed
  expect(trigger.getAttribute("aria-expanded") || trigger.getAttribute("data-state")).toMatch(/false|closed/)

  fireEvent.click(trigger)

  // after click, it should report open
  expect(trigger.getAttribute("aria-expanded") || trigger.getAttribute("data-state")).toMatch(/true|open/)

  // note: some Collapsible implementations render content with a `hidden` attribute
  // even when the trigger reports expanded; we assert the trigger open-state above
})

test("ChainOfThoughtStep renders label, description and children", () => {
  const { getByText, getByTestId } = render(
    <ChainOfThought>
      <ChainOfThoughtStep label={<span>Step A</span>} description={<em>desc</em>}>
        <div>extra</div>
      </ChainOfThoughtStep>
    </ChainOfThought>
  )

  expect(getByText("Step A")).toBeTruthy()
  expect(getByText("desc")).toBeTruthy()
  expect(getByText("extra")).toBeTruthy()
  expect(getByTestId("dot")).toBeTruthy()
})
