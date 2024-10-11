import { expect as baseExpect } from '@playwright/test';

import { circularDeepEqual } from "fast-equals"
import cl from "circ-clone"




function eq(exp: any, ...got: any[]) {
  let pass = false
  for (const g of got) {
    if (circularDeepEqual(cl(exp), cl(g))) {
      pass = true
      break
    }
  }


  return {
    pass,
    name: "deep circ equal, respecting keys only (eq)",
    message: () => `Expected ${this.utils.printReceived(cl(exp))} to be depply equal to ${got.map((got) => this.utils.printExpected(cl(got))).join(" or ")}`,
  }
}


export const expect = baseExpect.extend({
  eq
})
