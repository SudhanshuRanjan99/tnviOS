import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./styles.css";

export const metadata: Metadata = {
  description: "Tnvios unified business workspace",
  title: {
    default: "Tnvios",
    template: "%s | Tnvios",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#f3f7f5", media: "(prefers-color-scheme: light)" },
    { color: "#101714", media: "(prefers-color-scheme: dark)" },
  ],
};

export interface RootLayoutProperties {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
