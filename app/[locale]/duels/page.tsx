import { notFound } from "next/navigation";
import MobileDuelsPage from "@/components/mobile/MobileDuelsPage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import styles from "./duels-parity.module.css";

export default async function DuelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className={styles.shell}>
      <MobileDuelsPage locale={locale as Locale} />
    </div>
  );
}
