import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ideate — YouTube Outlier Scanner",
  description: "Find viral video opportunities and growing channels in your niche",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="noise-bg">
        {children}
      </body>
    </html>
  );
}
