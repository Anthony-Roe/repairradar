"use client";
import { useSession } from "next-auth/react";

export default function DebugSession() {
  const { data: session, status } = useSession();
  console.log("Client Status:", status, "Session:", session);

  return (
    <div className="p-6">
      <h1>Session Debug</h1>
      <p>Status: {status}</p>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}