# Justice

How a town judges its own, without inflicting suffering on anyone — including
the person being punished.

This is a Townsism organ document. It quotes [`TOWNSISM.md`](TOWNSISM.md) and
does not fork a second thesis: the essay asserts that a town is small enough to
**judge itself**, and this file is what that sentence commits us to.

_Status: a design, not a shipped feature. Solon implements none of this today —
its only hook is that `SAFETY` is a humans-only, supermajority category
(`src/lib/config/governance.ts`). Not a legal filing. It does not override the
law of the place you live._

---

## 1 · One sentence

Punishment is containment plus an honest offer of a way back — never pain as a
purpose — and the person owes the town value, which the town makes it possible
for them to produce.

## 2 · Pain is not the product

Every justice system that permits suffering as an end ends up producing it as an
output, because there is always someone whose job gets easier when it is
allowed. So the rule is stated as a prohibition, not a preference: **no
condition may be imposed for the purpose of making a person suffer.**

Losing your liberty is a real harm and we do not pretend otherwise. It is
justified only by what it prevents — a person who will hurt someone else being
free to do it. Nothing else rides along with it. Hunger, cold, filth, fear,
isolation, boredom as policy, violence tolerated between the confined: none of
these prevent anything. They are the system's own idleness dressed as severity.

A person in custody is a human being. That sentence is either operative or
decorative, and the floor below is how you tell which.

## 3 · The floor is unconditional

Some things are never a lever. They are not earned, cannot be revoked, and are
not reduced by refusal, by the offence, or by danger level:

- Enough good food, clean water, warmth, light, sleep.
- Healthcare, including mental healthcare and addiction treatment, at the
  standard available to any resident.
- Physical safety — from staff and from other confined people. Assault in
  custody is a failure of the town, prosecuted as such.
- Contact with family and children, and legal recourse the person can actually
  reach.
- Being told, in writing, exactly what they must do to improve their situation,
  and when it will next be reviewed.

Anything a town wants to make conditional must be above this line. If the floor
can be breached to gain compliance, the floor was never a floor and everything
else in this document is theatre.

## 4 · Two dials, never crossed

Almost every cruelty in conventional prison comes from running one dial for two
jobs. Keep them separate:

| Dial | Set by | Never set by |
|---|---|---|
| **Containment** — how confined, how supervised | Demonstrated danger to others, assessed and re-reviewed on a published clock | The moral label of the offence, staff convenience, public mood |
| **Conditions** — autonomy, comfort, privacy, movement, earnings | The person's own participation in work and repair | Anything in the floor (§3) |

A dangerous person who works and repairs earns a good life inside a hard
perimeter. A harmless person who refuses everything gets a plain life in an open
setting. The two facts are answered by the two dials, and neither dial is
allowed to do the other's work.

## 5 · Work that is actually work

Nobody sits idle. Idleness is not mercy — it is the cheapest thing a system can
do with a person, and it returns them worse. But "they must add value" is one
sentence away from a labour camp, so the conditions are strict:

- **Real pay at the real rate** for the work done. Underpaying the confined
  makes their labour attractive for the wrong reason.
- **Earnings split in a published order**: restitution to the victim first, then
  the person's dependants, then savings that leave with them on release. A
  person walking out with money and a work history is the whole point.
- **Refusal costs comfort, never the floor.** No food, healthcare, safety, or
  family contact is ever attached to output.
- **The town must not profit from having prisoners.** Labour revenue may not
  fund the justice budget, and no custody contract may pay per occupied bed.
  A town that earns from confinement will find reasons to confine.
- **Work the outside actually wants.** Training on the town's real work, not
  make-work invented to fill a day. The test is whether an employer would hire
  the output at that price.

For the dangerous, the work moves to them: remote work, workshops, maintenance,
tutoring other inmates, anything that can be done inside a perimeter. Confined
is not the same as useless, and treating it as the same is a choice.

## 6 · Most refusal is incapacity

