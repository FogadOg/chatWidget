/**
 * @jest-environment jsdom
 */

import React from "react"

describe("line-number transformer is provided to shiki and inserts spans", () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test("highlightCode passes line-number transformer that injects span children", async () => {
    let capturedTransformers: any[] | null = null
    let capturedNodeChildren: any[] | null = null

    jest.mock("shiki", () => ({
      __esModule: true,
      codeToHtml: async (_code: string, opts: any) => {
        capturedTransformers = opts.transformers || []
        // simulate transformer running on a single line
        if (capturedTransformers && capturedTransformers.length) {
          const node: any = { children: [] }
          // call the transformer's `line` with a sample line number
          capturedTransformers.forEach((t: any) => {
            if (typeof t.line === "function") {
              t.line(node, 7)
            }
          })
          capturedNodeChildren = node.children
        }
        return Promise.resolve(`<pre>${_code}</pre>`)
      },
    }))

    const { highlightCode } = await import("../src/components/ai-elements/code-block")

    const out = await highlightCode("const a = 1", "javascript" as any, true)
    // out should be an array with two html strings
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBe(2)

    // ensure transformer was passed
    expect(capturedTransformers).not.toBeNull()
    const lineTransformer = (capturedTransformers || []).find((t: any) => t && t.name === "line-numbers")
    expect(lineTransformer).toBeTruthy()

    // ensure it injected a span child with text '7'
    expect(capturedNodeChildren).not.toBeNull()
    const firstChild = (capturedNodeChildren || [])[0]
    expect(firstChild).toBeTruthy()
    expect(firstChild.type).toBe("element")
    expect(firstChild.tagName).toBe("span")
    expect(firstChild.children && firstChild.children[0] && firstChild.children[0].value).toBe("7")
    // className list should include expected utility classes
    expect(firstChild.properties.className).toEqual(expect.arrayContaining(["inline-block", "min-w-10", "mr-4", "text-right", "select-none", "text-muted-foreground"]))
  })
})
