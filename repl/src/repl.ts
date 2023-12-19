import { josmLocalStorageReflection, josmEventReflection, josmFsReflection } from "../../app/src/josmAdapter"
import clone from "circ-clone"
import fs from "fs"
import path from "path"
import { josmMongoReflection } from "../../app/src/mongoReflection"
import { Collection, MongoClient } from "mongodb"


declare const window: any

function getCurStore(mongo: Collection) {
  return mongo.find({}).toArray()
}


(async () => {
  // localStorage.clear()

  // fs.unlinkSync(path.resolve("leltest"))

  const client = await MongoClient.connect("mongodb://localhost:27017")
  const superDB = client.db("test123")
  const db = superDB.collection("lel123")

  // await db.deleteMany({})
  debugger
  const lel = await josmMongoReflection(db, {
    whoop: false,
  })


  console.log("-----")
  console.log(clone(lel()))
  console.log(await getCurStore(db))



  // const ob = {
  //   q: 1,
  //   circ1: {q: 2}
  // } as any

  


  // lel(ob)
  // console.log("-----")
  // console.log(clone(lel()))
  // console.log(await getCurStore(db))




  // lel({circ1: {circ2: lel()}})

  // console.log("-----")
  // console.log(clone(lel()))
  // console.log(await getCurStore(db))



  // await client.close()
  
  
  // window.lel = lel
})()