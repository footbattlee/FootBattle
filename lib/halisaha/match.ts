export type MatchStatus = "yes" | "no" | "maybe";

export type MatchRow = {
  id: string;
  title: string;
  match_date: string;
  match_time: string;
  location: string;
  target_players: number;
  note: string;
  created_at: string;
};

export type MatchRsvpRow = {
  id: string;
  match_id: string;
  participant_token: string;
  player_name: string;
  status: MatchStatus;
  updated_at: string;
  created_at: string;
};

export function createPublicMatchId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function validateParticipantToken(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(value);
}

export function validateMatchCreate(input: unknown):
  | {
      ok: true;
      data: {
        title: string;
        matchDate: string;
        matchTime: string;
        location: string;
        targetPlayers: number;
        note: string;
      };
    }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Maç bilgileri geçersiz." };
  }

  const body = input as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const matchDate =
    typeof body.matchDate === "string" ? body.matchDate.trim() : "";
  const matchTime =
    typeof body.matchTime === "string" ? body.matchTime.trim() : "";
  const location =
    typeof body.location === "string" ? body.location.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const targetPlayers = Number(body.targetPlayers);

  if (!title || title.length > 80) {
    return { ok: false, error: "Maç adı 1-80 karakter arasında olmalı." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return { ok: false, error: "Maç tarihi geçersiz." };
  }
  if (!/^\d{2}:\d{2}$/.test(matchTime)) {
    return { ok: false, error: "Maç saati geçersiz." };
  }
  if (location.length > 120) {
    return { ok: false, error: "Konum en fazla 120 karakter olabilir." };
  }
  if (note.length > 300) {
    return { ok: false, error: "Not en fazla 300 karakter olabilir." };
  }
  if (!Number.isInteger(targetPlayers) || targetPlayers < 5 || targetPlayers > 22) {
    return { ok: false, error: "Hedef oyuncu sayısı 5-22 arasında olmalı." };
  }

  return {
    ok: true,
    data: { title, matchDate, matchTime, location, targetPlayers, note },
  };
}

export function validateRsvp(input: unknown):
  | {
      ok: true;
      data: {
        participantToken: string;
        playerName: string;
        status: MatchStatus;
      };
    }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Katılım bilgisi geçersiz." };
  }

  const body = input as Record<string, unknown>;
  const participantToken =
    typeof body.participantToken === "string" ? body.participantToken.trim() : "";
  const playerName =
    typeof body.playerName === "string" ? body.playerName.trim() : "";
  const status = body.status;

  if (!validateParticipantToken(participantToken)) {
    return { ok: false, error: "Katılımcı kimliği geçersiz." };
  }
  if (!playerName || playerName.length > 40) {
    return { ok: false, error: "İsim 1-40 karakter arasında olmalı." };
  }
  if (status !== "yes" && status !== "no" && status !== "maybe") {
    return { ok: false, error: "Katılım durumu geçersiz." };
  }

  return { ok: true, data: { participantToken, playerName, status } };
}
