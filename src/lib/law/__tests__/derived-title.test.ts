import { describe, expect, it } from "vitest";
import { actToMarkdown } from "../markdown";
import type { ActView } from "../view";

const act = (titleDerived: boolean): ActView => ({
  id: "a1",
  authority: "rso",
  kind: "decree",
  inForce: true,
  statusStated: false,
  titleDerived,
  title: "Указ от 27 апреля 2021 г.",
  systematicNumber: null,
  officialUrl: "https://presidentruo.org/ukaz/",
  version: null,
  provisions: [],
});

describe("a title Solon derived", () => {
  it("is marked as Solon's in the act's Markdown, and a publisher's title is not", () => {
    expect(actToMarkdown(act(true), "https://solon.test")).toContain(
      "title_derived_by_solon: true",
    );
    expect(actToMarkdown(act(false), "https://solon.test")).not.toContain("title_derived_by_solon");
  });

  it("says the status is not stated, as for every act of this publisher", () => {
    expect(actToMarkdown(act(true), "https://solon.test")).toContain(
      "in_force: not stated by the publisher",
    );
  });
});
