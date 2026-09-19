"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { role: "Project Manager", email: "pm@sppi.demo" },
  { role: "PMO / Portfolio", email: "pmo@sppi.demo" },
  { role: "Researcher", email: "researcher@sppi.demo" },
  { role: "Admin", email: "admin@sppi.demo" },
  { role: "Viewer", email: "viewer@sppi.demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">SPPI Assessment Application</h1>
        <p className="mt-1 text-sm text-slate-500">Spatial Project Performance Index scoring tool</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="you@sppi.demo"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="card p-4 text-sm text-slate-600">
        <p className="mb-2 font-semibold text-slate-700">Demo accounts (password: demo1234)</p>
        <ul className="space-y-1">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email} className="flex justify-between">
              <span>{a.role}</span>
              <button
                type="button"
                className="text-slate-500 underline hover:text-slate-800"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("demo1234");
                }}
              >
                {a.email}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
