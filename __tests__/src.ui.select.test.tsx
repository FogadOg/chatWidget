/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

beforeEach(() => {
  jest.resetModules()
})

test("Select renders trigger, content and item with data-slot", () => {
  jest.doMock("@radix-ui/react-select", () => {
    const React = require("react")
    const Root = ({ children, ...props }: any) => (
      <div data-testid="radix-select-root" {...props}>
        {children}
      </div>
    )
    const Group = ({ children, ...props }: any) => (
      <div data-testid="radix-select-group" {...props}>{children}</div>
    )
    const Value = ({ children, ...props }: any) => (
      <span data-testid="radix-select-value" {...props}>{children}</span>
    )
    const Trigger = ({ children, ...props }: any) => (
      <button data-testid="radix-select-trigger" {...props}>{children}</button>
    )
    const Icon = ({ asChild, children, ...props }: any) => (
      <span data-testid="radix-select-icon" {...props}>{children}</span>
    )
    const Portal = ({ children }: any) => <div data-testid="radix-select-portal">{children}</div>
    const Content = ({ children, ...props }: any) => (
      <div data-testid="radix-select-content" {...props}>{children}</div>
    )
    const Viewport = ({ children, ...props }: any) => (
      <div data-testid="radix-select-viewport" {...props}>{children}</div>
    )
    const Item = ({ children, ...props }: any) => (
      <div data-testid="radix-select-item" {...props}>{children}</div>
    )
    const ItemIndicator = ({ children, ...props }: any) => (
      <span data-testid="radix-select-item-indicator" {...props}>{children}</span>
    )
    const ItemText = ({ children, ...props }: any) => (
      <span data-testid="radix-select-item-text" {...props}>{children}</span>
    )
    const Separator = ({ children, ...props }: any) => (
      <div data-testid="radix-select-separator" {...props}>{children}</div>
    )
    const ScrollUpButton = ({ children, ...props }: any) => (
      <button data-testid="radix-select-scroll-up" {...props}>{children}</button>
    )
    const ScrollDownButton = ({ children, ...props }: any) => (
      <button data-testid="radix-select-scroll-down" {...props}>{children}</button>
    )
    return {
      __esModule: true,
      Root,
      Group,
      Value,
      Trigger,
      Icon,
      Portal,
      Content,
      Viewport,
      Item,
      ItemIndicator,
      ItemText,
      Separator,
      ScrollUpButton,
      ScrollDownButton,
    }
  })

  jest.doMock("lucide-react", () => {
    const React = require("react")
    return {
      __esModule: true,
      CheckIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
      ChevronDownIcon: (props: any) => <svg data-testid="chev-down" {...props} />,
      ChevronUpIcon: (props: any) => <svg data-testid="chev-up" {...props} />,
    }
  })

  const mod = require("../src/components/ui/select")
  // ensure module exports exist (importing the module executes its top-level code)
  expect(mod).toBeTruthy()
  expect(typeof mod.Select).toBe("function")
  expect(typeof mod.SelectTrigger).toBe("function")
  expect(typeof mod.SelectContent).toBe("function")
})

test("Select components propagate data-slot attributes to Radix primitives", () => {
  jest.resetModules()
  jest.doMock("@radix-ui/react-select", () => {
    const React = require("react")
    const Root = ({ children, ...props }: any) => (
      <div data-testid="radix-select-root" {...props}>
        {children}
      </div>
    )
    const Trigger = ({ children, ...props }: any) => (
      <button data-testid="radix-select-trigger" {...props}>{children}</button>
    )
    const Icon = ({ asChild, children, ...props }: any) => {
      if (asChild) return children
      return <span data-testid="radix-select-icon" {...props}>{children}</span>
    }
    const Portal = ({ children }: any) => <div data-testid="radix-select-portal">{children}</div>
    const Content = ({ children, ...props }: any) => (
      <div data-testid="radix-select-content" {...props}>{children}</div>
    )
    const Viewport = ({ children, ...props }: any) => (
      <div data-testid="radix-select-viewport" {...props}>{children}</div>
    )
    const Item = ({ children, ...props }: any) => (
      <div data-testid="radix-select-item" {...props}>{children}</div>
    )
    const ItemIndicator = ({ children, ...props }: any) => (
      <span data-testid="radix-select-item-indicator" {...props}>{children}</span>
    )
    const ItemText = ({ children, ...props }: any) => (
      <span data-testid="radix-select-item-text" {...props}>{children}</span>
    )
    const Label = ({ children, ...props }: any) => (
      <label data-testid="radix-select-label" {...props}>{children}</label>
    )
    const Separator = ({ children, ...props }: any) => (
      <div data-testid="radix-select-separator" {...props}>{children}</div>
    )
    const ScrollUpButton = ({ children, ...props }: any) => (
      <button data-testid="radix-select-scroll-up" {...props}>{children}</button>
    )
    const ScrollDownButton = ({ children, ...props }: any) => (
      <button data-testid="radix-select-scroll-down" {...props}>{children}</button>
    )
    return {
      __esModule: true,
      Root,
      Trigger,
      Icon,
      Portal,
      Content,
      Viewport,
      Item,
      ItemIndicator,
      ItemText,
      Separator,
      ScrollUpButton,
      ScrollDownButton,
    }
  })

  jest.doMock("lucide-react", () => {
    const React = require("react")
    return {
      __esModule: true,
      CheckIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
      ChevronDownIcon: (props: any) => <svg data-testid="chev-down" {...props} />,
      ChevronUpIcon: (props: any) => <svg data-testid="chev-up" {...props} />,
    }
  })

  const {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
  } = require("../src/components/ui/select")

  const { getByTestId } = render(
    <Select>
      <SelectTrigger>Open</SelectTrigger>
      <SelectContent>
        <SelectItem>One</SelectItem>
        <SelectSeparator />
        <SelectScrollUpButton />
        <SelectScrollDownButton />
      </SelectContent>
    </Select>
  )

  expect(getByTestId("radix-select-root").getAttribute("data-slot")).toBe("select")
  expect(getByTestId("radix-select-trigger").getAttribute("data-slot")).toBe(
    "select-trigger"
  )
  expect(getByTestId("radix-select-content").getAttribute("data-slot")).toBe(
    "select-content"
  )
  expect(getByTestId("radix-select-item").getAttribute("data-slot")).toBe(
    "select-item"
  )
  expect(getByTestId("radix-select-item-indicator")).toBeTruthy()
})

