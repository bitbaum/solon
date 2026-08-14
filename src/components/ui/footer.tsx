import Link from "next/link";
import { ECOSYSTEM_PILLARS, SOLON_GITHUB_URL } from "@/lib/config/ecosystem";

// Only routes that actually exist belong here — a footer link to a 404 is a lie.
export default function Footer() {
  const siblings = ECOSYSTEM_PILLARS.filter((p) => p.key !== "solon");

  return (
    <footer className="mt-16 border-t border-default bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div>
            <div className="text-sm font-semibold text-navy">Platform</div>
            <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
              <li>
                <Link href="/features" className="hover:text-navy">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-navy">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/integration" className="hover:text-navy">
                  Integration
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-navy">Governance</div>
            <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
              <li>
                <Link href="/governance/voting" className="hover:text-navy">
                  Voting
                </Link>
              </li>
              <li>
                <Link href="/governance/audit" className="hover:text-navy">
                  Audit Trail
                </Link>
              </li>
              <li>
                <Link href="/treasury/bitcoin" className="hover:text-navy">
                  Bitcoin Treasury
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-navy">Ecosystem</div>
            <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
              <li>
                <Link href="/ecosystem" className="hover:text-navy">
                  Three Pillars
                </Link>
              </li>
              {siblings.map((p) => (
                <li key={p.key}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-navy"
                  >
                    {p.name} — {p.role}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-navy">Resources</div>
            <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
              <li>
                <Link href="/about" className="hover:text-navy">
                  About
                </Link>
              </li>
              <li>
                <a
                  href={SOLON_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-navy"
                >
                  Source Code
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-fg-secondary">
            © {new Date().getFullYear()} Solon. All rights reserved.
          </div>
          <div className="text-sm text-fg-secondary">
            The governance pillar of the OrangeCat stack.
          </div>
        </div>
      </div>
    </footer>
  );
}
