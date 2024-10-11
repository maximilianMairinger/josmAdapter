import * as playwright from '@playwright/test';
import {promises as fs} from "fs"
import esbuild from "esbuild"
import crypto from "crypto"
import path from "path"
import slugify from "slugify"
import { expect } from "./testSeup"
export { expect } from "./testSeup"

const testDir = "test"


let index = 0
function uuid(name: string = "") {
  // im not sure how playwright does multithreading, so it could be that this function is called at the same time in two different threads. 
  // Thats why we use crypto v4 UUID
  return name + "-" + crypto.randomUUID() + index++
}

export const injectImports = [] as {import: string[], from: `./${string}` | string}[]

injectImports.push({import: ["cloneKeys as clone", "cloneKeys"], from: "circ-clone"})


const toString = (func: Function) => `(${func.toString()})()`


declare var window: any;

export function test(name: string, ...functions: (() => (void | Promise<void>))[]) {
  
  return playwright.test(name, async ({ page }) => {
    await page.goto("/")

    

    const allCalls = []
    for (let i = 0; i < functions.length; i++) {
      const f = functions[i]




      // declare proxies for the most important functions. Mainly expect and console
      await page.evaluate(() => {

        // ported from "circ-clone"
        const clone = (() => {
          let known: WeakMap<any, any>
          return function cloneKeys<Ob extends unknown>(ob: Ob): Ob {
            known = new WeakMap()
            return cloneKeysRec(ob)
          }
          function cloneKeysRec(ob: unknown) {
            if (typeof ob === "object" && ob !== null) {
              if (known.has(ob)) return known.get(ob)
              const cloned = new (ob instanceof Array ? Array : Object)
              known.set(ob, cloned)
              for (const key of Object.keys(ob)) if (cloned[key] === undefined) cloned[key] = cloneKeysRec(ob[key])
              // prototype poisoning protection >^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
              return cloned
            }
            else return ob
          }
        })()



        window.console = new Proxy(window.console, {
          get: (target, prop) => {
            return (...args) => {
              window.___ProxyCalls.push({
                type: "console",
                prop: {
                  method: prop,
                  args
                }
              })
              return target[prop](...args)
            }
          }
        })





        class SpecialProp {
          constructor(public value: any) {}
        }


        if (window.expect !== undefined) throw new Error('expect is already defined');
        window.___ProxyCalls = []
        window.___ProxyCallsProms = []
        let count = 1
        window.expect = new Proxy((testValue: any) => {
          let not = false
          const prox = new Proxy({}, {
            get: (target, prop) => {
              if (prop !== "not") {
                return (expectedValue) => {
                  not = false
                  const specialProp = expectedValue instanceof SpecialProp
                  const testIsFunc = testValue instanceof Function
                  let testThrown = false
                  let testThrowVal: any
                  let testVal: any
                  try {
                    testVal = testIsFunc ? testValue() : testValue
                  }
                  catch(e) {
                    testThrown = true
                    testThrowVal = e
                  }
                  if (testIsFunc && testVal instanceof Promise) {
                    const p = (async () => {
                      try {
                        testVal = await testVal
                      }
                      catch(e) {
                        testThrown = true
                        testThrowVal = e
                      }
                      pushData()
                    })()
                    window.___ProxyCallsProms.push(p.finally())
                    return p
                  }
                  else pushData()
                  function pushData() {
                    window.___ProxyCalls.push({
                      type: "expect",
                      prop: {
                        count,
                        method: prop,
                        not,
                        testValue: {
                          isFunc: testIsFunc,
                          thrown: testThrown,
                          value: clone(testThrown ? testThrowVal : testVal)
                        },
                        expectedValue: {
                          specialProp,
                          value: clone(specialProp ? expectedValue.value : expectedValue)
                        }
                      }
                    })
                    count++
                  }
                }
              }
              else {
                not = !not
                return prox
              }
            },
          });
          return prox
        }, {
          get(target, prop) {
            return (...values) => {
              return new SpecialProp({prop, values})
            }
          }
        })



        
      })







      // handle imports
      const userFuncStr = toString(f)
      const myUUID = uuid(slugify(name))
      const dir = path.resolve(path.join(testDir, `tmp/${myUUID}-${i}.js`))
      await fs.mkdir(path.dirname(dir), {recursive: true})
      const importsStrs = injectImports.map(({import: imp, from}) => `import { ${imp.join(", ")} } from "${!from.startsWith("./") ? from : path.join("../../", from)}"`)

      await fs.writeFile(dir, importsStrs.join(";\n") + ";\n\n" + userFuncStr, "utf-8")

      // bundle user test
      const res = await esbuild.build({
        entryPoints: [dir],
        bundle: true,
        write: false
      })

      await fs.unlink(dir)

      const bundled = res.outputFiles[0].text

      // run user test
      await page.evaluate(bundled);




      // resolve proxies for the most important functions. Mainly expect and console
      const calls = await page.evaluate(async () => {
        await Promise.all(window.___ProxyCallsProms)
        return window.___ProxyCalls
      })

      allCalls.push(...calls)

      if (i < functions.length - 1) await page.reload({ waitUntil: "load" })
    }

    




    


    
    
    



    for (const { type, prop } of allCalls) {
      if (type === "expect") {
        const { method, not, testValue, expectedValue, count } = prop
        let p = expect(!testValue.isFunc ? testValue.value : testValue.thrown ? () => {throw testValue.value} : () => testValue.value) as any
        if (not) p = p.not
        p = p[method]
        if (!expectedValue.specialProp) doExpectCall(expectedValue.value)
        else doExpectCall(playwright.expect[expectedValue.value.prop](...expectedValue.value.values))

        function doExpectCall(param) {
          try {
            p(param)
          }
          catch(e) {
            console.error("Error in expect call number:", count)
            throw e
          }
        }
      }
      else if (type === "console") {
        const { method, args } = prop
        console[method](...args)
      }
    }
  });
}



test.describe = playwright.test.describe;






