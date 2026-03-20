/**
 * @jest-environment jsdom
 */

import React from "react"
import { act, render, waitFor } from "@testing-library/react"

let mockApi: any

jest.mock("../src/components/ui/badge", () => ({
  __esModule: true,
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}))

jest.mock("../src/components/ui/hover-card", () => {
  const React = require("react")
  return {
    __esModule: true,
    HoverCard: ({ children, closeDelay, openDelay, ...props }: any) => <div data-testid="hover-card" {...props}>{children}</div>,
    HoverCardContent: ({ children, ...props }: any) => <div data-testid="hover-content" {...props}>{children}</div>,
    HoverCardTrigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) return React.cloneElement(children, props)
      return <span data-testid="hover-trigger" {...props}>{children}</span>
    },
  }
})

jest.mock("../src/components/ui/carousel", () => {
  const React = require("react")
  return {
    __esModule: true,
    Carousel: ({ children, setApi, ...props }: any) => {
      React.useEffect(() => {
        if (setApi) setApi(mockApi)
      }, [setApi])
      return <div data-testid="carousel" {...props}>{children}</div>
    },
    CarouselContent: ({ children, ...props }: any) => <div data-testid="carousel-content" {...props}>{children}</div>,
    CarouselItem: ({ children, ...props }: any) => <div data-testid="carousel-item" {...props}>{children}</div>,
  }
})

jest.mock("lucide-react", () => ({
  __esModule: true,
  ArrowLeftIcon: (props: any) => <svg data-testid="arrow-left" {...props} />,
  ArrowRightIcon: (props: any) => <svg data-testid="arrow-right" {...props} />,
}))

import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationQuote,
  InlineCitationSource,
  InlineCitationText,
} from "../src/components/ai-elements/inline-citation"

beforeEach(() => {
  const handlers: Record<string, () => void> = {}
  let idx = 1
  mockApi = {
    scrollPrev: jest.fn(),
    scrollNext: jest.fn(),
    selectedScrollSnap: () => idx,
    scrollSnapList: () => [0, 1, 2],
    on: (event: string, cb: () => void) => {
      handlers[event] = cb
    },
    off: jest.fn(),
    __setIndex: (n: number) => {
      idx = n
      if (handlers.select) handlers.select()
    },
  }
})

test("InlineCitation trigger renders hostname and extra source count", () => {
  const { getByText } = render(
    <InlineCitation>
      <InlineCitationText>Evidence</InlineCitationText>
      <InlineCitationCard>
        <InlineCitationCardTrigger
          sources={["https://example.com/path", "https://foo.test/a"]}
        />
        <InlineCitationCardBody />
      </InlineCitationCard>
    </InlineCitation>
  )

  expect(getByText("Evidence")).toBeTruthy()
  expect(getByText("example.com +1")).toBeTruthy()
})

test("InlineCitation trigger falls back to unknown when sources empty", () => {
  const { getByText } = render(
    <InlineCitationCard>
      <InlineCitationCardTrigger sources={[]} />
    </InlineCitationCard>
  )
  expect(getByText("unknown")).toBeTruthy()
})

test("InlineCitation carousel index updates and prev/next call api", async () => {
  const { getByLabelText, getByText } = render(
    <InlineCitationCarousel>
      <InlineCitationCarouselHeader>
        <InlineCitationCarouselPrev />
        <InlineCitationCarouselIndex />
        <InlineCitationCarouselNext />
      </InlineCitationCarouselHeader>
      <InlineCitationCarouselContent>
        <InlineCitationCarouselItem>
          <InlineCitationSource title="Doc" url="https://a" description="desc" />
          <InlineCitationQuote>quote</InlineCitationQuote>
        </InlineCitationCarouselItem>
      </InlineCitationCarouselContent>
    </InlineCitationCarousel>
  )

  await waitFor(() => {
    expect(getByText("2/3")).toBeTruthy()
  })
  act(() => {
    ;(mockApi as any).__setIndex(2)
  })
  await waitFor(() => {
    expect(getByText("3/3")).toBeTruthy()
  })

  getByLabelText("Previous").click()
  getByLabelText("Next").click()
  expect(mockApi.scrollPrev).toHaveBeenCalled()
  expect(mockApi.scrollNext).toHaveBeenCalled()
  expect(getByText("Doc")).toBeTruthy()
  expect(getByText("quote")).toBeTruthy()
})
