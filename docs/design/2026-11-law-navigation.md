# Finding and reading the law (navigation and machine readers)

Status: built (landing, place pages, act contents, llms.txt, sitemap, Markdown).

## Who it is for

A person who does not know the name of an act, may read slowly, and cannot be
asked to understand "systematic number" or "authority". And a model that reads
the web or calls our tools. Both get the same three doors, in this order:

1. **Say it in your own words.** `/law` is one box. It searches the titles of acts
   and the text of every provision in force (`searchProvisions`), and shows two
   lists: laws with that name, and where the text of the law says it, the match marked.
2. **Start from a place.** Below the box, the places that hold law, as a tree:
   country → canton → commune. A place page lists all its acts in the order its
   collection numbers them, can be filtered by a word of the title, and says which
   places above it also apply there ("federal law applies in every canton").
3. **Ask.** `/law/ask` is the chat. Every act page links to it.

Every act page shows where the reader is (Law › Confederation › Zug › Baar),
a contents list that jumps to any provision (`?at=art_64`), and links to the
place's other laws.

## Scaling to other countries, territories, bylaws

The tree is not typed anywhere. `src/lib/law/places.ts` derives it from
`LAW_AUTHORITIES` (`place` and `within`): a row with an `iso_3166_1` place is a
country, one with `within` is a part of what it is within, one with no place is
shared. To add Estonia, an unrecognised territory, a network state or a
company's bylaws: add authorities (with `within` for the nesting), run a reader.
The landing, place pages, sitemap, `llms.txt`, `law_authorities` and its
`appliesAlsoFrom` follow with no code change. `places.test.ts` fails if an
authority cannot be placed in the tree.

## Machine readers

- `/llms.txt`: what Solon holds, the MCP endpoint, the plain URLs, how to cite; generated from the configuration.
- `/robots.txt` and `/sitemap/{n}.xml`: entry pages and places in sitemap 0, acts 5,000 to a file.
- `/api/v1/law/acts/{id}`: the whole act as JSON; `?format=md` (or `Accept: text/markdown`) gives Markdown with the provenance (publisher URL, date and its basis, sha256, places that also apply) in the front matter and an anchor on every heading.
- MCP: `law_authorities` now returns `level`, `appliesAlsoFrom` and a Solon link per place; `law_find_acts` takes `offset`, so one call pattern lists a whole place.

## Not done

- Search ranks by title match only for acts, and by full-text rank for provisions; typo tolerance (`@bitbaum/searchkit`) is not wired into the law search yet.
- Act text is read in German; French and Italian federal text is deferred.
- No version history page for an act; the database holds the versions.
