import { FAQJsonLd } from "@/lib/seo";

type Faq = {
  question: string;
  answer: string;
};

export default function GeoAnswerSection({
  title,
  summary,
  howItWorks,
  faqs,
}: {
  title: string;
  summary: string;
  howItWorks: string[];
  faqs: Faq[];
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6" aria-labelledby="geo-answer-title">
      <FAQJsonLd faqs={faqs} />
      <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <h2 id="geo-answer-title" className="text-2xl font-black text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base">
          {summary}
        </p>

        <h3 className="mt-7 text-lg font-black text-white">How it works</h3>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {howItWorks.map((step, index) => (
            <li key={step} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              <span className="mr-2 font-black text-emerald-300">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <h3 className="text-lg font-black text-white">Frequently asked questions</h3>
          <div className="mt-3 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <summary className="cursor-pointer font-bold text-white">{faq.question}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
