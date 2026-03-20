/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

beforeEach(() => {
  jest.resetModules()
})

test("ChainOfThought renders header, step, content and search result", () => {
  jest.doMock("../src/components/ui/badge", () => {
    const React = require("react")
    return {
      __esModule: true,
      Badge: ({ children, ...p }: any) => (
        <div data-testid="badge" {...p}>
          {children}
        </div>
      ),
    }
  })

  jest.doMock("../src/components/ui/collapsible", () => {
    const React = require("react")
    return {
      __esModule: true,
      Collapsible: ({ children }: any) => <div data-testid="collapsible">{children}</div>,
      CollapsibleTrigger: ({ children, ...p }: any) => (
        <button data-testid="collapsible-trigger" {...p}>
          {children}
        </button>
      ),
      CollapsibleContent: ({ children, ...p }: any) => (
        <div data-testid="collapsible-content" {...p}>
          {children}
        </div>
      ),
    }
  })

  // Mock radix controllable-state hook to avoid hook issues in tests
  jest.doMock("@radix-ui/react-use-controllable-state", () => ({
    useControllableState: (opts: any) => {
      const React = require("react")
      return React.useState(opts.defaultProp)
    },
  }))

  jest.doMock("lucide-react", () => ({
    __esModule: true,
    BrainIcon: (p: any) => <svg data-testid="brain" {...p} />,
    ChevronDownIcon: (p: any) => <svg data-testid="chev" {...p} />,
    DotIcon: (p: any) => <svg data-testid="dot" {...p} />,
  }))

  const {
    ChainOfThoughtStep,
    ChainOfThoughtSearchResults,
    ChainOfThoughtSearchResult,
    ChainOfThoughtImage,
  } = require("../src/components/ai-elements/chain-of-thought")

  const { getByText, getByTestId } = render(
    <div>
      <ChainOfThoughtStep label="Step 1" description="Desc 1" />
      <ChainOfThoughtSearchResults>
        <ChainOfThoughtSearchResult>Res</ChainOfThoughtSearchResult>
      </ChainOfThoughtSearchResults>
      <ChainOfThoughtImage caption="cap">IMG</ChainOfThoughtImage>
    </div>
  )

  expect(getByText("Step 1")).toBeTruthy()
  expect(getByText("Desc 1")).toBeTruthy()
  expect(getByText("Res")).toBeTruthy()
  expect(getByText("cap")).toBeTruthy()
  // icons from lucide mock
  expect(getByTestId("dot")).toBeTruthy()
})
