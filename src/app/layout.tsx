import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
export const metadata: Metadata = {
  title: "ML-Helper Admin",
  description: "ML-Helper administration",
};
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
