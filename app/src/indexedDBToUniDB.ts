import idb, { openDB } from "idb";
import { execQueue, CancelAblePromise } from "more-proms"
import { UniDB, parseDataDiff } from "./lib";
import { defaultTransactionOptions } from "./lib"
import { memoize } from "key-index";


type ObjStoreName = string
export async function makeIndexedDBClient({dbName, objStoreName}: {dbName: string, objStoreName: ObjStoreName}) {
  return {db: await openDB(dbName, 4, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      try {
        db.createObjectStore(objStoreName, { autoIncrement: true })
      }
      catch(e) {}
    }
  }), collectionName: objStoreName}
};


export type IDBPCollection = { db: idb.IDBPDatabase, collectionName: string }
type ID = number
export function indexedDBToUniDB({db, collectionName}: IDBPCollection): UniDB<ID> {
  const rootId = 0

  let collectionInTransaction: idb.IDBPObjectStore<unknown, string[], string, "readwrite" | "readonly">

  async function findOne(id: ID = rootId) {
    isInTransactionCheck()
    return collectionInTransaction.get(id)
  }

  async function insertOne(doc: object) {
    isInTransactionCheck()
    return collectionInTransaction.add(doc) as Promise<ID>
  }

  async function updateOne(diff: { [key: string]: undefined | unknown }, id: ID = rootId) {
    isInTransactionCheck()
    await collectionInTransaction.put(parseDataDiff(await findOne(id), diff), id)
  }

  let currentlyInTransaction = false
  function isInTransactionCheck() {
    if (!currentlyInTransaction) throw new Error("not in transaction")
  }

  const runInQ = execQueue()
  // important this promise may never resolve, when it is canceled or skipped. This is only relevant when the passed in promise from f is a CancelAblePromise. In this case the provider (f) should listen to on cancel events.
  function transaction(f: () => Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>, options?: typeof defaultTransactionOptions) {
    options = {...defaultTransactionOptions, ...options}
    return runInQ(() => {
      currentlyInTransaction = true
      const transaction = db.transaction([collectionName], options.access)
      collectionInTransaction = transaction.objectStore(collectionName)
      
      let fRes: Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>
      try {
        fRes = f()
      }
      catch(e) {
        return CancelAblePromise.reject(e)
      } 

      


      const abortTransaction = memoize(() => {
        currentlyInTransaction = false
        collectionInTransaction.transaction.abort()
      })
      return (fRes as CancelAblePromise).then(async (res) => {
        await transaction.done
        currentlyInTransaction = false
        return res
      }, (e) => {
        abortTransaction()
      }, "cancel" in fRes ? async (reason) => {
        abortTransaction()
        await (fRes as CancelAblePromise<any, any, any>).cancel(reason)
      } : undefined)
      
      
    }, {skipAble: options.skipAble}, options.skipPrevIfPossible)
  }


  return {
    findOne,
    insertOne,
    updateOne,
    transaction: transaction as any,
    rootId
  }
}