# Russia and its subjects: where the law is published (read 2026-11-10)

What Solon can read for the Russian Federation and a subject of it (North
Ossetia–Alania first), and what it cannot yet. Every line below was opened on
the day above, from the session's network.

## 1. The official publication portal

`publication.pravo.gov.ru`, the Official Internet Portal of Legal Information,
publishes federal acts and the acts of all 89 subjects. Its pages read a JSON
API that answers without a key:

- `/api/PublicBlocks` lists the blocks (`president` holds the Constitution,
  federal constitutional laws and federal laws; `subjects` the subjects);
  `/api/PublicBlocks/?parent=subjects` lists 89 subjects, North Ossetia–Alania
  as `region15`.
- `/api/DocumentTypes?block=<block>` lists a block's document types by id.
- `/api/Documents?block=<block>&DocumentTypes=<id>&PageSize=200&index=<page>`
  lists acts: electronic publication number, full name, number, date, type.
  On the day read, of the four federal types read: the Constitution in five
  publications, 3 laws on amendments to it, 114 federal constitutional laws
  and 7,894 federal laws (8,012 acts once the Constitution's publications are
  one); for `region15`, 37 constitutional laws and 1,058 laws (of 11,256
  documents of every type).

`robots.txt` disallows `/File` (and `/Svg`, `/Search`), and each act's text is
served as `/file/pdf?eoNumber=…`. The PDFs are scans (a sample of three pages:
images at 300 dpi, no text layer), so reading them would need OCR as well.
Solon reads the listing (`PRAVO_GOV_RU`, `pnpm run law:text pravo-gov-ru`) and
does not fetch the files. Each act links to its page on the portal.

Laws are not objects of copyright: Civil Code, Art. 1259(6) (licence
`LicenseRef-ru-official-act`).

## 2. What could not be read

- `pravo.gov.ru` (the consolidated texts) answered 503; `kremlin.ru`,
  `duma.gov.ru`, `alania.gov.ru`, `parlament.alania.gov.ru` and
  `docs.cntd.ru` did not answer at all.
- `www.parliament-osetia.ru`, the North Ossetian Parliament's former
  address, now redirects to an unrelated site.

So the texts, and North Ossetia–Alania's own Constitution (who may propose a
law there, how the Head is chosen), are not stated in Solon yet.

## 3. The official routes stated

- **Federal law**: Constitution of the Russian Federation, Art. 104, read
  from ConsultantPlus's public consolidated text: the right of legislative
  initiative belongs to the President, the Federation Council, senators,
  State Duma deputies, the Government and the subjects' legislatures (and the
  two high courts on their matters); bills go to the State Duma; a bill on
  taxes, loans or federal spending needs the Government's opinion. Citizens
  do not hold the right.
- **Russian Public Initiative** (`roi.ru`, under Presidential Decree No. 183
  of 4 March 2013, its page "How it works"): a citizen aged 18 or over with a
  SNILS number and a confirmed account on the state services portal files an
  initiative; moderation takes up to two months; votes are gathered for up
  to a year; 100,000 for a federal initiative, for a regional one 100,000
  where the population exceeds two million and otherwise 5% of it; an
  initiative that reaches the bar goes to an expert working group of its
  level. Every vote is cast through the state services account.

## 4. Next

- The texts: a publisher whose terms allow reading them (the subjects'
  legislatures, an archived copy), or the portal's agreement to the files.
- North Ossetia–Alania's Constitution and its own routes, once readable.
- A proposal on an act whose text Solon does not hold, so a person can ask
  for a change where Solon cannot yet show the words.
