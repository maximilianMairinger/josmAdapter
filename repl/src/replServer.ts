import setupServer from "./setupServer"
import { websocketJosmAdapterServer, websocketJosmAdapterClient } from "./../../app/src/wsAdapter"
import { DataBase } from "josm"
import delay from "tiny-delay"
import { josmFsReflection } from "../../app/src/fsReflection"
import { josmMongoReflection } from "../../app/src/mongoReflection"




setupServer("test").then(async ({app, db: mongo}) => {

  const db = new DataBase({
    whooop: 1,
    secs: 1
  })

  // josmFsReflection("lelol", db)
  const lel = josmMongoReflection(mongo.collection("testDB"), db)


  db((full, diff) => {
    console.log(diff)
  })

  // setInterval(() => {
  //   db.secs.set(db.secs.get() + 1)
  // }, 1000)

  app.ws("/con1", async (ws) => {
    websocketJosmAdapterServer(ws, db, true, false)

    
    
  })


})
