import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPPI Assessment Application",
  description: "Spatial Project Performance Index scoring tool",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar user={session?.user ?? null} />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
