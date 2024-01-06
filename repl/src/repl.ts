import { DataBase } from "josm"
import { josmLocalStorageReflection, josmEventReflection, josmFsReflection, websocketJosmAdapterClient } from "../../app/src/josmAdapter"
import wsUrlify from "normalize-ws-url-protocol"
import clone from "circ-clone"


declare const window: any

// function getCurStore(mongo: Collection) {
//   return mongo.find({}).toArray()
// }


(async () => {


  const db = await websocketJosmAdapterClient(new WebSocket(wsUrlify("con1"))) as DataBase


  db((full, diff) => {
    console.log(diff)
  })

  window.db = db






})()