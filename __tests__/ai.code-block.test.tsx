/**
 * @jest-environment jsdom
 */

import React from "react"
import { fireEvent, render, waitFor } from "@testing-library/react"

jest.mock("@/components/ui/button", () => ({
  __esModule: true,
  Button: ({ children, ...props }: any) => <button data-testid="copy-btn" {...props}>{children}</button>,
}))

jest.mock("lucide-react", () => ({
  __esModule: true,
  CheckIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
  CopyIcon: (props: any) => <svg data-testid="copy-icon" {...props} />,
}))

jest.mock("shiki", () => ({
  __esModule: true,
  codeToHtml: async (code: string, opts: any) => `<pre data-lang="${opts.lang}">${code}</pre>`,
}))

import { CodeBlock, CodeBlockCopyButton, highlightCode } from "../src/components/ai-elements/code-block"

test("highlightCode returns light and dark HTML", async () => {
  const out = await highlightCode("x=1", "javascript" as any, true)
  expect(Array.isArray(out)).toBe(true)
  expect(out).toHaveLength(2)
  expect(out[0]).toContain("x=1")
  expect(out[1]).toContain("x=1")
})

test("CodeBlock renders and copy button writes to clipboard", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  const onCopy = jest.fn()

  const { getByTestId, getByRole } = render(
    <CodeBlock code="const a = 1" language={"javascript" as any}>
      <CodeBlockCopyButton onCopy={onCopy} timeout={10} />
    </CodeBlock>
  )

  await waitFor(() => {
    expect(getByTestId("copy-icon")).toBeTruthy()
  })
  fireEvent.click(getByRole("button"))

  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith("const a = 1")
    expect(onCopy).toHaveBeenCalled()
    expect(getByTestId("check-icon")).toBeTruthy()
  })
})
