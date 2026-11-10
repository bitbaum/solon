/**
 * Photographs chosen by a person, by the place's Wikidata item: the Commons
 * file name, and why. `pnpm run places:photos` takes these before its own
 * rule, so a picture that does not do a place justice is replaced here, in one
 * line, without touching code. Each file is read from Commons and kept only
 * under a free licence, like any other.
 */
export const PHOTO_CHOICES: Readonly<
  Record<
    string,
    {
      file: string;
      why: string;
      /** CSS object-position: what survives a crop. */ position?: string;
    }
  >
> = {
  // The Earth, for the page of every place on it
  Q2: {
    file: "The Earth seen from Apollo 17.jpg",
    position: "center 30%",
    why: "The Blue Marble, Apollo 17, 1972: the whole world in one photograph, in the public domain.",
  },
  // Switzerland
  Q39: {
    file: "Cervino cloud.jpg",
    position: "center 22%",
    why: "The Matterhorn, the picture of Switzerland most people know; the rule's pick was a 4:1 panorama a screen would enlarge.",
  },
  // Liechtenstein
  Q347: {
    file: "Liechtenstein asv2022-10 img22 Vaduz Schloss.jpg",
    why: "Vaduz Castle above the capital; the rule's pick was a panorama strip.",
  },
  // Georgia
  Q230: {
    file: "Gergeti Trinity Church and Mt. Kazbeg 01.jpg",
    why: "Gergeti Trinity Church under Kazbek; the rule's pick was a 12:1 panorama.",
  },
  // Palestine
  Q219060: {
    file: "Palestine-06314 - West Bank (34121979493).jpg",
    why: "A West Bank landscape near Bethlehem; Wikidata gives no photograph for the State of Palestine that fills a screen.",
  },
  // Iran
  Q794: {
    file: "Naqsh-e Jahan Square from the gheisariye Vault.jpg",
    why: "Naqsh-e Jahan Square in Isfahan; Wikidata gives Iran no photograph that fills a screen.",
  },
  // Tanzania
  Q924: {
    file: "Kilimanjaro, Tanzania, 2024-05-22, DD 109.jpg",
    why: "Kilimanjaro, Africa's highest mountain, photographed in Tanzania; Wikidata gives Tanzania no photograph that fills a screen.",
  },
  // Appenzell Ausserrhoden
  Q12079: {
    file: "Schwägalp-Säntis - panoramio (37).jpg",
    why: "The Alpstein around the Säntis, the summit on the canton's border; Wikidata gives it no photograph that fills a screen.",
  },
  // Jura
  Q12755: {
    file: "Saint-Ursanne Le Doubs 2.jpg",
    why: "Saint-Ursanne on the Doubs; Wikidata gives the canton no photograph that fills a screen.",
  },
};
