import Link from "next/link";

export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl">Welcome to RepairRadar</h1>
      <p>Please <Link  href="/auth/signin" className="text-blue-500">sign in</Link> to continue.</p>
    </div>
  );
}
