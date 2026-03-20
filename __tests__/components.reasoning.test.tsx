/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

import Reasoning, {
  Reasoning as ReasoningNamed,
  ReasoningContent,
  ReasoningTrigger,
} from "../components/ai-elements/reasoning"

test("components reasoning exports render", () => {
  const { getByText, getByRole } = render(
    <Reasoning>
      <ReasoningNamed>
        <ReasoningContent>Why this answer</ReasoningContent>
      </ReasoningNamed>
      <ReasoningTrigger />
    </Reasoning>
  )

  expect(getByText("Why this answer")).toBeTruthy()
  expect(getByRole("button")).toBeTruthy()
})
