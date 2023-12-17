import { josmLocalStorageReflection, josmEventReflection, josmFsReflection } from "../../app/src/josmAdapter"
import clone from "circ-clone"
import fs from "fs"
import path from "path"


declare const window: any

function getCurStore() {
  return fs.readFileSync(path.resolve("leltest"), "utf8").toString()
}


(async () => {
  // localStorage.clear()

  // fs.unlinkSync(path.resolve("leltest"))
  debugger
  const lel = await josmFsReflection(path.resolve("leltest"), {
    whoop: true,
  })


  console.log(clone(lel()), getCurStore())

  const ob = {
    q: 1,
    circ1: {q: 2}
  } as any

  


  lel(ob)

  console.log(clone(lel()), getCurStore())

  lel({circ1: {circ2: lel()}})


  console.log(clone(lel()), getCurStore())



  
  
  
  // window.lel = lel
})()