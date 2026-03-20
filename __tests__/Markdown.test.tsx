/**
 * @jest-environment jsdom
 */

import React from "react"
import { render, waitFor } from "@testing-library/react"

jest.mock("react-markdown", () =>
  function ReactMarkdownMock({ rehypePlugins, children }: any) {
    return (
      <div
        data-testid="md"
        data-plugin-count={String((rehypePlugins || []).length)}
      >
        {children}
      </div>
    )
  }
)

jest.mock("remark-gfm", () => [])

import Markdown from "../src/components/ai-elements/Markdown"

describe("Markdown dynamic rehype-katex import branches", () => {
  const OriginalFunction = global.Function

  afterEach(() => {
    global.Function = OriginalFunction
    jest.clearAllMocks()
  })

  function patchFunctionForDynamicImport(mode: "resolve" | "reject" | "throw") {
    const PatchedFunction: any = function (...args: any[]) {
      if (args[0] === "pkg" && args[1] === "return import(pkg)") {
        if (mode === "throw") {
          throw new Error("dynamic import unavailable")
        }

        if (mode === "reject") {
          return (_pkg: string) => Promise.reject(new Error("missing"))
        }

        return (_pkg: string) => Promise.resolve({ default: () => null })
      }

      return OriginalFunction(...args)
    }

    global.Function = PatchedFunction
  }

  test("adds plugin when dynamic import resolves", async () => {
    patchFunctionForDynamicImport("resolve")

    const { getByTestId } = render(<Markdown content="Math $x$" />)

    await waitFor(() => {
      expect(getByTestId("md").getAttribute("data-plugin-count")).toBe("1")
    })
  })

  test("keeps plugin list empty when dynamic import rejects", async () => {
    patchFunctionForDynamicImport("reject")

    const { getByTestId } = render(<Markdown content="Math $y$" />)

    await waitFor(() => {
      expect(getByTestId("md").getAttribute("data-plugin-count")).toBe("0")
    })
  })

  test("keeps plugin list empty when Function constructor throws", async () => {
    patchFunctionForDynamicImport("throw")

    const { getByTestId } = render(<Markdown content="Math $z$" />)

    await waitFor(() => {
      expect(getByTestId("md").getAttribute("data-plugin-count")).toBe("0")
    })
  })
})
