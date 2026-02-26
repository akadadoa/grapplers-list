import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-B95XBLGXS0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B95XBLGXS0');
          `}
        </Script>
      </head>
      <body className="antialiased bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
