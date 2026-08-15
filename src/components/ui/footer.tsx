import Link from "next/link";
import { ECOSYSTEM_PILLARS, SOLON_GITHUB_URL } from "@/lib/config/ecosystem";

// Only routes that actually exist belong here — a footer link to a 404 is a lie.
export default function Footer() {
  const siblings = ECOSYSTEM_PILLARS.filter((p) => p.key !== "solon");

  return (
    <footer className="border-t border-subtle bg-surface-public">
      <div className="section-shell py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-caps text-fg-tertiary">Platform</div>
            <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
              <li>
                <Link href="/features" className="transition-colors hover:text-fg-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/security" className="transition-colors hover:text-fg-primary">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/integration" className="transition-colors hover:text-fg-primary">
                  Integration
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-caps text-fg-tertiary">Governance</div>
            <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
              <li>
                <Link href="/governance/voting" className="transition-colors hover:text-fg-primary">
                  Voting
                </Link>
              </li>
              <li>
                <Link href="/governance/audit" className="transition-colors hover:text-fg-primary">
                  Audit Trail
                </Link>
              </li>
              <li>
                <Link href="/treasury/bitcoin" className="transition-colors hover:text-fg-primary">
                  Bitcoin Treasury
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-caps text-fg-tertiary">Ecosystem</div>
            <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
              <li>
                <Link href="/ecosystem" className="transition-colors hover:text-fg-primary">
                  Three Pillars
                </Link>
              </li>
              {siblings.map((p) => (
                <li key={p.key}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-fg-primary"
                  >
                    {p.name} — {p.role}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-caps text-fg-tertiary">Resources</div>
            <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
              <li>
                <Link href="/about" className="transition-colors hover:text-fg-primary">
                  About
                </Link>
              </li>
              <li>
                <Link href="/integration" className="transition-colors hover:text-fg-primary">
                  API
                </Link>
              </li>
              <li>
                <a
                  href={SOLON_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-fg-primary"
                >
                  Source Code
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-subtle pt-6 sm:flex-row">
          <div className="text-xs text-fg-tertiary">
            © {new Date().getFullYear()} Solon
          </div>
          <div className="text-xs text-fg-tertiary">
            The governance pillar of the OrangeCat stack.
          </div>
        </div>
      </div>
    </footer>
  );
}
