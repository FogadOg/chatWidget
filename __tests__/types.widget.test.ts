/**
 * @jest-environment jsdom
 */

describe("types/widget runtime export", () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test("__TEST_TYPES is exported and true", () => {
    const mod = require("../types/widget")
    expect(mod.__TEST_TYPES).toBe(true)
  })
})
