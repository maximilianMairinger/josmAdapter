import setupServer from "./setupServer"
import { 
  websocketJosmAdapterServer, 
  websocketJosmAdapterClient, 
  restrictAdapter, 
  reflectionToSaniTemplate, 
  dataBaseToAdapter
} from "./../../app/src/josmAdapter"
import { DataBase } from "josm"
import delay from "tiny-delay"
import { josmFsReflection } from "../../app/src/fsReflection"
import { josmMongoReflection } from "../../app/src/mongoReflection"
import sani, { AND } from "sanitize-against"




setupServer("test").then(async ({app, db: mongo}) => {

  const db = new DataBase({
    whooop: 1,
    secs: 1,
    pw: "PRIVATE"
  })

  // josmFsReflection("lelol", db)
  josmMongoReflection(mongo.collection("testDB"), db)


  db((full, diff) => {
    console.log("diff", diff)
  })

  // setInterval(() => {
  //   db.secs.set(db.secs.get() + 1)
  // }, 1000)

  app.ws("/con1", async (ws) => {
    const userRights = {
      read: {
        secs: true,
        whooop: true
      },
      write: {
        secs: true
      }
    }

    const userReadRequest = {
      secs: true,
      whooop: true
    }

    const readRestrictionsAsReflection = [userRights.read, userReadRequest]

    const readRestrictionsAsSaniTemplate = readRestrictionsAsReflection.map(reflectionToSaniTemplate) as any[]
    // @ts-ignore
    const saniF = sani(new AND(...readRestrictionsAsSaniTemplate))
    const restrictedDBAdapter = restrictAdapter(dataBaseToAdapter(db), {
      read: saniF,
      write: sani(reflectionToSaniTemplate(userRights.write)) as any
    })



    websocketJosmAdapterServer(ws, restrictedDBAdapter, true, false)

    
    
  })


})
