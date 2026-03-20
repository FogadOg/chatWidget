/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

// Mock ui primitives used by Confirmation
jest.mock(
  "/home/fogad/Documents/assistantProj/widget-app/components/ui/alert",
  () => ({
    Alert: ({ children, ...p }: any) => <div data-slot="alert" {...p}>{children}</div>,
    AlertDescription: ({ children, ...p }: any) => <div data-slot="alert-desc" {...p}>{children}</div>,
  }),
  { virtual: true }
)

jest.mock(
  "/home/fogad/Documents/assistantProj/widget-app/components/ui/button",
  () => ({ Button: ({ children, ...p }: any) => <button {...p}>{children}</button> }),
  { virtual: true }
)

import {
  Confirmation,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
} from "../src/components/ai-elements/confirmation"

test("useConfirmation hook throws when used outside provider (request)", () => {
  expect(() => render(<ConfirmationRequest>Ask</ConfirmationRequest>)).toThrow(
    /Confirmation components must be used within Confirmation/
  )
})

test("ConfirmationRequest and Actions visible when state is approval-requested", () => {
  const { queryByText, getByText } = render(
    <Confirmation approval={{ id: "1" }} state={"approval-requested" as any}>
      <ConfirmationRequest>Ask</ConfirmationRequest>
      <ConfirmationActions>Act</ConfirmationActions>
      <ConfirmationAccepted>Acc</ConfirmationAccepted>
      <ConfirmationRejected>Rej</ConfirmationRejected>
    </Confirmation>
  )

  expect(getByText("Ask")).toBeTruthy()
  expect(getByText("Act")).toBeTruthy()
  expect(queryByText("Acc")).toBeNull()
  expect(queryByText("Rej")).toBeNull()
})

test("ConfirmationAccepted visible for approved response states", () => {
  const { getByText, queryByText } = render(
    <Confirmation approval={{ id: "1", approved: true }} state={"approval-responded" as any}>
      <ConfirmationRequest>Ask</ConfirmationRequest>
      <ConfirmationActions>Act</ConfirmationActions>
      <ConfirmationAccepted>Acc</ConfirmationAccepted>
      <ConfirmationRejected>Rej</ConfirmationRejected>
    </Confirmation>
  )

  expect(getByText("Acc")).toBeTruthy()
  expect(queryByText("Rej")).toBeNull()
  expect(queryByText("Ask")).toBeNull()
  expect(queryByText("Act")).toBeNull()
})

test("ConfirmationRejected visible for rejected response states", () => {
  const { getByText, queryByText } = render(
    <Confirmation approval={{ id: "1", approved: false }} state={"approval-responded" as any}>
      <ConfirmationRequest>Ask</ConfirmationRequest>
      <ConfirmationActions>Act</ConfirmationActions>
      <ConfirmationAccepted>Acc</ConfirmationAccepted>
      <ConfirmationRejected>Rej</ConfirmationRejected>
    </Confirmation>
  )

  expect(getByText("Rej")).toBeTruthy()
  expect(queryByText("Acc")).toBeNull()
  expect(queryByText("Ask")).toBeNull()
  expect(queryByText("Act")).toBeNull()
})
