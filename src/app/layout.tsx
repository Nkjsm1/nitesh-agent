import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nitesh's Agent",
  description: "AI Chat with Puter.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 p-0">{children}</body>
    </html>
  );
}