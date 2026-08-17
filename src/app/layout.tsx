import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
export const metadata: Metadata = {
  title: "ML-Helper Admin",
  description: "ML-Helper administration",
};
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