The person who "won't work" is usually in withdrawal, unmedicated, illiterate,
brain-injured, or has never once been taught. Treat refusal as a diagnosis
before you treat it as a stance: addiction treatment, mental healthcare,
literacy, a trade, debt help. Only after the help is genuinely on offer does
refusal mean what it looks like — and even then it buys a plainer life, not a
worse human being.

## 7 · The way up is always open

This is the load-bearing promise. At every level, including the lowest:

- The next step is **written down, specific, and achievable this month**. Not
  "good behaviour" — a list.
- The review happens on a **published clock**, whether or not anyone asks, and a
  missed review is a failure logged against the town, not the person.
- **No permanent bottom.** No condition, no sentence, no assessment may close
  the path. A door that cannot open is the thing we refuse to build.
- Progress is **not forfeited by a bad week**. You can fall a step; you cannot
  fall out of the ladder.

People climb ladders they believe exist. The reason conventional prison produces
apathy is not that the inmates are apathetic — it is that the ladder is a rumour.

## 8 · The victim is not a spectator

An offender-only system is not justice. The victim gets restitution paid from
real earnings, a say in what repair would count, information about decisions
that concern them — and the right to want none of it. Repair is offered, never
compelled on either side; a forced apology is worth nothing to anyone.

## 9 · Release without a cliff

Most reoffending is manufactured at the gate: no address, no job, no ID, no
money, no one. The town that judged you is small enough to be the town that
reintegrates you, so continuity is the design — the work continues, housing is
arranged before the date, savings are in hand, the record stops following the
person once the debt is paid.

**Exit is not a loophole.** Townsism's right of exit still holds — a person may
leave a town — but you do not export danger to a neighbour who has not consented
to receive it. Hospitality cuts both ways: transfer happens with the receiving
town's agreement and with the record traveling openly, or it does not happen.

## 10 · Who decides

Two different things, decided two different ways:

- **The rules** — the floor, the dials, the ladder, the clocks — are a `SAFETY`
  decision: humans-only, supermajority, versioned as policy, every change in the
  append-only audit trail. Agents may propose, model, and check consistency.
  No agent vote is ever counted. A machine that can vote on who gets caged is
  the thing Solon exists to make impossible.
- **A case** is never a town-wide vote. Majorities are exactly the wrong
  instrument for guilt and danger — that is a mob with a quorum. Cases go to a
  panel that publishes its reasons, with appeal, and with its rate of being
  overturned published too.

## 11 · Publish the numbers

A town that will not measure this is asking to be trusted, and Townsism does not
run on trust. Published, append-only, on the same footing as the treasury:
reoffending at one/three/five years, earnings and restitution actually paid,
tier transitions up and down, reviews held on time, and every injury or death in
custody. Especially the last one. A justice system's honesty is measured by what
it reports when the number is bad.

## 12 · What we are not saying

- **Not the abolition of consequence.** Liberty is genuinely lost, perimeters
  are real, and a dangerous person is contained for as long as they are
  dangerous.
- **Not forced labour.** The floor in §3 is what separates the two, and it is
  why it is written as unconditional.
- **Not a cost-cutting scheme.** Selling inmate hours to the lowest bidder is
  the failure mode this document is built to block (§5).
- **Not soft on danger.** Containment is set by evidence and reviewed on a
  clock, in both directions.
- **Not software.** Solon can version the rules, sign the votes and keep the
  record. It cannot make a town humane. This is a claim about how people should
  judge each other, and the code only makes the claim auditable.

## 13 · Why this benefits everyone

The cynical case and the humane case are the same case. A caged, idle,
brutalised person costs the town money, returns angrier, and offends again. A
person who works, pays restitution, learns a trade and leaves with savings and a
reference costs less, repays the person they harmed, and becomes a taxpayer
instead of a recurring bill.

You do not have to feel compassion for this to work. But it turns out that the
system that spends nothing on suffering is also the cheapest one — which is what
you would expect, because suffering was never producing anything.

---

*Quote this file. If the thesis changes, change the essay and this file together.*
