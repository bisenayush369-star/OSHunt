import Image from "next/image";
import Link from "next/link";

// ---- Design Tokens (matches the rest of OSHunt — account page, navbar, etc.) ----
const c = {
  bg: "#090909",
  border: "rgba(255,255,255,0.08)",
  text: "#efefef",
  textDim: "#8c8c8c",
  textFaint: "#5e5e5e",
  lime: "#a8ff3e",
};

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 21s-7.5-4.6-10.2-9.3C0.2 8.7 1.6 5 5.2 4.1c2-.5 4 .3 5.1 2 .9-1.7 2.9-2.5 4.9-2 3.6.9 5 4.6 3.4 7.6C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Hunt Issues", href: "/hunt" },
      { label: "About", href: "/about" },
      { label: "Progress", href: "/progress" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Features", href: "/features" },
      { label: "FAQ", href: "/faq" },
      { label: "Support", href: "/support" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund" },
      // { label: "Refund Policy", href: "/refund" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Log in", href: "/login" },
      { label: "How It Works", href: "/howitwork" },
      { label: "See pricing", href: "/pricing" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="oshunt-footer">
      <style>{`
        .oshunt-footer * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }

        .oshunt-footer {
          background: ${c.bg};
          padding: 4rem 2rem 2rem;
        }

        .footer-container { max-width: 1100px; margin: 0 auto; }

        .footer-top {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 3rem;
          margin-bottom: 3rem;
        }

        /* brand block */
        .brand-block { max-width: 300px; }

        .brand-logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .brand-logo-row img { display: block; width: 36px; height: 36px; }

        .brand-name { font-size: 20px; font-weight: 700; color: ${c.text}; letter-spacing: -0.3px; }

        .brand-desc { font-size: 14px; color: ${c.textDim}; line-height: 1.6; margin-bottom: 20px; }

        .social-row { display: flex; gap: 10px; }

        .social-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid ${c.border}; background: rgba(255,255,255,0.02);
          display: flex; align-items: center; justify-content: center;
          color: ${c.textDim}; transition: all .15s ease;
        }
        .social-btn:hover { border-color: ${c.lime}; color: ${c.lime}; }
        .social-icon {
          width: 16px; height: 16px;
          object-fit: contain;
          filter: brightness(0) invert(1);
          transition: filter .15s ease;
        }
        .social-btn:hover .social-icon {
          filter: brightness(0) saturate(100%) invert(72%) sepia(84%) saturate(741%) hue-rotate(48deg) brightness(107%) contrast(103%);
        }

        /* link columns */
        .links-grid { display: flex; flex-wrap: wrap; gap: 3rem; }

        .link-column { display: flex; flex-direction: column; min-width: 130px; }

        .column-title { font-size: 14px; font-weight: 600; color: ${c.text}; margin-bottom: 16px; }

        .link-column a {
          font-size: 14px; color: ${c.textDim}; text-decoration: none;
          margin-bottom: 12px; transition: color .15s ease;
        }
        .link-column a:hover { color: ${c.lime}; }
        .link-column a:last-child { margin-bottom: 0; }

        /* bottom bar */
        .footer-divider { border-top: 1px solid ${c.border}; margin-bottom: 1.5rem; }

        .footer-bottom {
          display: flex; flex-wrap: wrap; justify-content: space-between;
          gap: 0.75rem; font-size: 13px; color: ${c.textFaint};
        }

        .footer-credit { display: inline-flex; align-items: center; gap: 5px; }
        .footer-credit svg { color: ${c.lime}; }

        @media (max-width: 700px) {
          .footer-top { flex-direction: column; }
          .links-grid { gap: 2rem 3rem; }
        }
      `}</style>

      <div className="footer-container">
        <div className="footer-top">
          {/* brand */}
          <div className="brand-block">
            <div className="brand-logo-row">
              <Image src="/white.png" alt="OSHunt logo" width={45} height={45} />
              <span className="brand-name">OSHunt</span>
            </div>
            <p className="brand-desc">
              AI that matches you with open source issues worth solving — spend less time hunting, more time shipping.
            </p>
            <div className="social-row">
              <a href="https://x.com/AyushdevX" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="X (Twitter)">
                <Image src="/X.svg" alt="" width={16} height={16} className="social-icon" />
              </a>
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="GitHub">
                <Image src="/github.svg" alt="" width={16} height={16} className="social-icon" />
              </a>
            </div>
          </div>

          {/* link columns */}
          <div className="links-grid">
            {COLUMNS.map((col) => (
              <div className="link-column" key={col.title}>
                <span className="column-title">{col.title}</span>
                {col.links.map((link) => (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} OSHunt. All rights reserved.</span>
          <span className="footer-credit">
            Built with <HeartIcon /> by Ayush for open source contributors
          </span>
        </div>
      </div>
    </footer>
  );
}