/**
 * Words that take a side about a place (design §7.2): Solon's own copy never
 * uses them. They may appear only inside a quotation attributed to a source —
 * a message under a `quote` key with a sibling `source` key.
 *
 * Editorial policy, so it lives in config. Once the Register exists (§8.4),
 * changing this list is its decision; until then, a reviewed pull request.
 *
 * Each entry matches at the start of a word, case-insensitively, so a stem
 * catches its inflections ("besetzte Gebiet" matches "besetzte Gebiete").
 * Phrases, not bare words, where a word has an innocent everyday sense in
 * governance copy: a seat is "besetzt", a share is "libérée", a tax exemption
 * is "befreit" — none of those takes a side.
 */
export const NEUTRAL_COPY_TERMS: Readonly<Record<string, readonly string[]>> = {
  en: [
    "occupied territor",
    "occupying power",
    "occupying force",
    "occupation regime",
    "breakaway",
    "puppet state",
    "puppet regime",
    "puppet government",
    "liberated territor",
    "so-called",
    "separatist",
    "self-proclaimed",
    "rogue state",
    "renegade province",
    "pseudo-state",
  ],
  de: [
    "besetzte Gebiet",
    "besetzten Gebiet",
    "Besatzungsmacht",
    "Besatzungsregime",
    "Besatzer",
    "abtrünnig",
    "Marionettenstaat",
    "Marionettenregierung",
    "Marionettenregime",
    "befreite Gebiet",
    "befreiten Gebiet",
    "sogenannt",
    "so genannt",
    "Separatist",
    "selbsternannt",
    "selbst ernannt",
    "Schurkenstaat",
    "Pseudostaat",
  ],
  fr: [
    "territoire occupé",
    "territoires occupés",
    "puissance occupante",
    "régime d'occupation",
    "sécessionniste",
    "État fantoche",
    "régime fantoche",
    "gouvernement fantoche",
    "territoire libéré",
    "territoires libérés",
    "soi-disant",
    "prétendu",
    "séparatiste",
    "autoproclamé",
    "État voyou",
    "pseudo-État",
  ],
  it: [
    "territorio occupato",
    "territori occupati",
    "potenza occupante",
    "regime di occupazione",
    "secessionista",
    "stato fantoccio",
    "regime fantoccio",
    "governo fantoccio",
    "territorio liberato",
    "territori liberati",
    "cosiddett",
    "sedicente",
    "separatist",
    "autoproclamat",
    "stato canaglia",
    "pseudo-stato",
  ],
  ru: [
    "оккупированн",
    "оккупационн",
    "оккупант",
    "марионеточн",
    "освобождённ территори",
    "освобожденн территори",
    "так называем",
    "сепаратист",
    "самопровозглаш",
    "государство-изгой",
    "псевдогосударств",
  ],
};
