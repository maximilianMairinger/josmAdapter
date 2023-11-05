import { josmLocalStorageReflection, josmEventReflection } from "../../app/src/josmAdapter"


declare const window: any


(async () => {
  debugger
  const lel = josmLocalStorageReflection("leltest", {
    whoop: false,
  })

  
  
  
  
  window.lel = lel.db
})()