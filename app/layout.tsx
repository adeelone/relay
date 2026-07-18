import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay",
  description:
    "Async AI task agent platform for observable long-running LLM jobs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
