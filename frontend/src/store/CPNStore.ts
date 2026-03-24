import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";
import type { ColoredPetriNet } from "@/contracts/models";
import { useProtocolStore } from "./ProtocolStore";
import { useProtocolRenderStore } from "./ProtocolRenderStore";

// ─── Analysis result types (kept here to avoid bloating models.ts) ───────────

export interface CPNPropertyResult {
  passed: boolean;
  message: string;
  witness?: Record<string, any>;       // marking that satisfies the property
  counterexample?: Record<string, any>[]; // firing sequence leading to violation
}

export interface CPNAnalysisResults {
  reachability?: CPNPropertyResult;
  deadlockFreedom?: CPNPropertyResult;
  boundedness?: CPNPropertyResult;
  liveness?: Record<string, CPNPropertyResult>; // keyed by transition id
  stateCount: number;
  truncated: boolean;
  bindingLimitHit: boolean;
  runAt: string; // ISO timestamp
}

export interface CPNInvariant {
  // place_id → coefficient mapping, e.g. { "p1": 2, "p2": 1 } means 2·p1 + 1·p2 = const
  coefficients: Record<string, number>;
  constant?: number; // computed from initial marking
  label: string;    // human-readable, e.g. "2·Disconnected + 1·Active = 1"
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCPNStore = defineStore("CPNStore", {
  state: () => ({
    currentCPNId: null as string | null,
    analysisResults: null as CPNAnalysisResults | null,
    isAnalysisRunning: false,
    invariants: [] as CPNInvariant[],
    isInvariantsRunning: false,
  }),

  actions: {
    // ── Helpers ──────────────────────────────────────────────────────────────

    _protocolStore() {
      return useProtocolStore();
    },

    _ensureCPNArray() {
      const p = this._protocolStore();
      if (!p.protocol.colored_petri_nets) {
        p.protocol.colored_petri_nets = [];
      }
    },

    _triggerSave() {
      useProtocolRenderStore().saveCPNChanges();
    },

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /** Add a brand-new empty CPN to the current protocol. */
    addCPN(partial?: Partial<ColoredPetriNet>): ColoredPetriNet {
      this._ensureCPNArray();
      const cpn: ColoredPetriNet = {
        id: uuidv4(),
        name: partial?.name ?? "New CPN",
        description: partial?.description ?? "",
        places: [],
        transitions: [],
        arcs: [],
        colorSets: [],
        variables: [],
        ...partial,
      };
      this._protocolStore().protocol.colored_petri_nets!.push(cpn);
      this.currentCPNId = cpn.id;
      this._triggerSave();
      return cpn;
    },

    /** Replace a CPN in place (full update). */
    updateCPN(cpnId: string, updated: ColoredPetriNet) {
      this._ensureCPNArray();
      const nets = this._protocolStore().protocol.colored_petri_nets!;
      const idx = nets.findIndex((c) => c.id === cpnId);
      if (idx !== -1) {
        nets[idx] = updated;
        this._triggerSave();
      }
    },

    /** Delete a CPN by id, reselect automatically. */
    deleteCPN(cpnId: string) {
      this._ensureCPNArray();
      const nets = this._protocolStore().protocol.colored_petri_nets!;
      const idx = nets.findIndex((c) => c.id === cpnId);
      if (idx !== -1) {
        nets.splice(idx, 1);
        if (nets.length > 0) {
          this.currentCPNId = nets[0].id;
        } else {
          this.currentCPNId = null;
        }
        this._triggerSave();
      }
    },

    /** Retrieve a CPN by id. */
    getCPNById(cpnId: string): ColoredPetriNet | undefined {
      return this._protocolStore().protocol.colored_petri_nets?.find(
        (c) => c.id === cpnId,
      );
    },

    /** Set active CPN. */
    setCurrentCPN(cpnId: string | null) {
      this.currentCPNId = cpnId;
    },

    /** Get the currently active CPN. */
    getCurrentCPN(): ColoredPetriNet | undefined {
      if (!this.currentCPNId) return undefined;
      return this.getCPNById(this.currentCPNId);
    },

    /** Auto-select the first CPN when the protocol is loaded. */
    initFromProtocol() {
      const nets = this._protocolStore().protocol.colored_petri_nets;
      if (nets && nets.length > 0) {
        this.currentCPNId = nets[0].id;
      } else {
        this.currentCPNId = null;
      }
      this.analysisResults = null;
      this.invariants = [];
    },

    // ── Analysis state helpers ────────────────────────────────────────────────

    setAnalysisResults(results: CPNAnalysisResults | null) {
      this.analysisResults = results;
    },

    setInvariants(invariants: CPNInvariant[]) {
      this.invariants = invariants;
    },

    clearResults() {
      this.analysisResults = null;
      this.invariants = [];
    },
  },

  getters: {
    /** All CPNs belonging to the current protocol. */
    cpnList(): ColoredPetriNet[] {
      return useProtocolStore().protocol.colored_petri_nets ?? [];
    },
  },
});
