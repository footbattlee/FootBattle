/* =========================================================
   PLAYER QUIZ NATIONALITIES

   DB değeri İngilizce kalır.
   Kullanıcıya Türkçe gösterilir ve Türkçe cevap kabul edilir.
========================================================= */

const NATIONALITY_TR_MAP:
  Record<string, string> = {
    Albania: "Arnavutluk",
    Algeria: "Cezayir",
    Angola: "Angola",
    Argentina: "Arjantin",
    Armenia: "Ermenistan",
    Australia: "Avustralya",
    Austria: "Avusturya",
    Azerbaijan: "Azerbaycan",

    Belgium: "Belçika",
    Benin: "Benin",
    Bolivia: "Bolivya",
    "Bosnia-Herzegovina":
      "Bosna-Hersek",
    "Bosnia and Herzegovina":
      "Bosna-Hersek",
    Brazil: "Brezilya",
    Bulgaria: "Bulgaristan",
    "Burkina Faso":
      "Burkina Faso",

    Cameroon: "Kamerun",
    Canada: "Kanada",
    Chile: "Şili",
    China: "Çin",
    Colombia: "Kolombiya",
    Congo: "Kongo",
    "Costa Rica":
      "Kosta Rika",
    Croatia: "Hırvatistan",
    Cyprus: "Kıbrıs",
    "Czech Republic":
      "Çekya",
    Czechia: "Çekya",

    Denmark: "Danimarka",
    Ecuador: "Ekvador",
    Egypt: "Mısır",
    England: "İngiltere",
    Estonia: "Estonya",

    Finland: "Finlandiya",
    France: "Fransa",

    Gabon: "Gabon",
    Gambia: "Gambiya",
    Georgia: "Gürcistan",
    Germany: "Almanya",
    Ghana: "Gana",
    Greece: "Yunanistan",
    Guinea: "Gine",

    Hungary: "Macaristan",

    Iceland: "İzlanda",
    India: "Hindistan",
    Iran: "İran",
    Iraq: "Irak",
    Ireland: "İrlanda",
    Israel: "İsrail",
    Italy: "İtalya",
    "Ivory Coast":
      "Fildişi Sahili",
    "Cote d'Ivoire":
      "Fildişi Sahili",
    "Côte d'Ivoire":
      "Fildişi Sahili",

    Jamaica: "Jamaika",
    Japan: "Japonya",

    Kazakhstan: "Kazakistan",
    Kenya: "Kenya",
    Kosovo: "Kosova",

    Latvia: "Letonya",
    Lithuania: "Litvanya",
    Luxembourg: "Lüksemburg",

    Mali: "Mali",
    Mexico: "Meksika",
    Moldova: "Moldova",
    Montenegro: "Karadağ",
    Morocco: "Fas",

    Netherlands: "Hollanda",
    "New Zealand":
      "Yeni Zelanda",
    Nigeria: "Nijerya",
    "North Macedonia":
      "Kuzey Makedonya",
    Norway: "Norveç",

    Panama: "Panama",
    Paraguay: "Paraguay",
    Peru: "Peru",
    Poland: "Polonya",
    Portugal: "Portekiz",

    Romania: "Romanya",
    Russia: "Rusya",

    Scotland: "İskoçya",
    Senegal: "Senegal",
    Serbia: "Sırbistan",
    Slovakia: "Slovakya",
    Slovenia: "Slovenya",
    "South Africa":
      "Güney Afrika",
    "South Korea":
      "Güney Kore",
    Korea: "Güney Kore",
    Spain: "İspanya",
    Sweden: "İsveç",
    Switzerland: "İsviçre",

    Tunisia: "Tunus",
    Turkey: "Türkiye",

    Ukraine: "Ukrayna",
    Uruguay: "Uruguay",
    USA: "ABD",
    "United States":
      "ABD",

    Venezuela: "Venezuela",
    Wales: "Galler",

    Zambia: "Zambiya",
    Zimbabwe: "Zimbabve",
  };

/* =========================================================
   NORMALIZE
========================================================= */

export function normalizeNationalityText(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

/* =========================================================
   DB -> TÜRKÇE
========================================================= */

export function nationalityToTurkish(
  nationality:
    | string
    | null
    | undefined,
) {
  if (
    !nationality
  ) {
    return "";
  }

  return (
    NATIONALITY_TR_MAP[
      nationality
    ] ??
    nationality
  );
}

/* =========================================================
   CEVAP KONTROLÜ

   Serbia     -> Sırbistan kabul edilir
   Turkey     -> Türkiye kabul edilir
   Belgium    -> Belçika kabul edilir

   İngilizce cevap da kabul edilmeye devam eder.
========================================================= */

export function nationalitiesAreEquivalent(
  databaseNationality:
    | string
    | null
    | undefined,

  userValue:
    | string
    | number
    | null
    | undefined,
) {
  const dbValue =
    String(
      databaseNationality ??
        "",
    );

  const user =
    String(
      userValue ??
        "",
    );

  if (
    !dbValue ||
    !user
  ) {
    return false;
  }

  const englishNormalized =
    normalizeNationalityText(
      dbValue,
    );

  const turkishNormalized =
    normalizeNationalityText(
      nationalityToTurkish(
        dbValue,
      ),
    );

  const userNormalized =
    normalizeNationalityText(
      user,
    );

  return (
    userNormalized ===
      englishNormalized ||
    userNormalized ===
      turkishNormalized
  );
}