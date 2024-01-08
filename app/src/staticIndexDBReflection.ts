import { parseDataDiff } from "./fsReflection";
import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import idb, { openDB } from "idb"


type OnUpgradeFunctionType = (database: idb.IDBPDatabase<unknown>, oldVersion: number, newVersion: number, transaction: idb.IDBPTransaction<unknown, string[], "versionchange">, event: IDBVersionChangeEvent) => void


const defaultStoreName = "defaultStoreName"
export const openIndexedDB = (dbName: string, createSchemaF_objStoreName_list: OnUpgradeFunctionType | string[] | string = defaultStoreName, version?: number) => {
  return openDB(dbName, version, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      if (createSchemaF_objStoreName_list instanceof Function) createSchemaF_objStoreName_list(db, oldVersion, newVersion, transaction, event)
      else {
        const objStoreNameList = createSchemaF_objStoreName_list instanceof Array ? createSchemaF_objStoreName_list : [createSchemaF_objStoreName_list]
        for (const objStoreName of objStoreNameList) {
          if (!db.objectStoreNames.contains(objStoreName)) {
            db.createObjectStore(objStoreName)
          }
        }
      }
    }
  })
};




export function staticIndexDBToAdapter({db, storeName = defaultStoreName, objId = 0}: {db: idb.IDBPDatabase, storeName?: string, objId?: number}) {

  function msg(accessType: "readwrite" | "readonly" = "readonly") {
    const transaction = db.transaction([storeName], accessType)
    const store = transaction.objectStore(storeName)
    return {transaction, store, data: store.get(objId)}
  } 


  return {
    msg() {
      return msg().data
    },
    async send(diff: any) {
      const { store, data } = msg("readwrite")
      await store.put(parseDataDiff(await data, diff), objId)
    },
    [isAdapterSym]: true
  } as const
}



export const josmStaticIndexDBReflection = makeJosmReflection(staticIndexDBToAdapter)


