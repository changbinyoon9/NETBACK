import { Nav } from "@/components/Nav";
import { Planner } from "@/components/lab/Planner";
import jobs from "@/public/data/jobs.json";
import candidates from "@/public/data/candidates.json";
import type { Job, Candidate } from "@/lib/types";
export default function LabPage(){return <><Nav/><Planner jobs={jobs as Job[]} candidates={candidates as Candidate[]}/></>}
