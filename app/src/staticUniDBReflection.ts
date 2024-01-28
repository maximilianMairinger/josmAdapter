import { SimpleUniDB, parseDataDiff } from "./lib";
import { isAdapterSym } from "./fullyConnectedAdapter"
import clone, { mergeKeysDeep } from "circ-clone"
import { makeJosmReflection } from "./josmReflection";
import { CancelAblePromise } from "more-proms";



export async function simpleUniDBToAdapter(db: SimpleUniDB) {

  let tempDiffStorage: object | undefined
  let isTempDiffStorageSet: boolean = false

  return {
    msg() {  
      return db.transaction(async () => {
        // In case this returns a cancelAble Promise, we wrap it here, so that it cannot be canceled
        return await db.findOne()
      }).then((storedData) => 
        isTempDiffStorageSet ? parseDataDiff(storedData, tempDiffStorage) : storedData
      )
    },
    async send(_dataDiff: any) {
      const dataDiff = clone(_dataDiff)

      function onCancel() {
        isTempDiffStorageSet = true
        tempDiffStorage = mergeKeysDeep(tempDiffStorage, dataDiff)
      }

      db.transaction(() => {
        const diff = mergeKeysDeep(tempDiffStorage, dataDiff)
        isTempDiffStorageSet = false
        tempDiffStorage = undefined
        // This may return a cancelAble Promise.
        const prom = db.updateOne(diff as any)
        return !("cancel" in (prom as CancelAblePromise)) ? prom : (prom as CancelAblePromise).then(undefined, undefined, async (reason) => {
          const res = await (prom as CancelAblePromise<any, any, any>).cancel(reason)
          onCancel()
          return res
        })
      }, { 
        skipAble: onCancel, 
        access: "readwrite", 
        skipPrevIfPossible: true
      })
    },
    [isAdapterSym]: true
  } as const
}



export const josmStaticUniDBReflection = makeJosmReflection(simpleUniDBToAdapter)




