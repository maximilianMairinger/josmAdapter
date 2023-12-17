import { josmLocalStorageReflection, josmEventReflection } from "../../app/src/josmAdapter"
import clone from "circ-clone"


declare const window: any


(async () => {
  localStorage.clear()
  debugger
  const lel = josmLocalStorageReflection("leltest", {
    whoop: true,
  })


  console.log(clone(lel()), localStorage.leltest)

  const ob = {
    q: 1,
    circ1: {q: 2}
  } as any

  


  lel(ob)

  console.log(clone(lel()), localStorage.leltest)

  lel({circ1: {circ2: lel()}})


  console.log(clone(lel()), localStorage.leltest)



  
  
  
  window.lel = lel
})()