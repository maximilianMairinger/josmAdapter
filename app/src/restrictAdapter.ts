import { Adapter, promifyFunction } from "./fullyConnectedAdapter";
import { any } from "sanitize-against"
import { cloneKeysAndMapProps } from "circ-clone"


export function restrictAdapter<T>(adapter: Adapter<T>, {write: checkWrite = (e) => e, read: checkRead = (e) => e}: {write?: <MyT extends Partial<T>>(t: MyT) => Partial<MyT>, read?: (t: T) => Partial<T>}) {
  if (adapter.msg !== undefined) {
    const promCheckRead = promifyFunction(checkRead)
    const ogMsg = adapter.msg.bind(adapter)
    adapter.msg = () => {
      return promCheckRead(ogMsg()) as any
    }
  }
  if (adapter.onMsg !== undefined) {
    const ogOnMsg = adapter.onMsg.bind(adapter)
    adapter.onMsg = (cb) => {
      return ogOnMsg((e) => {
        return cb(checkRead(e))
      })
    }
  }
  if (adapter.send !== undefined) {
    const ogSend = adapter.send.bind(adapter)
    adapter.send = (e) => {
      return ogSend(checkWrite(e)) as any
    }
  }
  return adapter
}

type Reflection = {
  [key in string | number]: Reflection | boolean
}


export function reflectionToSaniTemplate(reflection: Reflection) {
  return cloneKeysAndMapProps(reflection, (val) => {
    if (val === true) return any
    else if (val === false) return () => {throw new Error("Explicitly disallowed setting this value")}
    else throw new Error("Invalid reflection")
  }, (key) => key + "?")
}

export function saniTemplateToReflection(template: any) {
  return cloneKeysAndMapProps(template, (val) => {
    if (val === any) return true
    else if (typeof val === "function") return false
    else throw new Error("Invalid template")
  }, (key) => key.endsWith("?") ? key.slice(0, -1) : key)
}

