import { useState, useEffect } from "react"

const ACCENT = "#a8ff3e"
const BG = "#090909"
const BORDER = "#1f1f1f"
const MUTED = "#555"

const OSHuntLogo = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="9" stroke="#a8ff3e" strokeWidth="1.5"/>
    <circle cx="14" cy="14" r="2.5" fill="#a8ff3e"/>
    <line x1="14" y1="1" x2="14" y2="6.5" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="21.5" x2="14" y2="27" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="1" y1="14" x2="6.5" y2="14" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="21.5" y1="14" x2="27" y2="14" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function OnboardingPreview() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "ayush@example.com",
    newsletter: false,
    useCase: ""
  })
  const [doneAnim, setDoneAnim] = useState(false)

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  const lightInput = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 7,
    border: "1px solid #e0e0e0",
    backgroundColor: "#fff",
    color: "#111",
    outline: "none",
    fontSize: 13.5,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.15s"
  }

  const darkInput = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 7,
    border: `1px solid ${BORDER}`,
    backgroundColor: "#111",
    color: "#fff",
    outline: "none",
    fontSize: 13.5,
    fontFamily: "inherit",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    appearance: "none"
  }

  const handleDone = () => {
    setDoneAnim(true)
    setTimeout(() => setDoneAnim(false), 1800)
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "11vh",
      fontFamily: "'Outfit', sans-serif",
      color: "#fff",
      WebkitFontSmoothing: "antialiased"
    }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 44 }}>
        <OSHuntLogo />
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>
          OSHunt
        </span>
      </div>

      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
          {[1, 2].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: step >= s ? ACCENT : "#141414",
                border: step >= s ? "none" : `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: step >= s ? "#000" : MUTED,
                transition: "all 0.3s ease",
                flexShrink: 0,
                zIndex: 1
              }}>
                {s}
              </div>
              {i === 0 && (
                <div style={{
                  width: 56,
                  height: 1,
                  backgroundColor: BORDER,
                  position: "relative",
                  overflow: "hidden"
                }}>
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: ACCENT,
                    transform: step === 2 ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left",
                    transition: "transform 0.4s ease"
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                Create your account
              </h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "7px 0 0", lineHeight: 1.5 }}>
                One step away from your first OSS contribution.
              </p>
            </div>

            {/* ─ White personal info card ─ */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: 10,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              border: "1px solid #ebebeb"
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                Personal Info
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                  style={{ ...lightInput, flex: 1 }}
                />
                <input
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                  style={{ ...lightInput, flex: 1 }}
                />
              </div>
              <input
                value={formData.email}
                disabled
                placeholder="Email"
                style={{ ...lightInput, color: "#aaa", backgroundColor: "#f7f7f7", cursor: "not-allowed" }}
              />
            </div>

            {/* Newsletter */}
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#666",
              cursor: "pointer",
              padding: "2px 0"
            }}>
              <input
                type="checkbox"
                checked={formData.newsletter}
                onChange={e => setFormData({ ...formData, newsletter: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: ACCENT, cursor: "pointer" }}
              />
              Send me OSHunt drops — no spam, ever.
            </label>

            {/* CTA */}
            <button
              onClick={() => setStep(2)}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 8,
                backgroundColor: ACCENT,
                color: "#000",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                marginTop: 2,
                transition: "opacity 0.15s"
              }}
              onMouseOver={e => e.target.style.opacity = "0.88"}
              onMouseOut={e => e.target.style.opacity = "1"}
            >
              Continue →
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#333", margin: 0, lineHeight: 1.6 }}>
              By continuing you agree to our{" "}
              <span style={{ color: "#666", textDecoration: "underline", cursor: "pointer" }}>Terms</span>
              {" "}and{" "}
              <span style={{ color: "#666", textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>
            </p>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                Personalize your hunt
              </h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "7px 0 0", lineHeight: 1.5 }}>
                Helps us surface the right issues and repos for you.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#555", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                What'll you use OSHunt for?
              </label>
              <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                {["Personal projects", "School / education", "Business", "Agency or freelance work", "Other"].map((opt, i, arr) => (
                  <div
                    key={opt}
                    onClick={() => setFormData({ ...formData, useCase: opt })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      cursor: "pointer",
                      backgroundColor: formData.useCase === opt ? "#131313" : "#0f0f0f",
                      borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                      transition: "background-color 0.15s"
                    }}
                  >
                    <span style={{
                      fontSize: 14,
                      color: formData.useCase === opt ? "#fff" : "#888",
                      fontWeight: formData.useCase === opt ? 500 : 400,
                      transition: "color 0.15s"
                    }}>
                      {opt}
                    </span>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: formData.useCase === opt ? `2px solid ${ACCENT}` : "2px solid #2a2a2a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "border-color 0.15s"
                    }}>
                      {formData.useCase === opt && (
                        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: ACCENT }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleDone}
              disabled={!formData.useCase}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 8,
                backgroundColor: formData.useCase ? ACCENT : "#141414",
                color: formData.useCase ? "#000" : "#333",
                fontWeight: 700,
                border: formData.useCase ? "none" : `1px solid ${BORDER}`,
                cursor: formData.useCase ? "pointer" : "not-allowed",
                fontSize: 14,
                fontFamily: "inherit",
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
                marginTop: 2
              }}
            >
              {doneAnim ? "🎯 You're in!" : formData.useCase ? "Start hunting →" : "Select a use case first"}
            </button>

            <button
              onClick={() => setStep(1)}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                padding: "4px 0",
                textAlign: "center",
                transition: "color 0.15s"
              }}
              onMouseOver={e => e.target.style.color = "#888"}
              onMouseOut={e => e.target.style.color = "#444"}
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  )
}