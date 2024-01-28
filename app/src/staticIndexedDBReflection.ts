import { indexedDBToUniDB, makeIndexedDBClient } from "./indexedDBToUniDB"
import { makeJosmReflection } from "./josmReflection"
import { simpleUniDBToAdapter } from "./staticUniDBReflection"



export const josmStaticIndexDBReflection = makeJosmReflection(async (a: Parameters<typeof makeIndexedDBClient>[0]) => {
  return simpleUniDBToAdapter(indexedDBToUniDB(await makeIndexedDBClient(a)))
})
