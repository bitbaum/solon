"use client";
import { useState } from "react";

export default function WalletConnector({ onConnect }: { onConnect: (pubKey: string) => void }) {
  const [pub, setPub] = useState("");
  return (
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (pub.trim()) onConnect(pub.trim()); }}>
      <label htmlFor="bitcoin-address" className="sr-only">Registered Bitcoin address</label>
      <input
        id="bitcoin-address"
        name="bitcoin-address"
        inputMode="text"
        autoComplete="off"
        placeholder="Registered Bitcoin address"
        value={pub}
        onChange={(e) => setPub(e.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-solon-orange focus:outline-none focus:ring-2 focus:ring-solon-orange/20"
      />
      <button type="submit" disabled={!pub.trim()} className="btn-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
    </form>
  );
}
