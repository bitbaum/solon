/**
 * The Register's editorial policies (design §8.4, §13 item 4). Until the
 * Register is founded and adopts its first versions by decision, these are
 * the starting values George set; they then come from its `policies`, not
 * from here.
 */
export const REGISTER_POLICY_DEFAULTS = {
  /** The most places one comparison holds. */
  compareLimit: 4,
} as const;
