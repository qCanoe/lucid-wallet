import { StepResult } from "@lucidwallet/core";

export type ExecutionState =
  | "DRAFT"
  | "PLANNED"
  | "APPROVED"
  | "EXECUTING"
  | "CONFIRMED"
  | "DONE"
  | "FAILED"
  | "ABORTED";

export type StepState =
  | "PREPARE"
  | "SIMULATE"
  | "SIGN"
  | "SEND"
  | "CONFIRM"
  | "VERIFY";

export class ExecutionStateMachine {
  private state: ExecutionState = "DRAFT";
  private stepState: StepState = "PREPARE";
  private results: StepResult[] = [];

  getState(): ExecutionState {
    return this.state;
  }

  getStepState(): StepState {
    return this.stepState;
  }

  getResults(): StepResult[] {
    return this.results;
  }

  transition(next: ExecutionState): void {
    this.state = next;
  }

  transitionStep(next: StepState): void {
    this.stepState = next;
  }

  recordResult(result: StepResult): void {
    this.results.push(result);
  }
}
