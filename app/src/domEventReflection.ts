import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { EdomElementEventMap, EventListener } from "extended-dom"
import LinkedList from "fast-linked-list";




export function eventListenerToAdapter<Value, Event extends keyof EdomElementEventMap>({listener, value}: {listener: EventListener<Event>, value: (e?: EdomElementEventMap[Event]) => Value}) {
  const ls = new LinkedList<(data: unknown) => void>()

  listener.listener((ee) => {
    const val = value(ee)
    for (const cb of ls) cb(val)
  })

  return {
    onMsg(cb: (e: Value) => void) {
      const tok = ls.push(cb)
      return tok.rm.bind(tok)
    },
    msg: value,
    [isAdapterSym]: true
  } as const
}



export const josmEventReflection = makeJosmReflection(eventListenerToAdapter, true)
