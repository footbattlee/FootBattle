import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey, type MatchRow } from "@/lib/football/competition-hubs";
import { matchesTeam } from "@/lib/football/data-core";
import { supabaseAdmin } from "@/lib/supabase/server";

export type TeamOrganization = { key:string; trName:string; enName:string; emoji:string; matches:MatchRow[]; competitionKey:CompetitionKey|null };
export type TeamPlayer = { id:string; name:string; position:string|null; jersey:string|null; headshot:string|null; nationality:string|null };
const ESPN_BASE="https://site.api.espn.com/apis";
function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}

async function enrichRosterWithDbImages(players:TeamPlayer[]):Promise<TeamPlayer[]>{
  if(!players.length)return players;
  const names=[...new Set(players.map(p=>normalize(p.name)).filter(Boolean))];
  if(!names.length)return players;
  try{const {data,error}=await supabaseAdmin.from("guess_players").select("name_normalized, image_url").in("name_normalized",names).not("image_url","is",null);if(error||!data?.length)return players;const images=new Map<string,string>();for(const row of data as Array<{name_normalized:string|null;image_url:string|null}>)if(row.name_normalized&&row.image_url)images.set(row.name_normalized,row.image_url);return players.map(p=>({...p,headshot:images.get(normalize(p.name))??p.headshot}));}catch{return players;}
}

export async function getTeamOrganizations(primaryCompetition:CompetitionKey,teamId:string):Promise<TeamOrganization[]>{
  const snapshot=await getCompetitionSnapshot(primaryCompetition);
  const matches=snapshot.matches.filter(match=>matchesTeam(match,teamId));
  const config=COMPETITIONS[primaryCompetition];
  return [{key:primaryCompetition,trName:config.trName,enName:config.enName,emoji:config.emoji,matches,competitionKey:primaryCompetition}];
}

export async function getTeamRoster(competition:CompetitionKey,teamId:string):Promise<TeamPlayer[]>{
  const slug=COMPETITIONS[competition].espnSlug;
  const urls=[`${ESPN_BASE}/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`,`https://site.web.api.espn.com/apis/common/v3/sports/soccer/${slug}/athletes?team=${teamId}`];
  for(const url of urls){try{const response=await fetch(url,{next:{revalidate:3600}});if(!response.ok)continue;const payload=await response.json() as any;const raw=payload.athletes??payload.items??[];const players:TeamPlayer[]=raw.flatMap((entry:any)=>{const athlete=entry?.athlete??entry;if(!athlete?.id||!athlete?.displayName)return[];return [{id:String(athlete.id),name:athlete.displayName,position:athlete.position?.displayName??athlete.position?.name??entry?.position?.displayName??null,jersey:athlete.jersey?String(athlete.jersey):entry?.jersey?String(entry.jersey):null,headshot:athlete.headshot?.href??athlete.headshot??null,nationality:athlete.citizenship??athlete.country?.displayName??null}];});if(players.length)return enrichRosterWithDbImages(players);}catch{}}
  return [];
}
