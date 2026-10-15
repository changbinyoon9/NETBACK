# NETBACK

Ghost gear recovery coordination research prototype. Next.js 16 / React 19.

## Run locally

```sh
npm install
npm run dev -- --hostname 127.0.0.1 --port 4177
```

Open http://127.0.0.1:4177. The first build downloads the existing Geist fonts from Google. Map tiles require an internet connection. The planning calculations use bundled research data and do not call an AI service.

## Routes

- `/` — mission and research introduction
- `/lab` — interactive allocation, budget and capacity scenarios
- `/simulate` — guided recovery workflow
- `/simulate/custom` — new-coordinate spatial analysis
- `/admin` — historical records and simulated mission history

## Simulation lab

Choose a preset, region and objective. Change budget, mission count, maximum depth, historical track distance, minimum tonnage and hypothetical weather conditions. Expand **Cost & matching assumptions** to adjust speed, time, operating rates, fuel price, mobilization and matching weights.

**Capture baseline** keeps a comparison in the current page session. **Export CSV** includes all assumptions, planned/deferred records, costs and excluded vessel IDs. Open a proposed job to inspect its cost breakdown or exclude its vessel across the campaign. **Reset** restores default assumptions and vessel availability; use **Clear baseline** to remove the captured comparison.

### Interpretation

- 178 historical recovery records and 8,579 historical candidate links are supplied in `public/data`.
- Records and tracks can represent different periods. The lab is a counterfactual spatial exercise, not real-time dispatch or an evaluation of observed missions.
- Qualification and availability are explicit assumptions. Vessel tonnage does not establish suitable equipment or competence.
- Filters are applied before a greedy, affordable allocation. One vessel is assigned to at most one job in a planning window. This is not a global routing optimizer.
- Costs, weather multipliers and fuel coefficients are uncalibrated scenario assumptions. The displayed ±25% range is a cost sensitivity band, not a statistical confidence interval.
- Travel uses twice the nearest historical track distance as a detour proxy. It is not a safe navigable route or departure-port distance.
- The priority index is relative, not recovered mass, ecological impact or probability of success.
- Guided workflow events are simulations held in browser storage. The lab itself does not create dispatch missions.

The implementation and equations are in `lib/planner.ts`; model details are also shown below the allocation list.

## Custom spatial analysis

The existing Python engine expects the original `Data` folder next to `web`, with the MPA CSV, vessel-track CSV and GEBCO raster. It requires `pyproj`, `shapely`, and `rasterio` in the `python3` environment. The API validates the study coverage (32–40° N, 124–133° E), rejects invalid input and terminates analysis after 25 seconds. This path uses historical data as well.

## Checks

```sh
npm run lint
npx tsc --noEmit
node tests/planner.test.mjs
npm run build -- --webpack
```

## Photo credit

Homepage photograph: NOAA / Ariel Halperin, 2021. Reused from the NETBACK research document asset (`recovery_noaa.jpg`). It illustrates ghost gear recovery and is not evidence of a NETBACK operation.
