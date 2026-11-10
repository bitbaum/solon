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
};
