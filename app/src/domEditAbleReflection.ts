import { isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import LinkedList from "fast-linked-list";




export function domEditAbleReflection(target: HTMLInputElement | HTMLTextAreaElement) {
  const ls = new LinkedList<(data: unknown) => void>()

  target.addEventListener("input", () => {
    for (const cb of ls) cb(target.value)
  })

  return {
    onMsg(cb) {
      const tok = ls.push(cb)
      return tok.rm.bind(tok)
    },
    send(v: string) {
      target.value = v
    },
    msg() {
      return target.value
    },
    [isAdapterSym]: true
  } as const
}



export const josmEditAbleReflection = makeJosmReflection(domEditAbleReflection)
