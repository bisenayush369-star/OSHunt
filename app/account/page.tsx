"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import HomeNav from "@/components/ui/HomeNav"; 

// ---- design tokens (matches OSHunt: near-black bg, lime accent, Outfit font) ----
const c = {
  bg: "#090909",
  card: "#0e0e0e",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.16)",
  text: "#f2f2f2",
  textDim: "#8c8c8c",
  textFaint: "#5e5e5e",
  lime: "#a8ff3e",
  limeDim: "rgba(168,255,62,0.1)",
  red: "#ff5c5c",
  redDim: "rgba(255,92,92,0.08)",
};

function CameraIcon(props: any) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 8.5C4 7.67 4.67 7 5.5 7H8l1.2-1.8c.18-.27.49-.45.83-.45h3.94c.34 0 .65.18.83.45L15.99 7h2.51c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13c-.83 0-1.5-.67-1.5-1.5v-9Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GithubIcon(props: any) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.5 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.1-1.49-1.1-1.49-.9-.63.07-.62.07-.62.99.07 1.51 1.04 1.51 1.04.89 1.55 2.33 1.1 2.9.84.09-.66.34-1.1.62-1.36-2.22-.26-4.55-1.13-4.55-5.02 0-1.11.38-2.02 1.01-2.73-.1-.26-.44-1.31.1-2.72 0 0 .83-.27 2.72 1.04a9.2 9.2 0 0 1 4.96 0c1.89-1.31 2.72-1.04 2.72-1.04.54 1.41.2 2.46.1 2.72.63.71 1.01 1.62 1.01 2.73 0 3.9-2.34 4.76-4.57 5.01.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function LockIcon(props: any) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CheckIcon(props: any) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 12.5 9 18 20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("Building OSHunt — finding the right open source issue shouldn't be a hunt.");

  // Sync session data to local state once loaded
  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || "");
      setAvatar(session.user.image || null);
      setUsername(session.user.name?.replace(/\s+/g, '').toLowerCase() || "hunter");
    }
  }, [session]);

  const [githubConnected, setGithubConnected] = useState(true);
  const [githubUsername] = useState("ayushdevx"); // Sync this from DB later

  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
      markDirty();
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Add your API call here to save data to your backend
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (status === "loading") {
    return (
      <div style={{ background: c.bg, color: c.text, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Outfit', sans-serif" }}>
        Loading account details...
      </div>
    );
  }

  return (
    <div style={{ background: c.bg, color: c.text, minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        .acc * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }
        .acc input, .acc textarea, .acc button { font-family: 'Outfit', sans-serif; }
        
        /* Layout Utilities */
        .layout-container { max-width: 672px; margin: 0 auto; padding: 7rem 1.5rem 4rem; }
        .flex-row { display: flex; align-items: center; }
        .flex-start { display: flex; align-items: flex-start; }
        .space-between { justify-content: space-between; }
        .grid-2 { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
        @media (min-width: 768px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
        
        /* Components */
        .acc-card { background: ${c.card}; border: 1px solid ${c.border}; border-radius: 16px; transition: border-color .2s ease; padding: 1.75rem; margin-bottom: 1.5rem; }
        .acc-card:hover { border-color: ${c.borderHover}; }
        .acc-input {
          width: 100%; background: #0a0a0a; border: 1px solid ${c.border}; border-radius: 10px;
          padding: 10px 14px; color: ${c.text}; font-size: 14px; outline: none; transition: border-color .15s ease;
        }
        .acc-input:focus { border-color: ${c.lime}; }
        .acc-input::placeholder { color: ${c.textFaint}; }
        .acc-input:disabled { color: ${c.textDim}; cursor: not-allowed; }
        .acc-label { font-size: 12.5px; color: ${c.textDim}; margin-bottom: 6px; display: block; font-weight: 500; }
        
        .btn-lime {
          background: ${c.lime}; color: #0a0a0a; font-weight: 600; font-size: 13.5px;
          padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; transition: opacity .15s ease;
        }
        .btn-lime:hover { opacity: .88; }
        .btn-lime:disabled { opacity: .35; cursor: not-allowed; }
        
        .btn-ghost {
          background: transparent; color: ${c.text}; font-size: 13.5px; font-weight: 500;
          padding: 9px 16px; border-radius: 10px; border: 1px solid ${c.border}; cursor: pointer; transition: all .15s ease;
        }
        .btn-ghost:hover { border-color: ${c.borderHover}; }
        
        .btn-danger {
          background: ${c.redDim}; color: ${c.red}; font-size: 13.5px; font-weight: 500;
          padding: 9px 16px; border-radius: 10px; border: 1px solid rgba(255,92,92,0.25); cursor: pointer; transition: all .15s ease;
        }
        .btn-danger:hover { background: rgba(255,92,92,0.14); }
      `}</style>

      {/* Global Navigation */}
      <HomeNav />

      <div className="acc layout-container">
        {/* Header */}
        <div className="flex-start space-between" style={{ marginBottom: "2.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.25rem", color: "#fff" }}>Account</h1>
            <p style={{ color: c.textDim, fontSize: "0.875rem", margin: 0 }}>
              Manage your profile and connections.
            </p>
          </div>
          <div className="flex-row" style={{ gap: "0.75rem" }}>
            {saved && (
              <span style={{ color: c.lime, fontSize: "0.75rem", fontWeight: 500 }} className="flex-row gap-1">
                <CheckIcon style={{ marginRight: 4 }} /> Saved
              </span>
            )}
            <button className="btn-lime" disabled={!dirty} onClick={handleSave}>
              Save changes
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="acc-card">
          <div className="flex-row" style={{ gap: "1.25rem", marginBottom: "1.75rem" }}>
            <div style={{ position: "relative" }}>
              <div
                style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 600, background: "#1a1a1a", border: `1px solid ${c.border}` }}
              >
                {avatar ? (
                  <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: c.textDim }}>{fullName.charAt(0) || "U"}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: c.lime, color: "#0a0a0a", border: "2px solid #0e0e0e", cursor: "pointer" }}
              >
                <CameraIcon />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "1rem", margin: "0 0 2px 0", color: "#fff" }}>{fullName}</p>
              <p style={{ color: c.textDim, fontSize: "0.875rem", margin: 0 }}>@{username}</p>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: "1.25rem" }}>
            <div>
              <label className="acc-label">Full name</label>
              <input
                className="acc-input"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); markDirty(); }}
              />
            </div>
            <div>
              <label className="acc-label">Username</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.875rem", color: c.textFaint }}
                >
                  @
                </span>
                <input
                  className="acc-input"
                  style={{ paddingLeft: 24 }}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); markDirty(); }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label className="acc-label">Bio</label>
            <textarea
              className="acc-input"
              rows={3}
              maxLength={160}
              style={{ resize: "none" }}
              value={bio}
              onChange={(e) => { setBio(e.target.value); markDirty(); }}
            />
            <p style={{ color: c.textFaint, fontSize: "0.75rem", marginTop: "0.25rem", textAlign: "right", margin: "4px 0 0 0" }}>
              {bio.length}/160
            </p>
          </div>

          <div>
            <label className="acc-label">Email</label>
            <input className="acc-input" value={session?.user?.email || "No email provided"} disabled />
            <p className="flex-row" style={{ color: c.textFaint, fontSize: "0.75rem", marginTop: "0.5rem", gap: "6px", margin: "8px 0 0 0" }}>
              <LockIcon /> Synced from your sign-in provider — can't be changed here
            </p>
          </div>
        </div>

        {/* GitHub Connection */}
        <div className="acc-card flex-row space-between">
          <div className="flex-row" style={{ gap: "1rem" }}>
            <div
              style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a" }}
            >
              <GithubIcon />
            </div>
            <div>
              {githubConnected ? (
                <p className="flex-row" style={{ fontSize: "0.875rem", fontWeight: 500, margin: "0 0 2px 0", gap: "8px", color: "#fff" }}>
                  Connected as @{githubUsername}
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.lime, display: "inline-block" }} />
                </p>
              ) : (
                <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: "0 0 2px 0", color: c.textDim }}>Not connected</p>
              )}
              <p style={{ color: c.textFaint, fontSize: "0.75rem", margin: 0 }}>
                Used to seamlessly match you with relevant issues.
              </p>
            </div>
          </div>
          {githubConnected ? (
            <button className="btn-ghost" onClick={() => { setGithubConnected(false); markDirty(); }}>
              Disconnect
            </button>
          ) : (
            <button className="btn-lime" onClick={() => { setGithubConnected(true); markDirty(); }}>
              Connect GitHub
            </button>
          )}
        </div>

        {/* Danger Zone */}
        <div className="acc-card" style={{ borderColor: "rgba(255,92,92,0.18)", marginBottom: 0 }}>
          <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: "0 0 4px 0", color: "#fff" }}>Danger zone</p>
          <p style={{ color: c.textFaint, fontSize: "0.75rem", margin: "0 0 20px 0" }}>
            Permanently delete your profile, bookmarks and hunt history.
          </p>

          {!deleteOpen ? (
            <button className="btn-danger" onClick={() => setDeleteOpen(true)}>
              Delete account
            </button>
          ) : (
            <div style={{ padding: "1rem", background: c.redDim, borderRadius: 10, border: "1px solid rgba(255,92,92,0.25)" }}>
              <p style={{ fontSize: "0.875rem", marginBottom: "1rem", color: c.text, margin: "0 0 16px 0" }}>
                This can't be undone. Your account and all associated data will be permanently removed.
              </p>
              <div className="flex-row" style={{ gap: "0.75rem" }}>
                <button className="btn-danger" style={{ background: c.red, color: "#0a0a0a", borderColor: c.red }}>
                  Confirm delete
                </button>
                <button className="btn-ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}