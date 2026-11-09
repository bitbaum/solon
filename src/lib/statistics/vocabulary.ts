/**
 * The words of the statistics record, dependency-free so client code and the
 * schema can both read them.
 */

/** What a statistics record asserts. */
export const STATISTIC_RECORD_KINDS = ["law_link", "event", "enforcement", "assessment"] as const;
export type StatisticRecordKind = (typeof STATISTIC_RECORD_KINDS)[number];

/** A record is asserted, or a later row withdraws it. */
export const STATISTIC_RECORD_STATES = ["asserted", "retracted"] as const;
export type StatisticRecordState = (typeof STATISTIC_RECORD_STATES)[number];

/** How an enforcement record knows what it says: a measured rate, or a described practice. */
export const ENFORCEMENT_FORMS = ["rate", "practice"] as const;
export type EnforcementForm = (typeof ENFORCEMENT_FORMS)[number];

/** How a coded value was reached: read from a text, reported by a source, or estimated. Only `coded` exists so far. */
export const ASSESSMENT_METHODS = ["coded"] as const;
export type AssessmentMethod = (typeof ASSESSMENT_METHODS)[number];

/** How sure the person who coded it is, and always with a note saying why. */
export const ASSESSMENT_CONFIDENCES = ["high", "medium", "low"] as const;
export type AssessmentConfidence = (typeof ASSESSMENT_CONFIDENCES)[number];
