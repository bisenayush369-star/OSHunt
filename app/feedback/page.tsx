"use client";
import { useState } from "react";
import HomeNav from "@/components/ui/HomeNav";

// ---- Design Tokens (Matching your Dashboard/Tokavy theme) ----
const c = {
  bg: "#050505",
  card: "#111111",
  border: "rgba(255, 255, 255, 0.05)",
  borderHover: "rgba(255, 255, 255, 0.1)",
  text: "#ffffff",
  textDim: "#9e9e9e",
  lime: "#ccff00",
  label: "#7a7a7a",
  inputBg: "#1a1a1a",
};

export default function FeedbackPage() {
  const [category, setCategory] = useState("feature");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setStatus("submitting");
    // Simulate API call to your backend (e.g., saving to MongoDB or sending an email)
    setTimeout(() => {
      setStatus("success");
      setMessage("");
      setTimeout(() => setStatus("idle"), 3000);
    }, 1000);
  };

  return (
    <div style={{ background: c.bg, color: c.text, minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        .feed * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }
        
        .layout-container { max-width: 600px; margin: 0 auto; padding: 7rem 1.5rem 4rem; }
        .page-title { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem; color: #fff; text-transform: uppercase; }
        .page-desc { color: ${c.textDim}; margin-bottom: 2rem; font-size: 0.95rem; }
        
        .dash-card { 
          background: ${c.card}; 
          border-radius: 16px; 
          padding: 1.5rem; 
          border: 1px solid ${c.border};
        }
        
        .form-group { margin-bottom: 1.5rem; }
        .section-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em; color: ${c.label}; margin-bottom: 0.75rem; display: block; text-transform: uppercase; }
        
        .form-select, .form-textarea {
          width: 100%;
          background: ${c.inputBg};
          border: 1px solid ${c.border};
          color: ${c.text};
          border-radius: 12px;
          padding: 14px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .form-select:focus, .form-textarea:focus { border-color: ${c.lime}; }
        
        .form-textarea { resize: vertical; min-height: 120px; }
        
        .btn-submit {
          width: 100%;
          background: ${c.lime};
          color: #000;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease, opacity 0.15s ease;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .btn-submit:hover:not(:disabled) { opacity: 0.9; }
        .btn-submit:active:not(:disabled) { transform: scale(0.98); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .success-msg {
          text-align: center;
          color: ${c.lime};
          font-weight: 600;
          padding: 1rem;
          background: rgba(204, 255, 0, 0.05);
          border-radius: 12px;
          margin-top: 1rem;
        }
      `}</style>

      <HomeNav />

      <div className="feed layout-container">
        <h1 className="page-title">Feedback</h1>
        <p className="page-desc">Help us improve the platform. Report a bug or request a new feature.</p>

        <div className="dash-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="section-label">Category</label>
              <select 
                className="form-select" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="general">General Feedback</option>
              </select>
            </div>

            <div className="form-group">
              <label className="section-label">Message</label>
              <textarea 
                className="form-textarea" 
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-submit"
              disabled={status === "submitting" || !message.trim()}
            >
              {status === "submitting" ? "Sending..." : "Submit Feedback"}
            </button>
          </form>

          {status === "success" && (
            <div className="success-msg">
              Thanks for your feedback!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}