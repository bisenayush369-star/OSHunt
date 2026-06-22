"use client"; 
import React from "react";
import { signIn } from "next-auth/react";


const styles = `
  *, *::before, *::after { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
  font-family: 'Outfit', system-ui, -apple-system, sans-serif; /* 💡 Uniform modern writing style */
}
  
  .login-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #050505;
    font-family: 'Outfit', sans-serif;
    position: relative;
    overflow: hidden;
    color: #fff;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    animation: float 10s infinite ease-in-out alternate;
    pointer-events: none;
  }
  .orb-1 { width: 400px; height: 400px; background: #a8ff3e; top: -100px; left: -100px; }
  .orb-2 { width: 300px; height: 300px; background: #2a2a2a; bottom: -50px; right: -50px; animation-delay: -5s; }

  @keyframes float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(30px, 50px) scale(1.1); }
  }

  .glass-card {
    position: relative;
    z-index: 10;
    background: rgba(15, 15, 15, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 3rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .glass-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(168,255,62,0.5), transparent);
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
  }

  .brand-logo { display: flex; justify-content: center; margin-bottom: 2rem; }
  .title { font-size: 28px; font-weight: 700; text-align: center; letter-spacing: -0.5px; margin-bottom: 8px; }
  .subtitle { font-size: 14px; color: #888; text-align: center; margin-bottom: 2.5rem; line-height: 1.5; }

  .auth-btn {
    width: 100%;
    padding: 14px 20px;
    border-radius: 12px;
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-github { background: #efefef; color: #090909; margin-bottom: 1rem; }
  .btn-github:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.1); }

  .btn-google { 
  background: rgba(255, 255, 255, 0.03); 
  color: #d0d0d0; 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  font-weight: 600;        /* 💡 Matches GitHub text thickness */
  letter-spacing: -0.2px; /* 💡 Matches GitHub text spacing */
}
  .btn-google:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); transform: translateY(-2px); }

  .divider { display: flex; align-items: center; gap: 16px; margin: 1.5rem 0; color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1); }
  .footer-text { text-align: center; font-size: 12px; color: #666; margin-top: 2rem; line-height: 1.6; }
  .footer-text a { color: #a8ff3e; text-decoration: none; }
`;

export default function LoginPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="login-wrapper">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <div className="glass-card">
          <div className="brand-logo">
            <svg width="42" height="42" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2" />
              <circle cx="18" cy="18" r="4" stroke="#a8ff3e" strokeWidth="0.7" opacity="0.4" />
              <line x1="18" y1="2" x2="18" y2="0" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="18" y1="34" x2="18" y2="36" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="2" y1="18" x2="0" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="34" y1="18" x2="36" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="18" cy="18" r="1.8" fill="#a8ff3e" />
            </svg>
          </div>

          <h1 className="title">Access OSHunt</h1>
          <p className="subtitle">Connect your account to start hunting issues and building your open-source legacy.</p>

          {/* GitHub Option — Removes buggy server wrapper and uses your local asset */}
          <button className="auth-btn btn-github" onClick={() => signIn("github", { callbackUrl: "/hunt" })}>
            <img src="/github.svg" alt="GitHub" width="18" height="18" />
            Continue with GitHub
          </button>

          <div className="divider">Or</div>

          {/* Google Option — Removes buggy server wrapper and uses your local asset */}
          <button className="auth-btn btn-google" onClick={() => signIn("google", { callbackUrl: "/hunt" })}>
            <img src="/google.svg" alt="Google" width="18" height="18" />
            Continue with Google
          </button>

          <p className="footer-text">
            By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </>
  );
}