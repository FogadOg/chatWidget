/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("../src/components/ui/collapsible", () => {
  const React = require("react")
  return {
    __esModule: true,
    Collapsible: ({ children, defaultOpen, ...props }: any) => <div data-testid="collapsible" {...props}>{children}</div>,
    CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props)
      }
      return <button data-testid="trigger" {...props}>{children}</button>
    },
    CollapsibleContent: ({ children, ...props }: any) => <div data-testid="content" {...props}>{children}</div>,
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  ChevronDownIcon: (p: any) => <svg data-testid="chevron" {...p} />,
  SearchIcon: (p: any) => <svg data-testid="search" {...p} />,
}))

import { Task, TaskContent, TaskItem, TaskItemFile, TaskTrigger } from "../src/components/ai-elements/task"

test("Task components render default trigger and content", () => {
  const { getByText, getByTestId } = render(
    <Task>
      <TaskTrigger title="Search files" />
      <TaskContent>
        <TaskItem>Item 1</TaskItem>
        <TaskItemFile>file.tsx</TaskItemFile>
      </TaskContent>
    </Task>
  )

  expect(getByTestId("search")).toBeTruthy()
  expect(getByText("Search files")).toBeTruthy()
  expect(getByText("Item 1")).toBeTruthy()
  expect(getByText("file.tsx")).toBeTruthy()
})

test("TaskTrigger supports custom children", () => {
  const { getByText } = render(
    <Task>
      <TaskTrigger title="Ignored title">
        <div>Custom Trigger</div>
      </TaskTrigger>
    </Task>
  )
  expect(getByText("Custom Trigger")).toBeTruthy()
})
