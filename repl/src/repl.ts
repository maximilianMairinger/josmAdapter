import { DataBase } from "josm"
import { josmLocalStorageReflection, josmEventReflection, josmFsReflection, websocketJosmAdapterClient, josmStaticIndexDBReflection, openIndexedDB } from "../../app/src/josmAdapter"
import wsUrlify from "normalize-ws-url-protocol"
import clone from "circ-clone"
import { decode, encode } from "circ-msgpack"
import fs from "fs"

declare const window: any

// function getCurStore(mongo: Collection) {
//   return mongo.find({}).toArray()
// }




(async () => {

  const db = await josmStaticIndexDBReflection({ db: await openIndexedDB("test123")}, { test: 2, deep: { a: 1, b: 2 } })  


  
  window.db = db

  // fs.writeFileSync("lelTest", "")
  // console.log(encode([undefined]))

  // const obj = { a: 1, b: 2, c: "3" }
  // console.log("raw", obj)

  // const binary = encode(obj)
  // console.log("binary", binary)
  
  // const str = btoa()
  // console.log("str", str)

  // const binary2 = new Uint8Array(new TextEncoder().encode(str))
  // console.log("binary2", binary2)

  // const obj2 = decode(binary2)
  // console.log("obj2", obj2)


  // localStorage["lel123"] = binary












})()