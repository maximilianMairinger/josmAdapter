import setupServer from "./setupServer"
import { 
  websocketJosmAdapterServer, 
  websocketJosmAdapterClient, 
  restrictAdapter, 
  reflectionToSaniTemplate, 
  dataBaseToAdapter,
  josmStaticFsReflection,
  fsToSimpleUniDB
} from "./../../app/src/josmAdapter"
import { DataBase } from "josm"
import delay from "tiny-delay"
// import { josmFsReflection } from "../../app/src/fsReflection"
import { josmMongoReflection } from "../../app/src/mongoReflection"
import sani, { AND } from "sanitize-against"
import cloneKeys from "circ-clone"
import { encode, decode } from "circ-msgpack"
import { promises as fs } from "fs"
import { simpleUniDBToAdapter } from "../../app/src/staticUniDBReflection"




setupServer("test").then(async ({app, db: mongo}) => {


  const adapter = await simpleUniDBToAdapter(await fsToSimpleUniDB("test123"))

  adapter.msg().then((msg) => {
    console.log("msg1", msg)
  })

  adapter.send({ q: 1, circ2: { $ref: "#"}})


  adapter.msg().then((msg) => {
    console.log("msg2", msg)
  })
  


  adapter.send({ q: 2})

  adapter.msg().then((msg) => {
    console.log("msg3", msg)
  })


  // console.log("")
  // console.log("")
  // console.log("start")

  // const db = await josmStaticFsReflection("test123", {
  //   lel: 2,
  //   lol: "lol"
  // })



  // db.lel.set(1)
  // db.lel.set(2)

  // console.log(cloneKeys(db()))

  // console.log("end")













  // const db = new DataBase({
  //   whooop: 1,
  //   secs: 1,
  //   pw: "PRIVATE"
  // })

  // // josmFsReflection("lelol", db)
  // josmMongoReflection(mongo.collection("testDB"), db)


  // db((full, diff) => {
  //   console.log("diff", diff)
  // })

  // // setInterval(() => {
  // //   db.secs.set(db.secs.get() + 1)
  // // }, 1000)

  // app.ws("/con1", async (ws) => {
  //   const userRights = {
  //     read: {
  //       secs: true,
  //       whooop: true
  //     },
  //     write: {
  //       secs: true
  //     }
  //   }

  //   const userReadRequest = {
  //     secs: true,
  //     whooop: true
  //   }

  //   const readRestrictionsAsReflection = [userRights.read, userReadRequest]

  //   const readRestrictionsAsSaniTemplate = readRestrictionsAsReflection.map(reflectionToSaniTemplate) as any[]
  //   // @ts-ignore
  //   const saniF = sani(new AND(...readRestrictionsAsSaniTemplate))
  //   const restrictedDBAdapter = restrictAdapter(dataBaseToAdapter(db), {
  //     read: saniF,
  //     write: sani(reflectionToSaniTemplate(userRights.write)) as any
  //   })



  //   websocketJosmAdapterServer(ws, restrictedDBAdapter, true, false)

    
    
  // })


})
