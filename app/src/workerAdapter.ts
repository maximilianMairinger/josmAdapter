import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";
import { fullyConnectedJosmAdapter, TransmissionAdapter, makeAdapterPair, isAdapterSym } from "./josmAdapter"

type Work = Omit<Worker, "terminate" | "onmessage" | "onmessageerror" | "onerror">

export function workerToAdapter(worker: Work): TransmissionAdapter {
  return {
    send(data) {
      worker.postMessage(data)
    },
    onMsg(cb, once: boolean = false) {
      const listener = (ev: MessageEvent) => {
        cb(ev.data)
      }
      worker.addEventListener("message", listener, { once })
      return () => {
        try {
          worker.removeEventListener("message", listener)
          return true
        }
        catch(e) {
          return false
        }
      }
    },
    closing: new Promise((res) => {
      worker.addEventListener("error", res as any, {once: true})
      worker.addEventListener("messageerror", res as any, {once: true})
    }),
    [isAdapterSym]: true
  }
}

export const { josmAdapter: workerJosmAdapter, josmAdapterClient: workerJosmAdapterClient } = makeAdapterPair(workerToAdapter)