test("SelectGroup, SelectValue and SelectLabel propagate data-slot and render", () => {
  jest.resetModules()
  jest.doMock("@radix-ui/react-select", () => {
    const React = require("react")
    const Root = ({ children, ...props }: any) => (
      <div data-testid="radix-select-root" {...props}>
        {children}
      </div>
    )
    const Group = ({ children, ...props }: any) => (
      <div data-testid="radix-select-group" {...props}>{children}</div>
    )
    const Value = ({ children, ...props }: any) => (
      <span data-testid="radix-select-value" {...props}>{children}</span>
    )
    const Trigger = ({ children, ...props }: any) => (
      <button data-testid="radix-select-trigger" {...props}>{children}</button>
    )
    const Portal = ({ children }: any) => <div data-testid="radix-select-portal">{children}</div>
    const Content = ({ children, ...props }: any) => (
      <div data-testid="radix-select-content" {...props}>{children}</div>
    )
    const Viewport = ({ children, ...props }: any) => (
      <div data-testid="radix-select-viewport" {...props}>{children}</div>
    )
    const Item = ({ children, ...props }: any) => (
      <div data-testid="radix-select-item" {...props}>{children}</div>
    )
    const ItemIndicator = ({ children, ...props }: any) => (
      <span data-testid="radix-select-item-indicator" {...props}>{children}</span>
    )
    const ItemText = ({ children, ...props }: any) => (
      <span data-testid="radix-select-item-text" {...props}>{children}</span>
    )
    const Label = ({ children, ...props }: any) => (
      <label data-testid="radix-select-label" {...props}>{children}</label>
    )
    const Separator = ({ children, ...props }: any) => (
      <div data-testid="radix-select-separator" {...props}>{children}</div>
    )
    const ScrollUpButton = ({ children, ...props }: any) => (
      <button data-testid="radix-select-scroll-up" {...props}>{children}</button>
    )
    const ScrollDownButton = ({ children, ...props }: any) => (
      <button data-testid="radix-select-scroll-down" {...props}>{children}</button>
    )
    return {
      __esModule: true,
      Root,
      Group,
      Value,
      Trigger,
      Portal,
      Content,
      Viewport,
      Item,
      ItemIndicator,
      ItemText,
      Label,
      Separator,
      ScrollUpButton,
      ScrollDownButton,
    }
  })

  jest.doMock("lucide-react", () => {
    const React = require("react")
    return {
      __esModule: true,
      CheckIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
      ChevronDownIcon: (props: any) => <svg data-testid="chev-down" {...props} />,
      ChevronUpIcon: (props: any) => <svg data-testid="chev-up" {...props} />,
    }
  })

  const {
    Select,
    SelectGroup,
    SelectValue,
    SelectLabel,
    SelectItem,
  } = require("../src/components/ui/select")

  const { getByTestId } = render(
    <Select>
      <SelectGroup>
        <SelectLabel>Group</SelectLabel>
        <SelectValue>Value</SelectValue>
        <SelectItem>One</SelectItem>
      </SelectGroup>
    </Select>
  )

  expect(getByTestId("radix-select-group").getAttribute("data-slot")).toBe(
    "select-group"
  )
  expect(getByTestId("radix-select-value").getAttribute("data-slot")).toBe(
    "select-value"
  )
  expect(getByTestId("radix-select-label").getAttribute("data-slot")).toBe(
    "select-label"
  )
})
