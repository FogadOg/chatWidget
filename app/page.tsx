import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveLocaleCandidates } from "../lib/i18n";

export default async function RootPage() {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((s) => s.split(";")[0].trim());
  const locale = resolveLocaleCandidates(candidates);
  redirect(`/${locale}`);
}
