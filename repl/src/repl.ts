import { josmLocalStorageReflection } from "../../app/src/josmAdapter"


declare const window: any


(async () => {
  debugger
  const lel = await josmLocalStorageReflection("leltest", {
    whoop: false,
  })
  
  
  
  window.lel = lel.db
})()