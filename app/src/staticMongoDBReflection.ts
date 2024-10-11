import { makeJosmReflection } from "./josmReflection"
import { makeMongoClient, mongoDBToUniDB } from "./mongoToUniDB"
import { simpleUniDBToAdapter } from "./staticUniDBReflection"



export const josmStaticMongoDBReflection = makeJosmReflection(async (a: Parameters<typeof makeMongoClient>[0]) => {
  return simpleUniDBToAdapter(await mongoDBToUniDB(await makeMongoClient(a)))
})
