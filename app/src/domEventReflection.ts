import { SecondaryStoreAdapter, isAdapterSym } from "./josmAdapter"
import { makeJosmReflection } from "./josmReflection";
import { EventListener } from "extended-dom"
import LinkedList from "fast-linked-list";




export function eventReflection({listener, value}: {listener: EventListener, value: () => unknown}): SecondaryStoreAdapter {
  const ls = new LinkedList<(data: unknown) => void>()

  listener.listener(() => {
    const val = value()
    for (const cb of ls) cb(val)
  })

  return {
    onMsg(cb) {
      const tok = ls.push(cb)
      return tok.rm.bind(tok)
    },
    msg: value,
    [isAdapterSym]: true
  }
}



export const josmEventReflection = makeJosmReflection(eventReflection)
