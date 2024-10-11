// import clone from 'circ-clone';
import { test, injectImports } from './browserTestSetup';
declare const { expect }: typeof import('./browserTestSetup')

// dont import anything used inside a test, as it will be run in the browser. Declare it below. 


declare const { josmLocalStorageReflection }: typeof import("../app/src/josmAdapter")
injectImports.push({import: ["josmLocalStorageReflection"], from: "./app/src/localStorageReflection"})

test.describe("Reflection", () => {
  test.describe("static localStorage", () => {
    test.describe("meta", () => {
      test('works', () => {
        localStorage.setItem('testKey', 'testValue');    
        expect(localStorage.getItem('testKey')).toBe('testValue');
      });
  
      test('doesnt persist', () => {
        expect(localStorage.getItem('testKey')).toBeNull()
      });

      test("throws async", () => {
        expect(() => {
          throw new Error("qwe")
        }).toThrow()

        expect(() => {
          return new Promise<void>((res, rej) => {
            setTimeout(() => {
              rej()
            }, 500)
          })
        }).toThrow()
      })
    })


    test("default primitive", () => {
      const val = josmLocalStorageReflection("testKey", 2);

      expect(val.get()).toBe(2)
      val.set(3)
      expect(val.get()).toBe(3)

      const val2 = josmLocalStorageReflection("testKey", 2);
      expect(val2.get()).toBe(3)
    })


    test("localStorage dependent", () => {
      const val = josmLocalStorageReflection("testKey", 2);

      expect(val.get()).toBe(2)
      val.set(3)
      expect(val.get()).toBe(3)

      localStorage.clear()

      const val2 = josmLocalStorageReflection("testKey", 2);
      expect(val2.get()).toBe(2)
    })

    test("refresh retention", () => {
      const val = josmLocalStorageReflection("testKey", 2);

      expect(val.get()).toBe(2)
      val.set(3)
      expect(val.get()).toBe(3)
    }, () => {
      const val2 = josmLocalStorageReflection("testKey", 2);
      expect(val2.get()).toBe(3)
    })

    test("dependent on key", () => {
      const val = josmLocalStorageReflection("testKey", 2);

      expect(val.get()).toBe(2)
      val.set(3)
      expect(val.get()).toBe(3)

      const val2 = josmLocalStorageReflection("testKey2", 2);
      expect(val2.get()).toBe(2)

      const val3 = josmLocalStorageReflection("testKey", 2);
      expect(val3.get()).toBe(3)
    })

    test("throw on complexity mismatch", () => {
      josmLocalStorageReflection("testKey", 2);
      
      expect(() => josmLocalStorageReflection("testKey", {a: 3})).toThrow()
    })

    test("dont throw on prim type change", () => {
      josmLocalStorageReflection("testKey", 2);
      
      expect(() => josmLocalStorageReflection("testKey", "qwe")).toPass()
    })


    test.describe("object", () => {
      test("object one prop", () => {
        const val = josmLocalStorageReflection("testKey", {a: 2});

        expect(val()).eq({a: 2})
        val.a.set(3)
        expect(val()).eq({a: 3})

        const val2 = josmLocalStorageReflection("testKey", {a: 2});
        expect(val2()).eq({a: 3})
      })

      test("object added prop", () => {
        const val = josmLocalStorageReflection("testKey", {a: 2});

        expect(val()).eq({a: 2})
        val.a.set(3)
        expect(val()).eq({a: 3})

        const val2 = josmLocalStorageReflection("testKey", {a: 2, b: "qwe"});
        expect(val2()).eq({a: 3, b: "qwe"})

        const val3 = josmLocalStorageReflection("testKey", {a: 10000});
        expect(val3()).eq({a: 3, b: "qwe"})
      })


      test.describe("nested", () => {
        test("simple nested", () => {
          const val = josmLocalStorageReflection("testKey", {a: {b: 2}, c: "cc"});

          expect(val()).eq({a: {b: 2}, c: "cc"})
          val.a.b.set(3)
          expect(val()).eq({a: {b: 3}, c: "cc"})

          const val2 = josmLocalStorageReflection("testKey", {a: {b: 2, d: "dd"}});
          expect(val2()).eq({a: {b: 3, d: "dd"}, c: "cc"})
        })

        test.describe("Cyclic", () => {
          test("Init", () => {
            const srcOb = {a: {b: 2}, c: "cc"};
            (srcOb as any).a.d = srcOb
            const val = josmLocalStorageReflection("testKey", srcOb);
  
            expect(val()).eq(srcOb)
            val.a.b.set(3)
            const resOb1 = {a: {b: 3, d: undefined}, c: "cc"}
            resOb1.a.d = resOb1
            expect(val()).eq(resOb1);
  
  
            (val as any).a.d.a.b.set(4)
            
            const resOb2 = {a: {b: 4, d: undefined}, c: "cc"}
            resOb2.a.d = resOb2;
            expect(val()).eq(resOb2);

            const val2 = josmLocalStorageReflection("testKey", srcOb);
            expect(val2()).eq(resOb2);
          })

          test("Latent", () => {
            const srcOb = {a: {b: 2}, c: "cc"};
            const val = josmLocalStorageReflection("testKey", srcOb);
  
            expect(val()).eq(srcOb)
            val({a: {d: srcOb}, c: "newC"})
            
            const resOb1 = {a: {b: 2, d: undefined}, c: "newC"}
            resOb1.a.d = resOb1
            expect(val()).eq(resOb1);
  
  
            (val as any).a.d.a.b.set(4)
            
            const resOb2 = {a: {b: 4, d: undefined}, c: "newC"}
            resOb2.a.d = resOb2;
            expect(val()).eq(resOb2);

            const val2 = josmLocalStorageReflection("testKey", srcOb);
            expect(val2()).eq(resOb2);
          })
        })

        

        
      })
    })
    
    
  })

  // test.describe("via uniDB", () => {
  //   test.describe("indexedDB", () => {

  //   })
  // })
})


