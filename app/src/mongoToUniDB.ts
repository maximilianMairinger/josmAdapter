import { Collection, MongoClient, Db, ObjectId, ClientSession } from "mongodb";
import { UniDB, defaultTransactionOptions } from "./lib";
import { execQueue, CancelAblePromise } from "more-proms"
import { memoize } from "key-index";



export async function makeMongoClient({dbName, collectionName, mongoURI = "mongodb://localhost:27017"}: {dbName: string, collectionName: string, mongoURI?: string}) {
  const client = await MongoClient.connect(mongoURI)
  const db = client.db(dbName)
  const collection = db.collection(collectionName)
  return { client, collection }
}

type ID = ObjectId
export async function mongoDBToUniDB({ client, collection }: {client: MongoClient, collection: Collection }): Promise<UniDB & {closeSession: () => Promise<void>}> {
  const db = collection

  const doc = await db.findOne({})
  let rootId: ID
  if (!doc) rootId = doc !== null ? doc._id : await insertOne({})

  const session = client.startSession()

  async function findOne(_id: ID = rootId) {
    isInTransactionCheck()
    return db.findOne({ _id }, {projection: { _id: false }})
  }

  async function insertOne(doc: object) {
    isInTransactionCheck()
    if (doc["_id"] !== undefined) throw new Error("cannot insert _id")
    return db.insertOne(doc).then((r) => r.insertedId) as Promise<ID>
  }

  async function updateOne(diff: {[key: string]: undefined | unknown}, _id: ID = rootId) {
    isInTransactionCheck()
    const toBeAdded = Object.create(null)
    const toBeRm = Object.create(null)
    for (const key in diff) {
      if (diff[key] === undefined) toBeRm[key] = undefined
      else toBeAdded[key] = diff[key]
    }

    await db.updateOne({ _id }, { $set: toBeAdded, $unset: toBeRm })
  }


  function closeSession() {
    return session.endSession()
  }

  let currentlyInTransaction = false
  function isInTransactionCheck() {
    if (!currentlyInTransaction) throw new Error("not in transaction")
  }


  const runInQ = execQueue()
  function transaction(f: () => Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>, options?: typeof defaultTransactionOptions) {
    options = {...defaultTransactionOptions, ...options}
    const conf = {
      readConcern: { level: "local" }
    } as {
      readConcern: { level: "local" },
      writeConcern?: { w: 1 }
    }
    if (options.access === "readwrite") conf.writeConcern = { w: 1 }

    return runInQ(() => {
      currentlyInTransaction = true
      session.startTransaction(conf)
      
      let fRes: Promise<any> | CancelAblePromise

      try {
        fRes = f()
      }
      catch(e) {
        let abortProm: Promise<void>
        return new CancelAblePromise(async (res, rej) => {
          abortProm = session.abortTransaction()
          await abortProm
          rej(e)
        }, async () => {
          await session.abortTransaction()
        })
      }

      const abortTransaction = memoize(async () => {
        currentlyInTransaction = false
        await session.abortTransaction()
      })
      return (fRes as CancelAblePromise).then(async () => {
        await commitWithRetry(session)
        currentlyInTransaction = false
      }, async () => {
        await abortTransaction()
      }, "cancel" in fRes ? async (reason) => {
        await abortTransaction()
        await (fRes as CancelAblePromise<any, any, any>).cancel(reason)
      } : undefined)
    }, {skipAble: options.skipAble}, true)
  }


  return {
    findOne,
    insertOne,
    updateOne,
    transaction: transaction as any,
    closeSession,
    rootId
  }

}


// Retries commit if UnknownTransactionCommitResult encountered
function commitWithRetry(session: ClientSession) {
  while (true) {
    try {
      return session.commitTransaction(); // Uses write concern set at transaction start.
    } catch (error) {
      // Can retry commit
      if (error.hasOwnProperty("errorLabels") && error.errorLabels.includes("UnknownTransactionCommitResult") ) {
        console.warn("UnknownTransactionCommitResult, retrying commit operation ...");
        continue;
      } else {
        throw error;
      }
    }
  }
}


