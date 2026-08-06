import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SECRET_KEY .env.local içinde bulunamadı.",
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY .env.local içinde bulunamadı.",
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const CSV_PATH = path.resolve(
  process.cwd(),
  "data",
  "transfers.csv",
);

const DATABASE_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
const INSERT_BATCH_SIZE = 1000;
const MINIMUM_CLUB_COUNT = 2;

type TransferCsvRow = {
  player_id?: string;
  transfer_date?: string;
  transfer_season?: string;
  from_club_id?: string;
  to_club_id?: string;
  from_club_name?: string;
  to_club_name?: string;
  transfer_fee?: string;
  market_value_in_eur?: string;
  player_name?: string;
};

type TransferRecord = {
  playerId: number;
  transferDate: string;
  fromClubName: string;
  toClubName: string;
};

type CareerClubRow = {
  player_id: number;
  club_name: string;
  career_order: number;
};

function normalizeClubName(
  value: string | undefined,
) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparisonValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ");
}

function isValidPlayerId(value: number) {
  return Number.isInteger(value) && value > 0;
}

function isValidDate(value: string) {
  if (!value) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsedDate.getTime());
}

function isFutureTransfer(value: string) {
  const transferDate = new Date(
    `${value}T00:00:00Z`,
  );

  const today = new Date();

  today.setUTCHours(23, 59, 59, 999);

  return transferDate.getTime() > today.getTime();
}

function splitIntoBatches<T>(
  values: T[],
  batchSize: number,
) {
  const batches: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += batchSize
  ) {
    batches.push(
      values.slice(index, index + batchSize),
    );
  }

  return batches;
}

async function getPlayablePlayerIds() {
  const playerIds = new Set<number>();

  let from = 0;

  while (true) {
    const to =
      from + DATABASE_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("guess_players")
      .select("player_id")
      .eq("is_playable", 1)
      .order("player_id", {
        ascending: true,
      })
      .range(from, to);

    if (error) {
      throw new Error(
        `guess_players okunamadı: ${error.message}`,
      );
    }

    const rows = data ?? [];

    for (const row of rows) {
      const playerId = Number(row.player_id);

      if (isValidPlayerId(playerId)) {
        playerIds.add(playerId);
      }
    }

    if (rows.length < DATABASE_PAGE_SIZE) {
      break;
    }

    from += DATABASE_PAGE_SIZE;
  }

  return playerIds;
}

async function readTransfers(
  validPlayerIds: Set<number>,
) {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `CSV dosyası bulunamadı: ${CSV_PATH}`,
    );
  }

  const transfersByPlayer = new Map<
    number,
    TransferRecord[]
  >();

  let totalCsvRows = 0;
  let skippedInvalidRows = 0;
  let skippedUnknownPlayers = 0;
  let skippedFutureTransfers = 0;

  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(
      parse({
        columns: true,
        bom: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      }),
    );

  for await (const rawRow of parser) {
    totalCsvRows += 1;

    const row = rawRow as TransferCsvRow;

    const playerId = Number(row.player_id);
    const transferDate =
      row.transfer_date?.trim() ?? "";

    const fromClubName = normalizeClubName(
      row.from_club_name,
    );

    const toClubName = normalizeClubName(
      row.to_club_name,
    );

    if (
      !isValidPlayerId(playerId) ||
      !isValidDate(transferDate) ||
      !fromClubName ||
      !toClubName
    ) {
      skippedInvalidRows += 1;
      continue;
    }

    if (!validPlayerIds.has(playerId)) {
      skippedUnknownPlayers += 1;
      continue;
    }

    /*
     * Dataset içinde 2028 veya 2030 gibi geleceğe
     * ait sözleşme dönüş tarihleri bulunabiliyor.
     * Henüz gerçekleşmemiş transferleri kariyere
     * eklemiyoruz.
     */
    if (isFutureTransfer(transferDate)) {
      skippedFutureTransfers += 1;
      continue;
    }

    const currentTransfers =
      transfersByPlayer.get(playerId) ?? [];

    currentTransfers.push({
      playerId,
      transferDate,
      fromClubName,
      toClubName,
    });

    transfersByPlayer.set(
      playerId,
      currentTransfers,
    );
  }

  return {
    transfersByPlayer,
    stats: {
      totalCsvRows,
      skippedInvalidRows,
      skippedUnknownPlayers,
      skippedFutureTransfers,
    },
  };
}

function buildCareerClubRows(
  transfersByPlayer: Map<
    number,
    TransferRecord[]
  >,
) {
  const rows: CareerClubRow[] = [];

  let skippedShortCareers = 0;

  for (const [
    playerId,
    playerTransfers,
  ] of transfersByPlayer.entries()) {
    const sortedTransfers = [
      ...playerTransfers,
    ].sort((first, second) => {
      const dateComparison =
        first.transferDate.localeCompare(
          second.transferDate,
        );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return first.toClubName.localeCompare(
        second.toClubName,
        "tr",
      );
    });

    const careerClubs: string[] = [];

    function appendClub(clubName: string) {
      const normalizedClubName =
        normalizeClubName(clubName);

      if (!normalizedClubName) {
        return;
      }

      const previousClub =
        careerClubs[careerClubs.length - 1];

      /*
       * Sadece art arda tekrar eden aynı kulübü
       * kaldırıyoruz.
       *
       * Örnek:
       * Manchester United
       * Real Madrid
       * Juventus
       * Manchester United
       *
       * Buradaki ikinci Manchester United korunur.
       */
      if (
        previousClub &&
        normalizeComparisonValue(previousClub) ===
          normalizeComparisonValue(
            normalizedClubName,
          )
      ) {
        return;
      }

      careerClubs.push(normalizedClubName);
    }

    for (const transfer of sortedTransfers) {
      if (careerClubs.length === 0) {
        appendClub(transfer.fromClubName);
      }

      appendClub(transfer.toClubName);
    }

    if (
      careerClubs.length <
      MINIMUM_CLUB_COUNT
    ) {
      skippedShortCareers += 1;
      continue;
    }

    careerClubs.forEach(
      (clubName, index) => {
        rows.push({
          player_id: playerId,
          club_name: clubName,
          career_order: index + 1,
        });
      },
    );
  }

  return {
    rows,
    skippedShortCareers,
  };
}

