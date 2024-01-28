import { SimpleUniDB, parseDataDiff } from "./lib";
import { isAdapterSym } from "./fullyConnectedAdapter"
import clone, { mergeKeysDeep } from "circ-clone"
import { makeJosmReflection } from "./josmReflection";



export async function simpleUniDBToAdapter(db: SimpleUniDB) {

  let tempDiffStorage: object | undefined

  return {
    msg() {
      return db.transaction(async () => {
        // In case this returns a cancelAble Promise, we wrap it here, so that it cannot be canceled
        return await db.findOne()
      }).then((storedData) => parseDataDiff(storedData, tempDiffStorage))
    },
    async send(_dataDiff: any) {
      const dataDiff = clone(_dataDiff)
      db.transaction(async () => {
        const diff = mergeKeysDeep(tempDiffStorage, dataDiff)
        tempDiffStorage = undefined
        await db.updateOne(diff as any)
      }, { 
        skipAble: () => {
          tempDiffStorage = mergeKeysDeep(tempDiffStorage, dataDiff)
        }, 
        access: "readwrite", 
        skipPrevIfPossible: true
      })
    },
    [isAdapterSym]: true
  } as const
}



export const josmStaticUniDBReflection = makeJosmReflection(simpleUniDBToAdapter)




