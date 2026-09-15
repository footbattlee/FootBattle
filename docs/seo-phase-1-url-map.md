# FootBattle SEO Phase 1 — URL / Canonical Map

Date: 2026-09-15

## Goal
Prevent legacy SEO landing pages and newer localized product routes from competing for the same search intent. No redirects or sitemap removals are made in this step.

## Rules
1. Do not redirect a legacy URL with meaningful Search Console traction until its replacement is proven.
2. One search intent should ultimately have one primary indexable URL per language.
3. `/tr/...` and `/en/...` are the long-term product architecture with self-canonical and reciprocal hreflang.
4. Legacy Turkish SEO pages may remain temporarily where they rank, but should not grow into parallel content clusters.
5. Sitemap cleanup follows canonical/redirect implementation, not before it.

## Overlap map
| Intent | Legacy URL | Localized URL | Phase 1 decision |
| --- | --- | --- | --- |
| Football Wordle TR | `/football-wordle` | `/tr/wordle` | HOLD: legacy has GSC traction; measure both first. |
| Football Wordle EN | `/football-wordle` | `/en/wordle` | Prefer `/en/wordle` long term; no redirect yet. |
| Football Tic Tac Toe TR | `/futbol-tic-tac-toe` | `/tr/tic-tac-toe` | HOLD: align product messaging first, then compare GSC. |
| Football Tic Tac Toe EN | `/futbol-tic-tac-toe` | `/en/tic-tac-toe` | Prefer `/en/tic-tac-toe` long term. |
| Guess the Player TR | `/futbolcu-tahmin-oyunu` | `/tr/guess-the-player` | Prefer localized route long term; verify legacy GSC first. |
| Guess the Player EN | legacy pages | `/en/guess-the-player` | Localized route is primary English route. |
| Süper Lig Guess TR | `/super-lig-futbolcu-tahmin` | `/tr/guess-the-player/super-lig` | KEEP TEMPORARILY: localized route already ranks; measure legacy before consolidation. |
| Süper Lig Guess EN | legacy Turkish URL | `/en/guess-the-player/super-lig` | Localized route is primary English route. |
| Career Path TR | `/kariyerden-futbolcu-bul`, `/transfer-quiz` | `/tr/career-path` | Keep distinct only where search/game intent differs; audit copy first. |
| Career Path EN | `/transfer-quiz` | `/en/career-path` | HOLD: `/transfer-quiz` has GSC traction. |
| Football games hub TR | `/futbol-oyunlari` | `/tr` | Keep both: SEO pillar vs product homepage. |

## Keep distinct
- `/tr` vs `/futbol-oyunlari`: homepage vs Turkish football-games pillar.
- `/tr/super-lig` vs `/tr/guess-the-player/super-lig`: competition info vs game intent.
- `/{locale}/{competition}/team/{teamId}`: fixture/squad/results intent.
- `/halisaha-kadro` vs `/halisaha-mac`: separate utility intents.
- Daily Faceoff pages: daily matchup/content intent.

## P0 findings
### Duplicate intent in sitemap
Sitemap currently advertises legacy and localized URLs for Wordle, Tic Tac Toe, Guess the Player and related games. Do not remove them until final consolidation decisions are implemented.

### Stale Tic Tac Toe / Ranked messaging
Public copy still contains older language presenting Tic Tac Toe duel functionality as upcoming. Ranked matchmaking and competitive Tic Tac Toe now exist. Update this before expanding Tic Tac Toe SEO.

### Fragmented internal-link authority
New product navigation should consistently point to localized primary routes. Temporarily retained legacy SEO pages should lead into the primary product experience instead of creating a second navigation tree.

## Search Console evidence
- `/tr/guess-the-player/super-lig` is already around first-page territory; do not destabilize it.
- `/football-wordle` has meaningful impressions/clicks; do not blindly redirect it.
- `/transfer-quiz` has early traction; analyze query intent before consolidation.
- Tic Tac Toe has relevant query impressions but weaker page positioning, so product/content alignment is a priority.

## Implementation order
1. Update stale Tic Tac Toe / Ranked copy without changing URLs.
2. Normalize new internal links toward localized primary product routes.
3. Compare legacy vs localized performance in the next GSC window.
4. Decide 301/canonical consolidation per cluster.
5. Remove superseded URLs from sitemap after consolidation.
6. Re-submit sitemap and monitor Google's canonical selection.

## Guardrail
Do not mass-redirect or noindex legacy pages in this phase. They are part of FootBattle's current organic footprint; consolidation must be evidence-led.
