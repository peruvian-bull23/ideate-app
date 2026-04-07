import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ideate - Viral Content Ideas",
  description: "AI-powered YouTube scanner for viral video opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
