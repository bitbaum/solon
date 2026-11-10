# South Ossetia: where its law and statistics are published (research, 2026-11-10)

Why: Solon is adding South Ossetia as a place with its laws and its statistics. This note
records what was opened, from where, what was measured and what was not. Everything below was
read on 2026-11-10 from a machine with open internet, and again from a GitHub-hosted runner
(§1). "Not opened" marks the rest. A claim here needs its URL opened again before an adapter
relies on it. Solon's wording about the place follows `docs/design/2026-09-places-and-jurisdictions.md`
§7: claimed and administered by the Republic of South Ossetia; considered by Georgia and most
states to be part of Georgia; relations are rows, not copy.

## 1. Reachability

| Host | From a developer machine | From a GitHub-hosted runner (ubuntu-latest, 2026-11-10) |
|---|---|---|
| `parliamentrso.org` | 200 | 200 (0.3 s) |
| `presidentruo.org` (`/wp-json/wp/v2/…`) | 200 | 200 |
| `rsogov.org` (Government) | 200 | 200 |
| `ugosstat.ru` (Statistics Office) | 200 | not probed |
| `gov-rso.ru`, `mfa-rso.su`, `pravo-rso.ru`, `minjust.rso.ru`, `ruo.gov.ge` | no answer | not probed |

The last row is unverified, not dead. The Anthropic cloud sandbox refused every one of these hosts
at its egress proxy (HTTP 403 on CONNECT), which is why the work moved. Law-text workflows run on
GitHub runners, which reach the three publishers above.

## 2. Law publishers

### 2.1 Parliament, `parliamentrso.org` (Drupal 7)

- Sections under "Законодательство": the Constitution (`/node/3567`, one page, adopted by
  referendum 8 April 2001, with amendments), Laws (`/taxonomy/term/2`), Constitutional laws
  (`/taxonomy/term/1`), Resolutions (`/taxonomy/term/16`).
- Format: HTML. The act's full text is in the node body (`/node/<id>`, field `body`), the
  enactment date in field `enactment`, the type in field `legislation`. An example, `/node/5546`
  (Law on local self-government), opens with "Принят Парламентом РЮО 18 февраля 2004 года №44".
  No PDF or DOC attachments were found on the two nodes opened.
- Volume, from the listing pages (10 acts per page; the last page of each listing counted on
  2026-11-10): laws 48 pages (`?page=0` to `?page=47`, the last page holds 10), constitutional laws
  4 pages (the last holds 3), resolutions 7 pages (the last holds 2). That gives about 480 laws,
  33 constitutional laws and 62 resolutions, 575 acts and the Constitution. These are inferred
  from the page size and the last page; a loader reports the exact count.
- Terms: `robots.txt` has `Crawl-delay: 90` for all robots and disallows `/search/`, `/admin/` and
  system paths; the listings and nodes are not disallowed. The site has no `sitemap.xml` (404) and
  its `rssyandex.xml` is 404; `/rss.xml` answers 200. No licence page was found. Solon honours the
  crawl-delay. Enumerating costs about 59 listing requests (≈ 1.5 hours at 90 s); reading about 575
  acts costs about 14 hours, so a load is spread over scheduled runs and resumes.
- Not a complete corpus: the listing dates reach back to 2004 in the page sampled
  (`?page=47`); earlier acts and the state of an act's amendments are not stated on the
  node. Whether a node shows the current text with amendments is unread.

### 2.2 President, `presidentruo.org` (WordPress)

- WordPress REST API, open, no authentication: `/wp-json/wp/v2/posts?categories=<id>`.
  `robots.txt` disallows only `/wp-admin/`; it lists `wp-sitemap.xml` (200).
- Categories and counts as the API stated them: Указы (decrees, `categories=7`) 1,832; Документы
  (`5`) 245; Договоры (treaties, `6`) 5; Конституция (`14`) 1. The oldest decree returned (id 603)
  is dated 2012-04-19.
- Format: HTML text in `content.rendered`. A decree's number and place/date are in its closing
  lines ("г. Цхинвал, 6 ноября 2026 г. №494"); the title carries the type and subject only. A
  reader parses the number and date from the closing lines and fails the act, rather than guessing,
  when they are absent.
