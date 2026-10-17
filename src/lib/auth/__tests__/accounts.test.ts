import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import { createAuthInstance } from "@bitbaum/accountkit/auth/server";
import * as governanceSchema from "@/lib/db/schema";

/**
 * Solon's own migrations, applied in order to a real (in-memory) Postgres,
 * carry the tables accounts need: a person can create an account with an
 * email and a password, with no OrangeCat account, and is signed in.
 */
describe("accounts", () => {
  it("a person signs up without OrangeCat against Solon's migrations", async () => {
    const pg = new PGlite();
    const dir = join(process.cwd(), "drizzle");
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      for (const statement of readFileSync(join(dir, file), "utf8").split(
        "--> statement-breakpoint",
      )) {
        if (statement.trim()) await pg.exec(statement);
      }
    }
    const site = { url: "https://solon.orangecat.ch", title: "Solon", slug: "solon" };
    const auth = createAuthInstance({
      site,
      database: drizzle(pg, { schema: governanceSchema }),
      mail: { configured: false, send: async () => {} },
      env: { NODE_ENV: "test", BETTER_AUTH_SECRET: "s".repeat(48) },
    });
    const signUp = await auth.handler(
      new Request(`${site.url}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: site.url },
        body: JSON.stringify({
          email: "citizen@example.ch",
          password: "a long phrase for a vote",
          name: "",
        }),
      }),
    );
    expect(signUp.status).toBe(200);
    const cookie = signUp.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const session = await (
      await auth.handler(new Request(`${site.url}/api/auth/get-session`, { headers: { cookie } }))
    ).json();
    expect(session.user.email).toBe("citizen@example.ch");
    await pg.close();
  }, 60_000);
});
