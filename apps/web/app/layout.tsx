import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guardian — Understand. Stay safe.",
  description: "A digital safety and accessibility assistant for vulnerable Nigerians.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
