import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwiftDrop Dashboard",
  description: "SwiftDrop backend operations dashboard",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/drivers", label: "Drivers" },
  { href: "/merchants", label: "Merchants" },
  { href: "/outbox", label: "Outbox" },
  { href: "/health", label: "Health" },
  { href: "/auth", label: "Auth" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r">
            <Link href="/dashboard" className="block">
              <div className="text-lg font-semibold text-white">SwiftDrop</div>
              <div className="mt-1 text-sm text-slate-400">
                Operations Console
              </div>
            </Link>
            <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
            <header className="border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-white">
                    Backend Dashboard
                  </h1>
                  <p className="text-sm text-slate-400">
                    Gateway: http://localhost:8080
                  </p>
                </div>
                <span className="w-fit rounded-md border border-slate-800 px-3 py-1 text-xs text-slate-400">
                  Demo environment
                </span>
              </div>
            </header>
            <main className="px-5 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