- Terms: the page "Об использовании информации сайта" (`/ob-ispolzovanii-informacii-sajta/`) exists;
  its text was not read (the page's body did not parse). Not opened.
- Whether the 1,832 decrees are all decrees ever issued is not stated; the earliest one is 2012.

### 2.3 Government, `rsogov.org` (Drupal 9/10)

- `/government/legal-basis` lists the acts that found the Government and links three PDFs under
  `/sites/default/files/inline-files/` (the constitutional law on the Government of 7 May 2014
  № 107, the Government's rules of procedure, the decree of 7 July 2020 № 109 on the structure of
  executive bodies). `/citizens/legal` carries the law on citizens' appeals as text.
- Government orders are published as PDFs under `/sites/default/files/documents/YYYY-MM/…`
  (seen in search results, for example an order of 18 December 2024 № 126-р; not opened).
  `/documents` is the listing; its pager has "next" only and no total, so the count is not measured.
- `robots.txt` was read and has no `Disallow` for these paths. Resolutions of the Government
  (постановления) were not located as a list.

### 2.4 Not found

- An official gazette, a Ministry of Justice register of normative acts, a consolidated legal
  database. Two web searches and the three sites above did not name one. The Constitution says
  acts affecting rights must be officially published; where that happens is not established.
  This is a gap to keep working: candidates `minjust` and `pravo-rso.ru` did not answer.
- The Parliament's "Парламентский вестник" (`/taxonomy/term/4`) is a video news programme, not a
  gazette (a YouTube embed on the home page). Not a legal source.

## 3. Statistics: the State Statistics Office, `ugosstat.ru` (WordPress)

- `/wp-sitemap.xml` and the REST API are open; `robots.txt` disallows only `/wp-admin/`.
  78 posts. The Statistics compendia ("Статистический сборник") are posts, each with one PDF:
  annual for 2019 to 2025 and quarterly or half-yearly for 2020 to Q1 2026 (latest posted
  2026-06-24). The 2025 annual PDF, `/wp-content/uploads/2026/06/spravochnik-za-2025-g.pdf`
  (8.3 MB, 180 pages), is text-extractable. One download over HTTP/2 truncated at 16 KB; HTTP/1.1
  returned all 8,336,117 bytes: a reader must check `content-length`.
- Its preface says the compendium rests on data from enterprises, ministries and agencies, censuses
  and sample surveys. 20 sections, over 121 tables: population, employment, living standards,
  education, culture, health, offences, enterprises, GDP, industry, agriculture, natural
  resources, construction, transport, trade, services, state budget, credit, licences, prices.
- The compendium is the de facto authority's own account. Solon records it as that: producer type
  "de facto authority", with the quoted caveats below.

### 3.1 Figures read (2025 compendium, publisher: Управление государственной статистики РЮО)

| Statistic | Values read | Where |
|---|---|---|
| Present population ("наличное население") on 1 January | 2021: 56,520; 2022: 56,263; 2023: 56,692; 2024: 57,528; 2025: 58,801 (the chart is titled "на 01.01.2026г."; the series labels read 2021 to 2025 and 58,801 is also table 1.1 "Расчетная численность … на 01.01.2026 г.") | section 1, tables 1.1 and chart |
| By sex, 1 Jan 2026 | men 29,472; women 29,329 | table 1.2 |
| Urban / rural | 40,279 / 18,522 (68.5 % / 31.5 %); 15.08 per km² | table 1.1 |
| Census 2015 (the base) | 53,532 total; Ossetians 48,146; Georgians 3,966; Russians 610; Armenians 378 | table 1.6 |
| Migration (arrivals, departures, net) | 2021: 768, 129, -129 (as printed); 2022: 1,339, 134, 1,205; 2023: 2,045, 167, 1,878; 2024: 3,535, 133, 3,402; 2025: 3,704, 244, 3,460 | table 1.10 |
| Registered crimes | 2021: 132; 2022: 98; 2023: 135; 2024: 119; 2025: 108 (intentional homicide 3, 2, 6, 7, 1) | table 7.1, source stated: Ministry of Internal Affairs |
| Persons identified as offenders | 122, 85, 100, 118, 103; by sex, age band and occupation | table 7.2 |
| GDP, thousand RUB | 2021: 6,601,075.5; 2022: 6,931,100.0; 2023: 7,575,110.0; 2024: 8,222,498.8; 2025: 8,732,941.6 | section 9 |
| State budget revenue, thousand RUB | 8,795,675.2; 9,331,199.1; 9,108,338.7; 9,159,247.5; 9,535,890.2 | table 17.1 |
| of which financial aid from the Russian Federation | 7,290,354.0; 7,513,440.3; 7,390,493.8; 7,313,179.7; 7,490,310.7 | table 17.1 |
| Revenue without that aid | 1,505,321.2; 1,802,803.6; 1,707,844.9; 1,846,067.8; 2,045,579.5 | table 17.1 |
| State budget expenditure, thousand RUB | 8,795,675.2; 9,592,259.5; 9,234,425.6; 9,247,941.6; 9,345,379.9 | table 17.1 |

Derived and not in the table: the aid is 78.5 % of the 2025 revenue (7,490,310.7 / 9,535,890.2),
and 86.2 % in 2021 (7,290,354.0 / 8,795,675.2). The loader computes these as `derived` facts that
name their inputs.

Not yet extracted from the same compendium: employment and wages, poverty line, education,
health (section 6, 20 pages), prices, industry, agriculture, vital events by year. They are the
same publisher and file, so the extraction is one reader.

### 3.2 Caveats the publisher states (quote at load time, with the page)

- Population: "Данные об общей численности населения … в межпереписной период являются расчетными,
  основанными на итогах Всеобщей переписи населения 2015 года и текущего учета естественного
  движения и миграции населения." Between censuses the figure is an estimate. The estimate adds
  births and arrivals and subtracts deaths and departures; migration comes from interior-ministry
  registration of arrivals and departures.
- Present vs. permanent population: "наличное" includes people temporarily present; "постоянное"
  those who live there, including the temporarily absent. The series published is the present population.
- GDP: "в Управлении государственной статистики нет необходимых статистических сведений для полного
  расчёта ВВП, применяется метод приближённого расчета (по источникам образования доходов)."
  The office says it has not the data for a full GDP and uses an approximation by income. Note
  also: in 2025 the wage bill includes self-employed wages and the tax column does not include
  profit tax (page 81).
- Crime: counts are "зарегистрированное преступление" taken on record by the interior ministry; the
  offender table lists sex, age at the offence and occupation. It has no breakdown by origin,
  citizenship or birthplace (see §5).
- Revisions: "По отдельным показателям данные за предыдущие годы уточнены" (earlier years revised).

### 3.3 Conflicting or diverging figures found (show side by side, with sources)

- Population of the territory. The de facto Statistics Office: 53,532 (census 2015), 58,801 present
  population on 1 January 2026. Georgia's Geostat: its 2024 vital statistics report (opened,
  `geostat.ge/media/73533/2024-VS-Report-(eng).pdf`) states "starting from 1994 data do not cover
  the occupied territories of Autonomous Republic of Abkhazia and Tskhinvali region, and starting
  from 2009 – territories of Ajara and Akhalgori municipalities", so Geostat publishes no figure
  for the territory. Other estimates (a 2005 figure of 49,200 on Wikipedia; a 2019 statement by a
  Georgian prime minister that the population was "less than 20 000 including 7,000 Russian
  military") were seen only in search snippets and are not cited here until opened. One more
  caveat: the "census 2015" is a census of the de facto authority; no international census of the
  territory is known to have been held.
- The 2021 net migration is printed as -129 against arrivals of 768 and departures of 129, which does
  not add up (768 - 129 = 639). It is the publisher's own table and is recorded as printed, flagged.
  The compendium's 2022 expenditure (9,592,259.5) appears in a chart under another year's label;
  the table is taken as the source.
- Budget plan versus outturn: a news summary (TASS, not opened as an article, only seen in search
  results) put the plan for 2025 at 8.871 bn RUB of revenue with 7.035 bn from Russia (about 79 %).
  The Statistics Office's outturn, 9.536 bn and 7.490 bn (78.5 %), is a different quantity (outturn
  against plan) and is not a conflict; the plan stays out until the source is opened.

