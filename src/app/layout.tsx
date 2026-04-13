import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/auth/SessionProvider";
import Header from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBA Predictions",
  description: "Прогнозы на плей-офф NBA с друзьями",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Header />
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
