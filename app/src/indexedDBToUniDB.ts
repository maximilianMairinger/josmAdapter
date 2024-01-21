import idb, { openDB } from "idb";
import { execQueue, CancelAblePromise } from "more-proms"
import { parseDataDiff } from "./util";


export const defaultTransactionOptions = {access: "readonly", skipAble: false} as {access?: "readwrite" | "readonly", skipAble?: boolean}
export class IDBPCollection {
  public constructor(public db: idb.IDBPDatabase, public collectionName: string) { }
}

type ObjStoreName = string
const defaultStoreName = "defaultStoreName"
export async function openIndexedDBCollection(dbName: string, objStoreName: ObjStoreName = defaultStoreName) {
  return new IDBPCollection(await openDB(dbName, 4, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      try {
        db.createObjectStore(objStoreName, { autoIncrement: true })
      }
      catch(e) {}
    }
  }), objStoreName)
};


export type UniDB<ID = unknown> = {
  findOne(id: ID): Promise<unknown> 
  insertOne(doc: object): Promise<ID>
  updateOne(id: ID, diff: { [key: string]: undefined | unknown }): Promise<void>
  transaction<T, R extends Promise<T> | CancelAblePromise<T, string, Promise<void> | undefined>>(f: () => R, options?: typeof defaultTransactionOptions): R
  rootId: ID
}


type ID = number
export function indexedDBToUniDB({db, collectionName}: IDBPCollection): UniDB<ID> {
  const rootId = 0

  let collectionInTransaction: idb.IDBPObjectStore<unknown, string[], string, "readwrite" | "readonly">

  function findOne(id: ID) {
    return collectionInTransaction.get(id)
  }

  function insertOne(doc: object) {
    return collectionInTransaction.add(doc) as Promise<ID>
  }

  async function updateOne(id: ID, diff: { [key: string]: undefined | unknown }) {
    collectionInTransaction.put(parseDataDiff(await findOne(id), diff), id)
  }


  const runInQ = execQueue()
  // important this promise may never resolve, when it is canceled or skipped
  function transaction(f: () => Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>, options?: typeof defaultTransactionOptions) {
    options = {...defaultTransactionOptions, ...options}
    return runInQ(() => {
      const transaction = db.transaction([collectionName], options.access)
      collectionInTransaction = transaction.objectStore(collectionName)
      
      let fRes: Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>
      try {
        fRes = f()
      }
      catch(e) {
        return Promise.reject(e)
      }

      



      return (fRes as CancelAblePromise).then(() => {
        return transaction.done
      }, undefined, "cancel" in fRes ? async (reason) => {
        await (fRes as CancelAblePromise<any, any, any>).cancel(reason)
        collectionInTransaction.transaction.abort()
      } : undefined)
      
      
    }, {skipAble: options.skipAble})
  }


  return {
    findOne,
    insertOne,
    updateOne,
    transaction: transaction as any,
    rootId
  }
}