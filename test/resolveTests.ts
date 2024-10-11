export type TestCase = () => void | Promise<void>
export type TestLibFunc = (name: string, testCase: TestCase) => void
export type TestLibFuncMulti = (name: string, ...testCase: TestCase[]) => void
export type Tests = ({type: "group", name: string, nodes: Tests} | {type: "test", name: string, nodes: TestCase[]})[]





export function resolveTest<Func extends TestLibFunc>(refresh: Function, testLibFunc: Func): Func & TestLibFuncMulti {
  return new Proxy(function doTest(name: string, ...tests: Function[]) {
    testLibFunc(name, async () => {
      for (let i = 0; i < tests.length; i++) {
        await tests[i]()
        if (i !== tests.length - 1) await refresh()
      }
    })
  }, {
    get: (target, prop) => {
      return testLibFunc[prop]
    }
  }) as any
}



export function resolveTests(ts: Tests, test: TestLibFuncMulti & {describe: TestLibFunc}) {
  function resolveTestsRec(ts: Tests) {
    for (const { type, name, nodes } of ts) {
      if (type === "test") {
        test(name, ...nodes)
      }
      else {
        test.describe(name, () => {
          resolveTestsRec(nodes)
        })
      }
    } 
  }
  return resolveTestsRec(ts)
}
