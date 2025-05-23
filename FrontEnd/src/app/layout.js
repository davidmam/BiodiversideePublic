import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

import { Suspense } from "react";

export const metadata = {
  title: "Biodiversi-Dee",
  description: "Dundee biodiversity data from the Dundee Biodiversity Network.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.className} antialiased dark:bg-gray-950`}
    >
      <head>
        <title>Biodiversi-Dee</title>
        <meta name="theme-color" content="#65a30d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="description"
          content="Dundee biodiversity data from the Dundee Biodiversity Network."
        />
        <meta
          name="keywords"
          content="biodiversity, Dundee, species, conservation, ecology"
        />
        <meta name="author" content="Ben Sloan" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Biodiversi-Dee" />
        <meta
          property="og:description"
          content="Dundee biodiversity data from the Dundee Biodiversity Network."
        />
        <meta property="og:image" content="/path/to/your/share-image.jpg" />
        <meta
          property="og:url"
          content="https://www.biodiversidee.vercel.app"
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Biodiversi-Dee" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Biodiversi-Dee" />
        <meta
          name="twitter:description"
          content="Dundee biodiversity data from the Dundee Biodiversity Network."
        />
        <meta name="twitter:image" content="/path/to/your/share-image.jpg" />
        <meta
          name="twitter:url"
          content="https://www.biodiversidee.vercel.app"
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-title" content="Biodiversi-Dee" />
        <meta name="application-name" content="Biodiversi-Dee" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
