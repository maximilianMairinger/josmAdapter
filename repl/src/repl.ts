import { DataBase } from "josm"
import { josmLocalStorageReflection, josmEventReflection, websocketJosmAdapterClient, josmStaticIndexDBReflection } from "../../app/src/josmAdapter"
import wsUrlify from "normalize-ws-url-protocol"
import clone from "circ-clone"
import { decode, encode } from "circ-msgpack"
import fs from "fs"
import delay from "tiny-delay"

declare const window: any

// function getCurStore(mongo: Collection) {
//   return mongo.find({}).toArray()
// }






(async () => {

  const srcOb = {a: {b: 2}, c: "cc"};
  (srcOb as any).a.d = srcOb
  const val = josmLocalStorageReflection("testKey", srcOb);

  console.log(val())
  val.a.b.set(3)
  const resOb1 = {a: {b: 3, d: undefined}, c: "cc"}
  resOb1.a.d = resOb1
  console.log(val());


  (val as any).a.d.a.b.set(4)
  
  const resOb2 = {a: {b: 4, d: undefined}, c: "cc"}
  resOb2.a.d = resOb2;
  console.log(val())

  const val2 = josmLocalStorageReflection("testKey", srcOb);
  console.log(val2())



  // const p = new Promise<void>((res, rej) => {
  //   setTimeout(() => {
  //     console.log("1")
  //     rej()
  //   }, 1000)
  // })

  // p.then(() => {
  //   // return Promise.reject()
  //   console.log("then")
  // }).finally(() => {
  //   console.log("finally")
  // })

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