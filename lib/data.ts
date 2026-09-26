"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Candidate, Job, JobResearch, Kpi, MpaProperties, ScenarioKey, ScenarioMeta, VesselTracks } from "./types";
import type { FeatureCollection, Geometry } from "geojson";

export type MpaFeatureCollection = FeatureCollection<Geometry, MpaProperties>;

type JsonState = { data: unknown; loading: boolean; error: string | null };
const EMPTY: JsonState = { data: null, loading: true, error: null };
const cache = new Map<string, JsonState>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const notify = () => listeners.forEach(listener => listener());
function useJson<T>(url: string): { data: T | null; loading: boolean; error: string | null } {
  const state = useSyncExternalStore(subscribe, () => cache.get(url) ?? EMPTY, () => EMPTY);
  useEffect(() => {
    if (cache.has(url) || pending.has(url)) return;
    pending.add(url);
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`Unable to load research data (${r.status}).`);
      return r.json();
    }).then(data => {
      cache.set(url, { data, loading: false, error: null });
    }).catch(error => {
      cache.set(url, { data: null, loading: false, error: String(error) });
    }).finally(() => { pending.delete(url); notify(); });
  }, [url]);
  return { ...state, data: state.data as T | null };
}

export function useJobs() {
  return useJson<Job[]>("/data/jobs.json");
}

export function useCandidates() {
  return useJson<Candidate[]>("/data/candidates.json");
}

export function useKpi() {
  return useJson<Kpi>("/data/kpi.json");
}

export function useScenarios() {
  return useJson<Record<ScenarioKey, ScenarioMeta>>("/data/scenarios.json");
}

export function useVesselTracks() {
  return useJson<VesselTracks>("/data/vessel_tracks.json");
}

export function useResearch() {
  return useJson<Record<string, JobResearch>>("/data/research.json");
}

export function useMpaLayer() {
  return useJson<MpaFeatureCollection>("/data/marine_protected_areas.geojson");
}

export function candidatesForJob(all: Candidate[], jobId: string): Candidate[] {
  return all
    .filter((c) => c.jobId === jobId)
    .sort((a, b) => b.vesselSuitabilityScore - a.vesselSuitabilityScore);
}
