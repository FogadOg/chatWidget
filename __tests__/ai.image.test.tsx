/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

import { Image } from "../src/components/ai-elements/image"

test("Image builds data URI from base64 + mediaType", () => {
  const { getByAltText } = render(
    <Image
      alt="generated"
      base64="QUJD"
      mediaType="image/png"
      uint8Array={new Uint8Array([1, 2, 3]) as any}
    />
  )

  const img = getByAltText("generated") as HTMLImageElement
  expect(img.src).toContain("data:image/png;base64,QUJD")
  expect(img.className).toContain("rounded-md")
})

test("Image merges custom className", () => {
  const { getByAltText } = render(
    <Image
      alt="custom"
      base64="AA=="
      mediaType="image/jpeg"
      className="extra-img"
      uint8Array={new Uint8Array([1]) as any}
    />
  )

  expect((getByAltText("custom") as HTMLImageElement).className).toContain("extra-img")
})
