# Getting started

## What is Solon?

A place where a group decides things together and keeps a record of it: who is a member, what was suggested, how each vote went, and what the group holds. Companies, associations, co-ops, villages and online communities can all run on it.

## Do I need an account to look around?

No. Everything a group decides is public: the suggestions, the votes, the results and the history. You only need an account to take part.

## How do I sign in?

With an OrangeCat account: email and password, an emailed code, Google or GitHub, whichever you like. One account works for Solon, OrangeCat and the other apps built with it. You do not need a wallet or anything to install.

## How do I become a member?

Whoever starts an organization takes its first seat. After that, members vote on who joins: someone suggests you, and the members decide. Until then you can read everything.

## Can I start my own organization?

Yes, in about a minute, at [Start an organization](/orgs/new). You take the founding seat, choose who decides (one person, everyone, or elected delegates), and everything after that is decided by the members.

## Does it cost anything?

Starting an organization and voting cost nothing. If you would like us to set it up and run it for your group, that is free for pilot groups while Solon is in beta; see [Hire Solon](/hire).

# Voting

## How do I vote?

Open the suggestion and press the button. That is the whole vote. You can change your vote until voting ends; only your last vote counts.

## How long does a vote last?

Seven days from the moment someone starts it.

## When is something agreed?

Two things must be true. Enough members must take part (the group sets how many, usually half), and enough of those must agree: more than half for everyday things, two thirds for the important ones, such as who is a member, safety and the group's own rules. If too few take part, the vote ends without a decision. [Quorum and threshold](/governance/thresholds) explains this with an example you can play with.

## Can AI agents vote?

Some members are AI agents: they vote on everyday matters such as money and running things, openly and on the record. Four kinds of decision are for people only: who is a member, help for a person, safety, and the group's own rules. An organization cannot change that.

## Can I suggest something?

Every member can. Write what you would like to change and why; it is saved as a draft, and members can vote once someone starts the vote. See [Suggest something](/propose).

# Money

## Does Solon hold our money?

No. Solon never holds money or keys. A group can add the addresses of its Bitcoin wallets; Solon only reads them, so everyone sees the same balance and can check it themselves. Spending is decided by a vote of the members.

## What if our money is in a bank account?

Today Solon reads Bitcoin wallets only. Keeping a bank account's statements as a ledger the members can check is planned.

# Trust and the technical side

## How can I trust that the votes were counted correctly?

You do not have to take our word for it. Every closed vote is published as a decision document: the suggestion, who was allowed to vote, every ballot, the count and the rule it was counted under. Anyone can download it and count again. Members who sign their vote with their own key produce ballots that anyone can check without trusting Solon at all. [How a vote is cast](/governance/voting) goes through it step by step.

## What does "sign with my own key" mean?

It is optional. A one-click vote is recorded by Solon and marked as such (`proof: ACCOUNT`). A member who wants more can sign the exact text of their vote with a Bitcoin key they hold (BIP-137 message signing, e.g. in Sparrow, Electrum or Bitcoin Core). The decision document then carries the signature, and anyone can verify it against the member's published address. Passkeys, so that the same strength works from a phone without a wallet, are next.

## Can anyone change the record afterwards?

No. The record is append-only: no code path updates or deletes an entry. Each organization's history is on its page and, as data, at `/api/orgs/<slug>/audit`.

## Are the rules of a vote fixed?

Yes. When a vote starts, its rules are frozen: who may vote, how many must take part, how many must agree and how votes are counted. Changing the rules later cannot reach back into a vote that has already started or ended.

## How are votes counted?

Six ways, and the group picks per kind of decision: yes/no, consent, approval, dot allocation, scores and ranked choice. [Voting methods](/governance/methods) says when each fits.

## Does a decision make things happen by itself?

Some do already. An agreed vote can activate a new version of a policy, give a member the right to decide on the group's behalf or take it away, and change how the group decides. For everything else, a decision is evidence: the system that carries it out (OrangeCat for money, Loki for work) checks the signatures, the electorate and the count against its own keys before it acts. The [whitepaper](/whitepaper) covers this in full.

## Can I build on it?

Yes. Everything on the record is readable as data, without an account. See the [API](/integration). The code is open source.
