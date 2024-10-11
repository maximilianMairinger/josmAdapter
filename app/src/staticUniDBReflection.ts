import { SimpleUniDB, parseDataDiff } from "./lib";
import { isAdapterSym } from "./fullyConnectedAdapter"
import clone, { cloneKeys, mergeKeysDeep } from "circ-clone"
import { makeJosmReflection } from "./josmReflection";
import { CancelAblePromise } from "more-proms";
import { memoize } from "key-index";


let sendIndex = -1

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
      sendIndex++
      const mySendIndex = sendIndex
      // console.log("sendIndex", sendIndex, cloneKeys(_dataDiff))
      const dataDiff = clone(_dataDiff)

      const onCancel = memoize(() => {
        // console.log("sendCancel", mySendIndex)
        isTempDiffStorageSet = true
        tempDiffStorage = mergeKeysDeep(tempDiffStorage, dataDiff)
      });

      (db.transaction(() => {
        // console.log("sendTransaction start", mySendIndex)
        const diff = mergeKeysDeep(tempDiffStorage, dataDiff)
        isTempDiffStorageSet = false
        tempDiffStorage = undefined
        // This may return a cancelAble Promise.
        return db.updateOne(diff as any)
      }, { 
        skipAble: () => {console.log("nextSendCancelIsActuallyASkip");return onCancel()}, 
        access: "readwrite", 
        skipPrevIfPossible: true
      }) as CancelAblePromise).then(undefined, undefined, async (reason) => {
        onCancel()
      })
    },
    [isAdapterSym]: true
  } as const
}




export const josmStaticUniDBReflection = makeJosmReflection(simpleUniDBToAdapter)




