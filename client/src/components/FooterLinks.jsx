import { Github, Linkedin } from 'lucide-react';

export default function FooterLinks({ className = '' }) {
  return (
    <footer className={`flex flex-col items-center justify-center gap-3 py-5 ${className}`}>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/az4mm"
          target="_blank"
          rel="noreferrer"
          className="neu-button p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          title="View on GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
        <a
          href="https://linkedin.com/in/azamhu"
          target="_blank"
          rel="noreferrer"
          className="neu-button p-2.5 rounded-xl text-muted-foreground hover:text-[#0a66c2] transition-colors"
          title="Connect on LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground/60 tracking-wide font-medium">
        [ Evenly v1.0 • Built by Azam ] • © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