## 4. Statistics from other publishers: not opened

- Rosstat, the UN, the World Bank, the OECD: not checked for South Ossetia series. `rosstat.gov.ru`
  did not answer from the developer machine on 2026-11-10 (no HTTP response). To do.
- Russian federal budget documents on the investment programme for South Ossetia: search results
  only. Not opened.
- Georgian state sources (the Office of the State Minister for Reconciliation, the Occupied
  Territories ministry): not opened.

## 5. Gaps recorded (to load as gap-model rows when the model is on main)

Each is a statement about what a page says or does not say, with the URL and date.

1. **Crime by a person's background.** The offender table (7.2 above) breaks down by sex, age and
   occupation, not by citizenship, birthplace or origin. Variant `composite_background`,
   `citizenship` and `country_of_birth`: not published, as far as the 2025 compendium shows.
   Comparator: Denmark (Statistics Denmark publishes offenders by origin), already the first topic
   of the gap registry in #458.
2. **Population of the territory by an independent producer.** Geostat excludes the territory
   (quoted above). No census under international observation was found.
3. **GDP.** The office says it lacks the data for a full GDP and approximates it from income
   sources (quoted). Comparator and proposal to be written at load time.
4. **Official gazette and consolidated texts.** None found (§2.4).
5. **Contact points** for the responsible office are on the Statistics Office page
   (`/kontakty/`, id 665, not yet read); named persons and mobile numbers appear in the compendium
   and are not to be stored, only the institution's official channel.

## 6. What this note does not claim

- That the three publishers hold every act in force; none says so.
- Any licence: no licence statement was found on the three law publishers. Solon stores the text
  with its source URL and retrieval date, and presents it as the publisher's text. Whether it may be
  shown is a Register decision (`docs/design/2026-10-law-as-data.md` §4); the importer will not run
  without one on `licences.ts`.
- That any figure is reliable. Each is the producer's, and says so.