async function replaceCareerData(
  rows: CareerClubRow[],
) {
  const playerIds = Array.from(
    new Set(
      rows.map((row) => row.player_id),
    ),
  );

  console.log(
    `\n${playerIds.length.toLocaleString(
      "tr-TR",
    )} oyuncunun eski kariyer kayıtları temizleniyor...`,
  );

  const deleteBatches = splitIntoBatches(
    playerIds,
    DELETE_BATCH_SIZE,
  );

  for (
    let index = 0;
    index < deleteBatches.length;
    index += 1
  ) {
    const batch = deleteBatches[index];

    const { error } = await supabase
      .from("player_quiz_clubs")
      .delete()
      .in("player_id", batch);

    if (error) {
      throw new Error(
        `Eski kariyer kayıtları silinemedi: ${error.message}`,
      );
    }

    if (
      (index + 1) % 10 === 0 ||
      index === deleteBatches.length - 1
    ) {
      console.log(
        `Silme ilerlemesi: ${
          index + 1
        }/${deleteBatches.length}`,
      );
    }
  }

  console.log(
    `\n${rows.length.toLocaleString(
      "tr-TR",
    )} kariyer satırı yükleniyor...`,
  );

  const insertBatches = splitIntoBatches(
    rows,
    INSERT_BATCH_SIZE,
  );

  let insertedRowCount = 0;

  for (
    let index = 0;
    index < insertBatches.length;
    index += 1
  ) {
    const batch = insertBatches[index];

    const { error } = await supabase
      .from("player_quiz_clubs")
      .insert(batch);

    if (error) {
      throw new Error(
        `Kariyer kayıtları eklenemedi: ${error.message}`,
      );
    }

    insertedRowCount += batch.length;

    console.log(
      `Yükleme ilerlemesi: ${insertedRowCount.toLocaleString(
        "tr-TR",
      )}/${rows.length.toLocaleString(
        "tr-TR",
      )}`,
    );
  }

  return {
    playerCount: playerIds.length,
    insertedRowCount,
  };
}

async function verifyImport() {
  const { count, error } = await supabase
    .from("player_quiz_clubs")
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw new Error(
      `İçe aktarma kontrol edilemedi: ${error.message}`,
    );
  }

  return count ?? 0;
}

async function main() {
  console.log(
    "========================================",
  );
  console.log(
    "FootBattle Career History Importer",
  );
  console.log(
    "========================================\n",
  );

  console.log(
    "1. Oynanabilir oyuncular okunuyor...",
  );

  const validPlayerIds =
    await getPlayablePlayerIds();

  console.log(
    `${validPlayerIds.size.toLocaleString(
      "tr-TR",
    )} oynanabilir oyuncu bulundu.`,
  );

  console.log(
    "\n2. transfers.csv okunuyor...",
  );

  const {
    transfersByPlayer,
    stats,
  } = await readTransfers(validPlayerIds);

  console.log(
    `${stats.totalCsvRows.toLocaleString(
      "tr-TR",
    )} CSV satırı okundu.`,
  );

  console.log(
    `${transfersByPlayer.size.toLocaleString(
      "tr-TR",
    )} uygun oyuncunun transferi bulundu.`,
  );

  console.log(
    `Geçersiz satır: ${stats.skippedInvalidRows.toLocaleString(
      "tr-TR",
    )}`,
  );

  console.log(
    `Veritabanında olmayan oyuncu: ${stats.skippedUnknownPlayers.toLocaleString(
      "tr-TR",
    )}`,
  );

  console.log(
    `Gelecek tarihli transfer: ${stats.skippedFutureTransfers.toLocaleString(
      "tr-TR",
    )}`,
  );

  console.log(
    "\n3. Kariyer yolları oluşturuluyor...",
  );

  const {
    rows,
    skippedShortCareers,
  } = buildCareerClubRows(
    transfersByPlayer,
  );

  console.log(
    `${rows.length.toLocaleString(
      "tr-TR",
    )} kariyer satırı hazırlandı.`,
  );

  console.log(
    `Yetersiz kariyer geçmişi nedeniyle atlanan oyuncu: ${skippedShortCareers.toLocaleString(
      "tr-TR",
    )}`,
  );

  if (rows.length === 0) {
    throw new Error(
      "Yüklenecek kariyer kaydı oluşturulamadı.",
    );
  }

  console.log(
    "\n4. Supabase kayıtları güncelleniyor...",
  );

  const importResult =
    await replaceCareerData(rows);

  const databaseRowCount =
    await verifyImport();

  console.log(
    "\n========================================",
  );

  console.log(
    "KARİYER İÇE AKTARIMI TAMAMLANDI",
  );

  console.log(
    "========================================",
  );

  console.log(
    `İşlenen oyuncu: ${importResult.playerCount.toLocaleString(
      "tr-TR",
    )}`,
  );

  console.log(
    `Eklenen kariyer satırı: ${importResult.insertedRowCount.toLocaleString(
      "tr-TR",
    )}`,
  );

  console.log(
    `player_quiz_clubs toplam satır: ${databaseRowCount.toLocaleString(
      "tr-TR",
    )}`,
  );
}

main().catch((error: unknown) => {
  console.error(
    "\nCareer importer başarısız oldu:",
  );

  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});