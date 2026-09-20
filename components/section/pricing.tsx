'use client';

import { useState } from 'react';
import Navbar from '@/components/ui/Navbar';

type PlanFeature = {
  text: string;
  included: boolean;
};

type PricingTier = {
  name: string;
  price: string;
  period: string;
  desc: string;
  badge?: string;
  highlighted?: boolean;
  ctaText: string;
  ctaHref: string;
  features: PlanFeature[];
};

const TIERS: PricingTier[] = [
  {
    name: 'Individual / Beta',
    price: '$0',
    period: 'forever',
    desc: 'Everything you need to find your first issue and build a verifiable contribution record.',
    ctaText: 'Get started free',
    ctaHref: '/login',
    features: [
      { text: 'Core AI issue matching (up to 20/day)', included: true },
      { text: 'Standard Progress dashboard & Kanban board', included: true },
      { text: 'Unlock & display milestone badges', included: true },
      { text: 'Basic stack coverage bars', included: true },
      { text: 'Learn in Public feed access', included: true },
      { text: 'Priority matching queue', included: false },
      { text: 'Deep GitLense codebase architecture analytics', included: false },
    ],
  },
  {
    name: 'Pro Hunter',
    price: '499',
    period: '/year', // or '/month' depending on your billing model (e.g., ₹499/mo or $499/yr)
    desc: 'For serious contributors and career switchers looking to accelerate their PR review cycles.',
    badge: 'MOST POPULAR',
    highlighted: true,
    ctaText: 'Upgrade to Pro — 499',
    ctaHref: '/checkout?plan=pro_499',
    features: [
      { text: 'Unlimited real-time AI issue matching', included: true },
      { text: 'Priority matching queue & instant notifications', included: true },
      { text: 'Deep GitLense codebase architecture analytics', included: true },
      { text: 'Advanced Kanban dashboard & PR review tracking', included: true },
      { text: 'Custom stack filters & multi-org tracking', included: true },
      { text: 'All milestone badges & verified Pro profile glow', included: true },
      { text: '24/7 dedicated Discord & email support', included: true },
    ],
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <span className="inline-block text-xs sm:text-sm font-medium tracking-wide text-[#a8ff3e] mb-3 uppercase">
            Pricing Plans
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            Predictable pricing for every stage of your open source journey
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/50">
            Core matching, dashboards, and badges are free forever. Upgrade to Pro for deep analytics, priority queues, and unlimited codebase insights.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {TIERS.map((tier) => {
            const isPro = tier.highlighted;

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all duration-200 ${
                  isPro
                    ? 'bg-[#121212] border-2 border-[#a8ff3e] shadow-[0_0_40px_rgba(168,255,62,0.1)] scale-[1.02] lg:-translate-y-2'
                    : 'bg-white/2 border border-white/10 hover:border-white/20'
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#a8ff3e] text-[#090909] text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                    {tier.badge}
                  </div>
                )}

                <div>
                  {/* Tier Title & Price */}
                  <div className="mb-6">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white/90">
                      {tier.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/50 min-h-[40px] leading-relaxed">
                      {tier.desc}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-white/10">
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                      {tier.price}
                    </span>
                    <span className="text-sm font-medium text-white/50">{tier.period}</span>
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-3.5 mb-8">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                        {feat.included ? (
                          <CheckIcon className="w-4 h-4 shrink-0 text-[#a8ff3e] mt-0.5" />
                        ) : (
                          <CrossIcon className="w-4 h-4 shrink-0 text-white/20 mt-0.5" />
                        )}
                        <span
                          className={
                            feat.included ? 'text-white/80' : 'text-white/30 line-through'
                          }
                        >
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action CTA */}
                <a
                  href={tier.ctaHref}
                  className={`w-full py-3 px-5 rounded-xl text-center text-sm sm:text-base font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 ${
                    isPro
                      ? 'bg-[#a8ff3e] text-[#090909] hover:bg-[#bdff66] shadow-md hover:shadow-[#a8ff3e]/20'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {tier.ctaText}
                </a>
              </div>
            );
          })}
        </div>

        {/* Footer Guarantee / FAQ callout */}
        <div className="mt-16 text-center border border-white/10 rounded-2xl p-6 sm:p-8 bg-white/2">
          <h4 className="text-base sm:text-lg font-semibold text-white/90 mb-2">
            No-risk cancelation & transparent refunds
          </h4>
          <p className="text-xs sm:text-sm text-white/50 max-w-xl mx-auto mb-4 leading-relaxed">
            You can cancel your Pro membership at any time from your account settings with zero friction — no questions asked. Have custom billing requirements? Reach out to support.
          </p>
          <a
            href="/faq"
            className="text-xs sm:text-sm font-medium text-[#a8ff3e] hover:underline inline-flex items-center gap-1"
          >
            Read billing FAQs →
          </a>
        </div>
      </div>
    </main>
  );
}