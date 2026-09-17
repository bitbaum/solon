import { describe, expect, it } from "vitest";
import {
  generateKeyPair,
  organizationMessage,
  registrationMessage,
  signMessage,
  verifyMessage,
} from "../message";

const ACTOR = "5f2716c8-1111-2222-3333-444455556666";

describe("organizationMessage", () => {
  it("matches the golden string exactly (wallets sign these bytes)", () => {
    expect(
      organizationMessage({
        slug: "heidi",
        name: "Heidi",
        actorId: ACTOR,
        founderAddress: "1BitcoinEaterAddressDontSendf59kuE",
      }),
    ).toBe(
      `Solon organization\norg:heidi\nname:Heidi\nactor:${ACTOR}\naddress:1BitcoinEaterAddressDontSendf59kuE`,
    );
  });

  it("binds the project when Loki vouched for one", () => {
    expect(
      organizationMessage({
        slug: "heidi",
        name: "Heidi",
        actorId: ACTOR,
        founderAddress: "1abc",
        project: "heidi",
      }),
    ).toBe(
      `Solon organization\norg:heidi\nname:Heidi\nactor:${ACTOR}\naddress:1abc\nproject:heidi`,
    );
  });

  it("cannot be satisfied by a membership signature over the same fields", () => {
    // Domain separation: the first line differs, so claiming a seat never
    // doubles as founding an organization.
    const pair = generateKeyPair();
    const membership = registrationMessage({
      orgSlug: "heidi",
      actorId: ACTOR,
      memberAddress: pair.address,
    });
    const founding = organizationMessage({
      slug: "heidi",
      name: "Heidi",
      actorId: ACTOR,
      founderAddress: pair.address,
    });
    const signature = signMessage(membership, pair.privateKeyHex);
    expect(verifyMessage(membership, pair.address, signature).valid).toBe(true);
    expect(verifyMessage(founding, pair.address, signature).valid).toBe(false);
  });

  it("a signature for one project does not verify for another, or for none", () => {
    const pair = generateKeyPair();
    const base = { slug: "heidi", name: "Heidi", actorId: ACTOR, founderAddress: pair.address };
    const signed = signMessage(
      organizationMessage({ ...base, project: "heidi" }),
      pair.privateKeyHex,
    );
    expect(
      verifyMessage(organizationMessage({ ...base, project: "heidi" }), pair.address, signed).valid,
    ).toBe(true);
    expect(
      verifyMessage(organizationMessage({ ...base, project: "loki" }), pair.address, signed).valid,
    ).toBe(false);
    expect(verifyMessage(organizationMessage(base), pair.address, signed).valid).toBe(false);
  });
});
