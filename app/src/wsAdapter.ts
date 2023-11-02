import { stringify, parse } from "circ-json"
import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";
import { WebSocket as NodeWebSocket } from "ws";
import { TransmissionAdapter, makeAdapterPair, isAdapterSym } from "./josmAdapter"


type Ws = WebSocket | NodeWebSocket


export function wsToAdapter(ws: WebSocket): Promise<TransmissionAdapter> {
  return new Promise<TransmissionAdapter>((_res) => {
    function res() {
      _res({
        send(data) {
          ws.send(stringify(data))
        },
        onMsg(cb, once: boolean = false) {
          const listener = (ev: MessageEvent) => {
            if (ws.readyState !== WebSocket.OPEN) return
            cb(parse(ev.data))
          }
          ws.addEventListener("message", listener, { once })
          return () => {
            try {
              ws.removeEventListener("message", listener)
              return true
            }
            catch(e) {
              return false
            }
          }
        },
        closing: new Promise((res) => {
          ws.addEventListener("closing", res as any, {once: true})
          ws.addEventListener("close", res as any, {once: true})
        }),
        [isAdapterSym]: true
      })
    }

    if (ws.readyState === WebSocket.OPEN) res()
    else ws.addEventListener("open", res as any, {once: true})
    
  })
  
}

export const { josmAdapter: websocketJosmAdapter, josmAdapterClient: websocketJosmAdapterClient } = makeAdapterPair(wsToAdapter)

