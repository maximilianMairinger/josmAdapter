import { Collection, MongoClient, Db, ObjectId, ClientSession } from "mongodb";
import { UniDB, defaultTransactionOptions } from "./indexedDBToUniDB";
import { execQueue, CancelAblePromise } from "more-proms"



export async function mongoDBToUniDB<ID extends ObjectId>({client, db }: {client: MongoClient, db: Collection }): Promise<UniDB & {closeSession: () => Promise<void>}> {

  const doc = await db.findOne({})
  let rootId: ObjectId
  if (!doc) rootId = doc !== null ? doc._id : await insertOne({})

  const session = client.startSession()

  function findOne(_id: ID) {
    return db.findOne({ _id }, {projection: { _id: false }})
  }

  function insertOne(doc: object) {
    if (doc["_id"] !== undefined) throw new Error("cannot insert _id")
    return db.insertOne(doc).then((r) => r.insertedId) as Promise<ID>
  }

  async function updateOne(_id: ID, diff: {toBeAdded?: object, toBeRemoved?: string[] | {[key: string]: undefined | null}}) {
    let toBeRm: any
    if (diff.toBeRemoved instanceof Array) {
      toBeRm = Object.create(null)
      for (const iterator of diff.toBeRemoved) {
        // if (iterator === "_id") throw new Error("cannot remove _id")
        // the above check happens at mongodb level
        toBeRm[iterator] = null
      }
    }
    else toBeRm = diff.toBeRemoved

    let action = {}
    if (diff.toBeAdded !== undefined) action["$set"] = diff.toBeAdded
    if (toBeRm !== undefined) action["$unset"] = toBeRm

    await db.updateOne({ _id }, action)
  }


  function closeSession() {
    return session.endSession()
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
      session.startTransaction(conf)
      
      let fRes: Promise<any> | CancelAblePromise

      try {
        fRes = f()
      }
      catch(e) {
        return (async () => {
          await session.abortTransaction()
          throw e
        })()
      }


      return (fRes as CancelAblePromise).then(() => commitWithRetry(session), () => session.abortTransaction(), "cancel" in fRes ? async (reason) => {
        await (fRes as CancelAblePromise<any, any, any>).cancel(reason)
        await session.abortTransaction()
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