import { getSeasonMatches, type FootballMatch } from "@/lib/football/data-core";

export type CompetitionKey = "super-lig" | "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1" | "primeira-liga" | "champions-league" | "europa-league" | "conference-league";
export type CompetitionConfig = { key: CompetitionKey; espnSlug: string; trName: string; enName: string; emoji: string; accent: string };
export type MatchRow = FootballMatch;
export type StandingRow = { position:number; teamId:string; teamName:string; abbreviation:string; logo:string|null; played:number; won:number; drawn:number; lost:number; goalsFor:number; goalsAgainst:number; goalDifference:number; points:number };
export type CompetitionSnapshot = { standings:StandingRow[]; matches:MatchRow[]; fetchedAt:string };

export const COMPETITIONS: Record<CompetitionKey, CompetitionConfig> = {
  "super-lig": { key:"super-lig", espnSlug:"tur.1", trName:"Trendyol Süper Lig", enName:"Turkish Süper Lig", emoji:"🇹🇷", accent:"from-red-500/20 to-white/5" },
  "premier-league": { key:"premier-league", espnSlug:"eng.1", trName:"Premier League", enName:"Premier League", emoji:"🏴", accent:"from-violet-500/20 to-cyan-400/5" },
  "la-liga": { key:"la-liga", espnSlug:"esp.1", trName:"La Liga", enName:"La Liga", emoji:"🇪🇸", accent:"from-orange-500/20 to-red-400/5" },
  "serie-a": { key:"serie-a", espnSlug:"ita.1", trName:"Serie A", enName:"Serie A", emoji:"🇮🇹", accent:"from-blue-500/20 to-sky-400/5" },
  "bundesliga": { key:"bundesliga", espnSlug:"ger.1", trName:"Bundesliga", enName:"Bundesliga", emoji:"🇩🇪", accent:"from-red-500/20 to-yellow-400/5" },
  "ligue-1": { key:"ligue-1", espnSlug:"fra.1", trName:"Ligue 1", enName:"Ligue 1", emoji:"🇫🇷", accent:"from-blue-500/20 to-red-400/5" },
  "primeira-liga": { key:"primeira-liga", espnSlug:"por.1", trName:"Primeira Liga", enName:"Primeira Liga", emoji:"🇵🇹", accent:"from-emerald-500/20 to-red-400/5" },
  "champions-league": { key:"champions-league", espnSlug:"uefa.champions", trName:"UEFA Şampiyonlar Ligi", enName:"UEFA Champions League", emoji:"⭐", accent:"from-blue-500/20 to-indigo-400/5" },
  "europa-league": { key:"europa-league", espnSlug:"uefa.europa", trName:"UEFA Avrupa Ligi", enName:"UEFA Europa League", emoji:"🟠", accent:"from-orange-500/20 to-amber-400/5" },
  "conference-league": { key:"conference-league", espnSlug:"uefa.europa.conf", trName:"UEFA Konferans Ligi", enName:"UEFA Conference League", emoji:"🟢", accent:"from-emerald-500/20 to-lime-400/5" },
};

const ESPN_BASE = "https://site.api.espn.com/apis";
function numericStat(stats:Array<{name?:string;value?:number;displayValue?:string}>|undefined,names:string[]){const stat=stats?.find(i=>i.name&&names.includes(i.name));if(!stat)return 0;if(typeof stat.value==="number"&&Number.isFinite(stat.value))return stat.value;const value=Number(stat.displayValue??0);return Number.isFinite(value)?value:0;}
function flatten(input:any):any[]{if(!input||typeof input!=="object")return[];return [...(input.standings?.entries??[]),...(input.children??[]).flatMap(flatten)];}
function parseStandings(payload:unknown):StandingRow[]{return flatten(payload).map((entry:any,index:number)=>{const stats=entry.stats??[];return {position:numericStat(stats,["rank","rankCurrent","position"])||index+1,teamId:String(entry.team?.id??index+1),teamName:entry.team?.displayName??"-",abbreviation:entry.team?.abbreviation??"-",logo:entry.team?.logos?.[0]?.href??null,played:numericStat(stats,["gamesPlayed","gamesplayed"]),won:numericStat(stats,["wins"]),drawn:numericStat(stats,["ties","draws"]),lost:numericStat(stats,["losses"]),goalsFor:numericStat(stats,["pointsFor","goalsFor"]),goalsAgainst:numericStat(stats,["pointsAgainst","goalsAgainst"]),goalDifference:numericStat(stats,["pointDifferential","goalDifference"]),points:numericStat(stats,["points"])};}).filter((row:StandingRow)=>row.teamName!=="-").sort((a:StandingRow,b:StandingRow)=>a.position-b.position);}

export async function getCompetitionSnapshot(key:CompetitionKey):Promise<CompetitionSnapshot>{
  const config=COMPETITIONS[key];
  const standingsPromise=fetch(`${ESPN_BASE}/v2/sports/soccer/${config.espnSlug}/standings`,{next:{revalidate:900}}).then(r=>r.ok?r.json():null).catch(()=>null);
  const [standingsPayload,matches]=await Promise.all([standingsPromise,getSeasonMatches(config.espnSlug)]);
  return {standings:standingsPayload?parseStandings(standingsPayload):[],matches,fetchedAt:new Date().toISOString()};
}
