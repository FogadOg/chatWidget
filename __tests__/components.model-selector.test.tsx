/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"

import ModelSelector, {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "../components/ai-elements/model-selector"

test("components model-selector exports render", () => {
  const { getByText, getByRole } = render(
    <ModelSelector>
      <ModelSelectorTrigger>Open</ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput />
        <ModelSelectorEmpty>Empty</ModelSelectorEmpty>
        <ModelSelectorGroup>
          <ModelSelectorItem>
            <ModelSelectorLogoGroup>
              <ModelSelectorLogo>Logo</ModelSelectorLogo>
            </ModelSelectorLogoGroup>
            <ModelSelectorName>Name</ModelSelectorName>
          </ModelSelectorItem>
        </ModelSelectorGroup>
        <ModelSelectorList>List</ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )

  expect(getByRole("button", { name: "Open" })).toBeTruthy()
  expect(getByText("Empty")).toBeTruthy()
  expect(getByText("Logo")).toBeTruthy()
  expect(getByText("Name")).toBeTruthy()
  expect(getByText("List")).toBeTruthy()
})
