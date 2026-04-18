import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import en from "../locales/en.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: en.appTitle,
  description: en.appDescription,
  icons: {
    icon: '/favicon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the nonce injected by middleware.ts so it can be forwarded to any
  // inline scripts that must run at hydration time.
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html lang="en" style={{ background: 'transparent' }}>
      <head>
        {/* Expose nonce to client scripts via a meta tag.
            Only the nonce value is placed here — no executable code. */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: 'transparent' }}
      >
        {children}
      </body>
    </html>
  );
}
