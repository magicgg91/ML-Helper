import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Bloc 91/E1: locale-aware navigation. These wrappers automatically keep the
// active locale in the URL, so a public `<Link href="/tools">` resolves to
// `/fr/tools`, `/en/tools`, … per the current locale. Use these in PUBLIC
// components only — admin/login routes are not locale-prefixed and keep
// next/link + next/navigation.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
