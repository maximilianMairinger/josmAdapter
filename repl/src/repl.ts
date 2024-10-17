import "extended-dom"
import "extended-dom/app/dist/extentions/onOff"
import init from "extended-dom"
import { DataBase } from "josm"
import { josmLocalStorageReflection, josmEventReflection, josmFsReflection, websocketJosmAdapterClient, domEditAbleReflection, scrollTargetToAdapter, josmScrollReflection, josmEditAbleReflection } from "../../app/src/josmAdapter"
import wsUrlify from "normalize-ws-url-protocol"
import clone from "circ-clone"
import * as lel from "extended-dom/app/dist/extentions/styleManipulation"
import { coordsToDirIndex } from "extended-dom/app/dist/extentions/onOff"



declare const window: any

// function getCurStore(mongo: Collection) {
//   return mongo.find({}).toArray()
// }


(async () => {
  await init()

  console.log(coordsToDirIndex, lel)

  // const db = await websocketJosmAdapterClient(new WebSocket(wsUrlify("con1"))) as DataBase


  // db((full, diff) => {
  //   console.log(diff)
  // })

  const scrollEl = document.querySelector("#main")  
  const inp = document.querySelector("#inp") as any as HTMLInputElement
  


  const db = josmEditAbleReflection(inp, "")
  db.get((qwe) => {
    console.log(qwe)
  })
  window.db = db

  // console.log(db.get())










})()