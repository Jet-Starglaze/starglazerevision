import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `
(() => {
  const storageKey = "starglaze-theme";
  const root = document.documentElement;

  function applyTheme(theme) {
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }

  try {
    const savedTheme = window.localStorage.getItem(storageKey);
    const theme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    applyTheme(theme);
  } catch {
    applyTheme(
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
    );
  }
})();
`;

export const metadata: Metadata = {
  title: {
    default: "StarglazeRevision",
    template: "%s | StarglazeRevision",
  },
  description:
    "Practice exam-style questions, get instant feedback, and revise smarter with StarglazeRevision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          id="starglaze-theme-script"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
