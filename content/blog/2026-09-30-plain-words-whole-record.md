---
title: Plain words on top, the whole record underneath
summary: Solon's everyday pages now speak like people do. The exact record is still there, one click away, and a new check keeps it that way.
author: The Solon team
tags: [design, building in public]
---

Until this week, a finished vote on Solon could say `Session: CLOSED` and describe its rules as `SIMPLE_MAJORITY · quorum 50% · electorate ALL_MEMBERS`. Every word was correct. Almost nobody could read it.

Now the same vote says: *Voting has ended. Agreed. All members vote; at least 50% of them must take part, and more than half must agree.*

## Two depths

Solon has two kinds of reader, and both matter.

Most people come to join, suggest something, vote and see what happened. For them, the everyday pages (the dashboard, decisions, joining and the record) now use plain words throughout. A suggestion is "suggested", a vote is "started", a result is "agreed" or "turned down", and money is shown in bitcoin rather than satoshis.

Some people want to know exactly how it works: which rule a vote was counted under, which key signed a ballot, what the raw entry on the record says. For them nothing was taken away. Every everyday page has a closed **Technical details** section with the identifiers, the addresses, the raw entry and the links to the same data as JSON. The deep side of the site (the governance explainers, security, the API, and now the [whitepaper](/whitepaper) and [questions and answers](/faq)) stays as precise as it needs to be.

## Keeping it that way

Plain words drift back. Someone prints a status straight from the database, and a page says `ACTIVE` again. So the build now checks for it: every everyday page is loaded, and if any text outside Technical details contains a value the database stores as a code, the build fails. The check failed against the live site before this change and passes now.

## Shared, not rebuilt

The questions and answers, this blog and the whitepaper run on [bip-kit](https://github.com/bitbaum/bip-kit), the small open-source kit our products share for building in public. Five of them had each written their own reader for a folder of posts; that reader, a questions-and-answers block and the markdown clean-up they all needed are now part of the kit, so the next product gets them for free.
