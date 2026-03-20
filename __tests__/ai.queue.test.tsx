/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

jest.mock("../src/components/ui/button", () => ({
  __esModule: true,
  Button: ({ children, ...props }: any) => <button data-testid="queue-button" {...props}>{children}</button>,
}))

jest.mock("../src/components/ui/scroll-area", () => ({
  __esModule: true,
  ScrollArea: ({ children, ...props }: any) => <div data-testid="scroll-area" {...props}>{children}</div>,
}))

jest.mock("../src/components/ui/collapsible", () => {
  const React = require("react")
  return {
    __esModule: true,
    Collapsible: ({ children, defaultOpen, ...props }: any) => <div data-testid="collapsible" {...props}>{children}</div>,
    CollapsibleContent: ({ children, ...props }: any) => <div data-testid="collapsible-content" {...props}>{children}</div>,
    CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props)
      }
      return <button data-testid="collapsible-trigger" {...props}>{children}</button>
    },
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  ChevronDownIcon: (props: any) => <svg data-testid="chevron-down" {...props} />,
  PaperclipIcon: (props: any) => <svg data-testid="paperclip" {...props} />,
}))

import {
  Queue,
  QueueItem,
  QueueItemAction,
  QueueItemAttachment,
  QueueItemContent,
  QueueItemDescription,
  QueueItemFile,
  QueueItemImage,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "../src/components/ai-elements/queue"

test("Queue and item components render with completed/pending branches", () => {
  const { getByText, getByAltText, getByTestId } = render(
    <Queue>
      <QueueList>
        <QueueItem>
          <div className="flex items-center gap-2">
            <QueueItemIndicator completed />
            <QueueItemContent completed>Done task</QueueItemContent>
          </div>
          <QueueItemDescription completed>Done desc</QueueItemDescription>
          <QueueItemAttachment>
            <QueueItemImage alt="img" src="https://example.com/a.png" />
            <QueueItemFile>doc.pdf</QueueItemFile>
          </QueueItemAttachment>
          <QueueItemAction aria-label="act">A</QueueItemAction>
        </QueueItem>
      </QueueList>
    </Queue>
  )

  expect(getByText("Done task")).toBeTruthy()
  expect(getByText("Done desc")).toBeTruthy()
  expect(getByText("doc.pdf")).toBeTruthy()
  expect(getByAltText("img")).toBeTruthy()
  expect(getByTestId("paperclip")).toBeTruthy()
  expect(getByTestId("queue-button")).toBeTruthy()
})

test("Queue section components render trigger/label/content", () => {
  const { getByText, getByTestId } = render(
    <QueueSection>
      <QueueSectionTrigger>
        <QueueSectionLabel count={2} label="items" />
      </QueueSectionTrigger>
      <QueueSectionContent>
        <div>Section Body</div>
      </QueueSectionContent>
    </QueueSection>
  )

  expect(getByText("2 items")).toBeTruthy()
  expect(getByText("Section Body")).toBeTruthy()
  expect(getByTestId("chevron-down")).toBeTruthy()
})
