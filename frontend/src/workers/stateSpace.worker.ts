/// <reference lib="webworker" />

import type { ColoredPetriNet, TargetMarkingCondition, CPNVerificationResults } from "@/contracts/models";
import { exploreStateSpace } from "@/utils/cpn/stateSpace";
import { checkAllProperties } from "@/utils/cpn/properties";

export interface WorkerRequest {
  cpn: ColoredPetriNet;
  targetConditions: TargetMarkingCondition[];
  maxMarkings?: number;
}

export type WorkerResponse =
  | { type: "result"; data: CPNVerificationResults }
  | { type: "error"; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { cpn, targetConditions, maxMarkings } = e.data;
  try {
    const stateSpace = exploreStateSpace(cpn, { maxMarkings });
    const data = checkAllProperties(cpn, stateSpace, targetConditions);
    const response: WorkerResponse = { type: "result", data };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = { type: "error", message: String(err) };
    self.postMessage(response);
  }
};
