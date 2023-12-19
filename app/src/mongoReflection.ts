import { Collection, ObjectId } from "mongodb"
import { isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection"

export const toPointer = (parts) => '#' + ["", ...parts].map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')
export const resolvePointer = (pointer) => {
  let p = pointer.slice(1)
  const ar = [] as any[]
  if (p === "") return ar
  p = p.slice(1)
  for (const part of p.split('/').map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    ar.push(part)
  }
  return ar
}


export async function mongoToAdapter(db: Collection<any>) {

  // const client = await MongoClient.connect("mongodb://localhost:27017", { useUnifiedTopology: true })
  // const superDB = client.db(dbName)
  // const db = superDB.collection(collectionName)

  let _rootId = await db.findOne({})
  if (!_rootId) {
    const ret = await db.insertOne({})
    _rootId = ret.insertedId
  }
  else {
    _rootId = _rootId._id
  }
  const rootId = _rootId



  async function lookupIdAtPath(paths: string[]) {
    let _id = rootId
    if (paths.length === 0 || (paths.length === 1 && paths[0] === "")) return _id
    for (const path of paths) {
      _id = (await db.findOne({ _id }, { projection: { _id: false, [path]: true } }))[path]
      if (!_id) return null
    }
    return _id
  }

  // does this ensure that no malicious _id are set? A: no, but mongo throws if we try, as it is immutable. And I think throwing is better than ignoring in this case.
  function mergeObjectToMongoObject(object: object, _id: any) {
    const memoJsToMongo: Map<object, ObjectId | Promise<ObjectId>> = new Map()
    return recMergeObjectToMongoObjectRec(object, _id)
    async function recMergeObjectToMongoObjectRec(object: object, _id: any) {
      const haveId = _id !== undefined
      let resMemo: (id: ObjectId) => void
      if (haveId) memoJsToMongo.set(object, _id)
      else memoJsToMongo.set(object, new Promise<ObjectId>((res) => {resMemo = res}))
      const localAddOb = {}
      const localRmOb = {}
      const nestedOb = {}
      const linkOb = {}
      for (const key in object) {
        const val = object[key]
        if (val instanceof Object) {
          const kk = Object.keys(val)[0]
          if (kk === "$ref" && typeof val[kk] === "string") {
            if (val[kk].startsWith("##")) {
              val[kk] = val[kk].slice(1)
              nestedOb[key] = true
            }
            else linkOb[key] = resolvePointer(val[kk])
          }
          else nestedOb[key] = true
        }
        else {
          if (val === undefined) localRmOb[key] = false
          else localAddOb[key] = val
            
            
          
        }
      }
  
  
      let surely_id: Promise<ObjectId>
  
      const linkRes = (async () => {
        const prom = [] as Promise<void>[]
        for (const key in linkOb) {
          prom.push(lookupIdAtPath(linkOb[key]).then((id) => {
            if (id !== null) localAddOb[key] = id
          }))
        }
        await Promise.all(prom)
      })()
  
  
      const proms = [] as Promise<any>[]
      if (haveId) {
        surely_id = Promise.resolve(_id)
        
        // transaction??? 
        await db.findOne({ _id }, { projection: { ...nestedOb, _id: false } }).then(insertIdsRecursively).then(async (updateOb) => {
          await linkRes
          // unhandled: if replacing a reference to another document, delete it if no no other references are present
          await db.updateOne({ _id }, { $set: { ...localAddOb, ...updateOb }, $unset: localRmOb })
        })
        
        
      }
      else {
        let resId: Function
        surely_id = new Promise((res) => {resId = res})
        return await insertIdsRecursively({}).then(async (updateOb) => {
          await linkRes
          const { insertedId } = (await db.insertOne({ ...localAddOb, ...updateOb }))
          resMemo(insertedId)
          resId(insertedId)
          return insertedId
        })
      }
  
      
  
  
  
  
  
  
      async function insertIdsRecursively(ids: any) {
        const newProms = [] as Promise<{key, insertedId}>[]
        for (const key in nestedOb) {
          const memo = memoJsToMongo.get(object[key])
          if (memo !== undefined) {
            proms.push((async () => {
              const wemo = await memo
              if (!wemo.equals(ids[key])) await db.updateOne({ _id: await surely_id }, { $set: { [key]: wemo } })
            })())
  
            continue
          }
          const res = recMergeObjectToMongoObjectRec(object[key], ids[key])
          
          if (!(ids[key] instanceof ObjectId)) newProms.push(res.then((insertedId) => {return {key, insertedId}}))
          else proms.push(res)
        }
        const insertedList = await Promise.all(newProms)
        const updateOb = {}
        for (const inserted of insertedList) {
          if (inserted !== undefined) updateOb[inserted.key] = inserted.insertedId
        }
        return updateOb
      }
  
  
      await Promise.all(proms)
      
    }
  }
  

  








  // converts the mongodb relations via ObjectID to js relations
  function restrictedMongoObjectToJsObject(_id: ObjectId, projection: object = {}) {
    const memoMonToJs: Map<string, object> = new Map()
    return recRestrictedMongoObjectToJsObjectRec(_id, projection)
    async function recRestrictedMongoObjectToJsObjectRec(_id: ObjectId, projection: object = {}) {
      const memoFinding = memoMonToJs.get(_id.toString())
      if (memoFinding !== undefined) return memoFinding
      const endOb = {}
      memoMonToJs.set(_id.toString(), endOb)
  
      const localProjection = {} as object
      for (const key in projection) {
        if (projection[key] !== undefined) continue
        localProjection[key] = true
      }
      (localProjection as any)._id = false
  
      const mongoOb = await db.findOne({ _id }, { projection: localProjection })
  
      let proms = [] as Promise<void>[]
      for (const key in mongoOb) {
        if (mongoOb[key] instanceof ObjectId) {
          proms.push(recRestrictedMongoObjectToJsObjectRec(mongoOb[key], projection[key]).then((r) => {
            endOb[key] = r
          }))
        }
        else {
          endOb[key] = mongoOb[key]
        }
      }
      await Promise.all(proms)
  
  
      return endOb
    }
  }
  







  return {
    async msg(projection?: object) {
      const ret = await restrictedMongoObjectToJsObject(rootId, projection)
      return ret as object
    },
    async send(dataDiff: any) {
      if (!(typeof dataDiff === "object" && dataDiff !== null)) throw new Error("dataDiff must be an object")
      await mergeObjectToMongoObject(dataDiff, rootId)
    },
    [isAdapterSym]: true
  } as const
}



export const josmMongoReflection = makeJosmReflection(mongoToAdapter)
