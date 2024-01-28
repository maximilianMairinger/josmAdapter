import { fsToSimpleUniDB } from "./fsToSimpleUniDB"
import { makeJosmReflection } from "./josmReflection"
import { simpleUniDBToAdapter } from "./staticUniDBReflection"



export const josmStaticFsReflection = makeJosmReflection(async (a: Parameters<typeof fsToSimpleUniDB>[0]) => {
  return simpleUniDBToAdapter(await fsToSimpleUniDB(a))
})
