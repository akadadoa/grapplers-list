import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grapplers List — BJJ Competition Map",
  description: "Find BJJ competitions near you. Interactive map of IBJJF and JJ World League events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
