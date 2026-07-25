"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { Outfit } from "next/font/google"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Check, ChevronLeft, Loader2, Lock } from "lucide-react"
import { Toaster, toast } from "sonner"
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioGroupPrimitive, Label as LabelPrimitive } from "radix-ui"

// Brand palette, for reference — used directly as Tailwind arbitrary values
// below since Tailwind can't read JS variables at build time.
//   accent #a8ff3e   bg #090909   card #0e0e0e   border #1f1f1f   muted #6b6b6b

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const cx = (...classes: Array<string | false | undefined | null>) => classes.filter(Boolean).join(" ")

const USE_CASES = [
  "Personal projects",
  "School / education",
  "Business",
  "Agency or freelance work",
  "Other",
] as const

type UseCase = (typeof USE_CASES)[number]

type OnboardingFormData = {
  firstName: string
  lastName: string
  email: string
  newsletter: boolean
  useCase: UseCase | ""
}

const OSHuntLogo = ({ className }: { className?: string }) => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="14" cy="14" r="2.5" fill="currentColor" />
    <line x1="14" y1="1" x2="14" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="21.5" x2="14" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="14" x2="6.5" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="21.5" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const inputClass =
  "w-full rounded-[7px] border border-[#1f1f1f] bg-[#151515] px-3.5 py-2.5 text-[13.5px] text-[#efefef] outline-none placeholder:text-[#3a3a3a] transition-colors focus-visible:border-[#a8ff3e]/60 disabled:cursor-not-allowed"

const primaryButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-[#a8ff3e] px-4 py-3 text-[14px] font-bold tracking-tight text-[#0a0a0a] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#141414] disabled:text-[#333] disabled:opacity-100 disabled:active:scale-100"

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -24 }),
}
const slideVariantsReduced = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: "",
    lastName: "",
    // Placeholder — swap for useSession()?.data?.user?.email against a real session.
    email: "ayush@example.com",
    newsletter: false,
    useCase: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleContinue = (e: FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleDone = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.useCase || isSubmitting) return
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        window.location.href = "/hunt"
      } else if (response.status === 401) {
        signIn()
      } else {
        toast.error("Couldn't save your profile", { description: "Give it another try in a moment." })
        setIsSubmitting(false)
      }
    } catch {
      toast.error("Couldn't reach the server", { description: "Check your connection and try again." })
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={cx(
        outfit.className,
        "relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#090909] text-white antialiased"
      )}
    >
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: { background: "#0e0e0e", color: "#efefef", border: "1px solid #1f1f1f" },
        }}
      />

      {/* Signature ambient element: a slow radar ping echoing the logo's reticle */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[16%] size-[560px] -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border border-[#a8ff3e]/20 motion-safe:animate-[radar-ping_5s_ease-out_infinite]"
            style={{ animationDelay: `${i * 1.6}s` }}
          />
        ))}
        <div className="absolute inset-0 rounded-full bg-[#a8ff3e]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-5 pb-12 pt-[clamp(28px,9vh,110px)] sm:px-6">
        <p aria-live="polite" className="sr-only">
          Step {step} of 2: {step === 1 ? "Create your account" : "Personalize your hunt"}
        </p>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10 flex items-center gap-2 sm:mb-11"
        >
          <OSHuntLogo className="text-[#a8ff3e]" />
          <span className="text-[15px] font-semibold tracking-tight">OSHunt</span>
        </motion.div>

        <div className="w-full max-w-[400px]">
          {/* Step indicator */}
          <div className="mb-8 flex items-center justify-center">
            {[1, 2].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={cx(
                    "z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300",
                    step >= s ? "bg-[#a8ff3e] text-[#0a0a0a]" : "border border-[#1f1f1f] bg-[#141414] text-[#666]"
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {step > s ? (
                      <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} className="flex">
                        <Check className="size-3.5" strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <motion.span key="num">{s}</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {i === 0 && (
                  <div className="relative h-px w-14 overflow-hidden bg-[#1f1f1f]">
                    <div className={cx("absolute inset-0 origin-left bg-[#a8ff3e] transition-transform duration-500 ease-out", step === 2 ? "scale-x-100" : "scale-x-0")} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait" custom={step} initial={false}>
            {step === 1 ? (
              <motion.form
                key="step-1"
                custom={-1}
                variants={prefersReducedMotion ? slideVariantsReduced : slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
                onSubmit={handleContinue}
                className="flex flex-col gap-3.5"
                noValidate
              >
                <div className="mb-1.5">
                  <h1 className="text-[22px] font-bold leading-tight tracking-tight">Create your account</h1>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#666]">One step away from your first OSS contribution.</p>
                </div>

                <div className="flex flex-col gap-2.5 rounded-[10px] border border-[#1f1f1f] bg-[#0e0e0e] p-4">
                  <span className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#666]">Personal info</span>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <LabelPrimitive.Root htmlFor="firstName" className="sr-only">First name</LabelPrimitive.Root>
                      <input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="First name"
                        autoComplete="given-name"
                        autoFocus
                        className={inputClass}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <LabelPrimitive.Root htmlFor="lastName" className="sr-only">Last name</LabelPrimitive.Root>
                      <input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Last name"
                        autoComplete="family-name"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <LabelPrimitive.Root htmlFor="email" className="sr-only">Email</LabelPrimitive.Root>
                    <input
                      id="email"
                      value={formData.email}
                      disabled
                      className={cx(inputClass, "bg-[#0a0a0a] pr-9 text-[#555]")}
                    />
                    <Lock className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#555]" />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 py-0.5 text-[13px] text-[#888]">
                  <CheckboxPrimitive.Root
                    checked={formData.newsletter}
                    onCheckedChange={(checked) => setFormData({ ...formData, newsletter: checked === true })}
                    className="flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border border-[#2a2a2a] outline-none transition-colors data-[state=checked]:border-[#a8ff3e] data-[state=checked]:bg-[#a8ff3e] data-[state=checked]:text-[#0a0a0a]"
                  >
                    <CheckboxPrimitive.Indicator>
                      <Check className="size-3" strokeWidth={3} />
                    </CheckboxPrimitive.Indicator>
                  </CheckboxPrimitive.Root>
                  Send me OSHunt drops — no spam, ever.
                </label>

                <button type="submit" className={cx(primaryButtonClass, "mt-0.5 h-11")}>
                  Continue
                  <ArrowRight className="size-4" />
                </button>

                <p className="text-center text-[11px] leading-relaxed text-[#666]">
                  By continuing you agree to our{" "}
                  <span className="cursor-pointer text-[#999] underline underline-offset-2 hover:text-white">Terms</span>{" "}
                  and{" "}
                  <span className="cursor-pointer text-[#999] underline underline-offset-2 hover:text-white">Privacy Policy</span>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="step-2"
                custom={1}
                variants={prefersReducedMotion ? slideVariantsReduced : slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
                onSubmit={handleDone}
                className="flex flex-col gap-3.5"
              >
                <div className="mb-1.5">
                  <h1 className="text-[22px] font-bold leading-tight tracking-tight">Personalize your hunt</h1>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#666]">Helps us surface the right issues and repos for you.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <span id="use-case-label" className="text-[11px] font-semibold uppercase tracking-wider text-[#666]">
                    What&apos;ll you use OSHunt for?
                  </span>
                  <RadioGroupPrimitive.Root
                    value={formData.useCase}
                    onValueChange={(value) => setFormData({ ...formData, useCase: value as UseCase })}
                    aria-labelledby="use-case-label"
                    className="flex flex-col overflow-hidden rounded-xl border border-[#1f1f1f]"
                  >
                    {USE_CASES.map((opt, i) => {
                      const inputId = `use-case-${i}`
                      const selected = formData.useCase === opt
                      return (
                        <label
                          key={opt}
                          htmlFor={inputId}
                          className={cx(
                            "flex cursor-pointer items-center justify-between px-4 py-3.5 transition-colors",
                            i < USE_CASES.length - 1 && "border-b border-[#1f1f1f]",
                            selected ? "bg-[#131313]" : "bg-[#0f0f0f] hover:bg-[#131313]/60"
                          )}
                        >
                          <span className={cx("text-sm transition-colors", selected ? "font-medium text-white" : "text-[#888]")}>{opt}</span>
                          <RadioGroupPrimitive.Item
                            value={opt}
                            id={inputId}
                            className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#2a2a2a] outline-none transition-colors data-[state=checked]:border-[#a8ff3e]"
                          >
                            <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-[#a8ff3e]" />
                          </RadioGroupPrimitive.Item>
                        </label>
                      )
                    })}
                  </RadioGroupPrimitive.Root>
                </div>

                <button type="submit" disabled={!formData.useCase || isSubmitting} className={cx(primaryButtonClass, "mt-0.5 h-11")}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving profile...
                    </>
                  ) : formData.useCase ? (
                    <>
                      Start hunting
                      <ArrowRight className="size-4" />
                    </>
                  ) : (
                    "Select a use case first"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center gap-0.5 py-1 text-center text-[13px] text-[#444] transition-colors hover:text-[#888]"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes radar-ping {
          0% { transform: scale(0.4); opacity: 0.55; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  )
}