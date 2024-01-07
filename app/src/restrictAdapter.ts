import { Adapter, promifyFunction } from "./fullyConnectedAdapter";
import { any } from "sanitize-against"
import { cloneKeysAndMapProps } from "circ-clone"


export function restrictAdapter<Ad extends {msg?: Function, onMsg?: Function, send?: Function}>(adapter: Ad, {write: checkWrite = (e) => e, read: checkRead = (e) => e}: {write?: Function, read?: Function}): Ad {
  if (adapter.msg !== undefined) {
    const promCheckRead = promifyFunction(checkRead as ((a: undefined) => unknown))
    const ogMsg = adapter.msg.bind(adapter)
    adapter.msg = () => {
      return promCheckRead(ogMsg())
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
      const toBeSent = checkWrite(e)
      if (typeof toBeSent === "object" && toBeSent !== null && Object.keys(toBeSent).length === 0) return
      ogSend(toBeSent)
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

