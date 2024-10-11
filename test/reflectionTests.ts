import { Data, DataBase } from "josm";
import { TestCase, Tests } from "./resolveTests"
import { mergeKeysDeep, cloneKeys } from "circ-clone"


function test(name: string, ...nodes: TestCase[]) {
  return {
    type: "test",
    name,
    nodes
  } as const
}

function describe(name: string, ...nodes: Tests) {
  return {
    type: "group",
    name,
    nodes
  } as const
}




export function makeTests({makeReflection, expect}: {expect: typeof import("./testSeup").expect, makeReflection: <T>(initVal: T) => (T extends object ? DataBase<T> : Data<T>) | Promise<T extends object ? DataBase<T> : Data<T>>}): Tests {
  function testAdditionSequence(name: string, ...sequence: object[]) {
    let cumNode = cloneKeys(sequence[0])
    return test(name, ...sequence.map((node, i) => async () => {
      const refl = await makeReflection(sequence[0])
      
      if (i !== 0) {
        expect(refl()).eq(sequence[i-1])
        refl(node)
        cumNode = mergeKeysDeep(cumNode, sequence[i])
      }
      expect(refl()).eq(cumNode)
    }))
  }




  return [
    test("default primitive", async () => {
      const val = await makeReflection(2);

      expect(val.get()).toBe(2)
      val.set(3)
      expect(val.get()).toBe(3)
    }, async () => {
      const val2 = await makeReflection(2);
      expect(val2.get()).toBe(3)
    }),
    test("throw on complexity mismatch", async () => {
      await makeReflection(2);
    }, async () => {
      await expect(async () => await makeReflection({a: 2})).rejects.toThrow()
    }),
    describe("object", 
      test("object one prop", async () => {
        const val = await makeReflection({a: 2})

        expect(val()).eq({a: 2})
        val.a.set(3)
        expect(val()).eq({a: 3})
      },
      async () => {
        const val2 = await makeReflection({a: 2, b: "qwe"});
        expect(val2()).eq({a: 3, b: "qwe"})
      },
      async () => {
        const val3 = await makeReflection({a: 10000});
        expect(val3()).eq({a: 3, b: "qwe"})
      }),
      test("dont throw on nested complexity mismatch", async () => {
        await makeReflection({a: 2})
      }, async () => {
        await makeReflection({a: {c: 2}})
      }),
      testAdditionSequence("multiple props initially", 
        {a: 2, b: "b"},
        {b: "c"},
        {a: 3},
        {a: 4, b: "d"}
      )
    )
  ]
}