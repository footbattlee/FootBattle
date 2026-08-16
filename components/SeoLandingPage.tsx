import Link from "next/link";

import { SITE_URL } from "@/lib/seo";

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type Faq = {
  question: string;
  answer: string;
};

type RelatedLink = {
  href: string;
  label: string;
  description: string;
};

export default function SeoLandingPage({
  eyebrow,
  title,
  intro,
  ctaHref,
  ctaLabel,
  sections,
  faqs,
  relatedLinks,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  ctaHref: string;
  ctaLabel: string;
  sections: Section[];
  faqs: Faq[];
  relatedLinks: RelatedLink[];
}) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "FootBattle",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <Link href="/" className="text-sm font-bold text-emerald-300 hover:text-emerald-200">
          ← FootBattle ana sayfa
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">{intro}</p>
          <Link
            href={ctaHref}
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-400 px-6 py-3 font-black text-[#07111f] transition hover:bg-emerald-300"
          >
            {ctaLabel}
          </Link>
        </section>

        <article className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <h2 className="text-2xl font-black sm:text-3xl">{section.title}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets?.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-slate-200">
                      ✓ {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <section className="mt-10 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.05] p-6 sm:p-8">
          <h2 className="text-2xl font-black">Sık sorulan sorular</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <summary className="cursor-pointer font-black text-white">{faq.question}</summary>
                <p className="mt-3 leading-7 text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Bunları da dene</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-emerald-300/40 hover:bg-white/[0.06]">
                <div className="font-black text-emerald-300">{link.label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
