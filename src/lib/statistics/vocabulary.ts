/**
 * The words of the statistics record, dependency-free so client code and the
 * schema can both read them.
 */

/** What a statistics record asserts. */
export const STATISTIC_RECORD_KINDS = ["law_link", "event", "enforcement"] as const;
export type StatisticRecordKind = (typeof STATISTIC_RECORD_KINDS)[number];

/** A record is asserted, or a later row withdraws it. */
export const STATISTIC_RECORD_STATES = ["asserted", "retracted"] as const;
export type StatisticRecordState = (typeof STATISTIC_RECORD_STATES)[number];

/** How an enforcement record knows what it says: a measured rate, or a described practice. */
export const ENFORCEMENT_FORMS = ["rate", "practice"] as const;
export type EnforcementForm = (typeof ENFORCEMENT_FORMS)[number];
