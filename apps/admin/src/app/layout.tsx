import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@tnvios/ui/styles.css";

export const metadata: Metadata = {
  description: "Tnvios administration control center",
  title: {
    default: "Tnvios Admin",
    template: "%s | Tnvios Admin",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#f5f5f2", media: "(prefers-color-scheme: light)" },
    { color: "#111310", media: "(prefers-color-scheme: dark)" },
  ],
};

export interface RootLayoutProperties {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
