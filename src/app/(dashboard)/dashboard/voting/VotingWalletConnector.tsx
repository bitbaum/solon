"use client";

import WalletConnector from "@/components/bitcoin/wallet-connector";
import { useSearchParams } from "next/navigation";

export default function VotingWalletConnector() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  if (address) {
    return (
      <div className="rounded-lg border border-solon-green/30 bg-solon-green/10 p-4 text-sm text-slate-700">
        <span className="font-semibold text-navy">Voting address:</span>{' '}
        <span className="break-all font-mono">{address}</span>
      </div>
    );
  }

  return (
    <WalletConnector onConnect={(pub) => {
      window.location.href = `/dashboard/voting?address=${encodeURIComponent(pub)}`;
    }} />
  );
}
