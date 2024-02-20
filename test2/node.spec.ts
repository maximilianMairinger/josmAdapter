import { expect, test } from "@playwright/test"
import fs from "fs"


test.describe("node", () => {
  test("test", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test2", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test3", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test4", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test5", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test6", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test7", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
  test("test8", () => {
    expect(fs.readFileSync).not.toBe(undefined)
  })
})