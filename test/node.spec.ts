import { test } from "@playwright/test"
const playwrightTest = test
import { expect } from "./testSeup"
import { josmStaticFsReflection } from "../app/src/staticFsReflection"
import delay from "tiny-delay"
import fss, { promises as fs } from "fs"
import { makeTests } from "./reflectionTests"
import { resolveTests, resolveTest } from "./resolveTests"




test.describe("Reflection", () => {
  test.describe("static fs", () => {
    const test = resolveTest(async function doRefresh() {
      await delay(100)
    }, playwrightTest)


    const outDir = "test/TmpOut/testFile"
    try {fss.unlinkSync(outDir)}
    catch(e) {}
    test.beforeEach(async () => {
      try {await fs.unlink(outDir)}
      catch(e) {}
    })

    const commonReflectionTests = makeTests({
      makeReflection(initVal: any) {
        return josmStaticFsReflection(outDir, initVal)
      },
      expect
    })

    resolveTests(commonReflectionTests, test)


    
    test.describe("specific fs tests", () => {
      test("fs dependent", async () => {
        const val = await josmStaticFsReflection(outDir, 2);

        expect(val.get()).toBe(2)
        val.set(3)
        expect(val.get()).toBe(3)
  
  
        await delay(100)
        await fs.unlink(outDir)
  
        const val2 = await josmStaticFsReflection(outDir, 2);
        expect(val2.get()).toBe(2)
      })
  
      test("dependent on key", async () => {
        const val = await josmStaticFsReflection(outDir, 2);
  
        expect(val.get()).toBe(2)
        val.set(3)
        expect(val.get()).toBe(3)
      },
      async () => {  
        const val2 = await josmStaticFsReflection(outDir + "2", 2);
        expect(val2.get()).toBe(2)
      },
      async () => {
        const val3 = await josmStaticFsReflection(outDir, 2);
        expect(val3.get()).toBe(3)
      }, async () => {
        await fs.unlink(outDir + "2")
      })
    })
  })
})