import { type CSSProperties, type ReactNode } from 'react';
import { CheckCircle2, GraduationCap, Lightbulb, MessageSquareText, Sparkles } from 'lucide-react';

// Spec §A.4 — Learn: real, static help copy. "How it works", prompt tips and
// plain-English example prompts. No fake data — it is genuine help content.
export function LearnScreen() {
  return (
    <div style={wrapperStyle} data-testid="learn-screen">
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div style={heroIconStyle}>
            <GraduationCap size={22} />
          </div>
          <h1 style={headingStyle}>Learn</h1>
          <p style={subtextStyle}>
            CRON builds apps from plain English. Here&apos;s how it works and how to get
            the best results.
          </p>
        </section>

        <Section icon={<CheckCircle2 size={15} />} title="How it works">
          <ol style={stepsStyle}>
            <li><strong>Tell CRON what you want</strong> — describe the app in plain English.</li>
            <li><strong>CRON plans it</strong> — it works out the steps and shows you the plan.</li>
            <li><strong>CRON builds it</strong> — the app is created in the background.</li>
            <li><strong>CRON shows you</strong> — you see the result as it takes shape.</li>
            <li><strong>You approve</strong> — you decide what happens next, and you can ask for changes any time.</li>
          </ol>
        </Section>

        <Section icon={<Lightbulb size={15} />} title="Prompt tips">
          <ul style={tipsStyle}>
            <li><strong>Be specific</strong> — the more detail you give, the closer the result is to what you want.</li>
            <li><strong>List the features</strong> — mention the screens and things the app should do.</li>
            <li><strong>Describe who it&apos;s for</strong> — tell CRON who will use it so the app fits them.</li>
          </ul>
        </Section>

        <Section icon={<MessageSquareText size={15} />} title="Example prompts">
          <div style={examplesStyle}>
            <div style={exampleStyle}>
              <Sparkles size={12} style={{ color: '#7fb0ff', flexShrink: 0 }} />
              <span>“A task dashboard for my team with due dates, priority labels and a progress bar.”</span>
            </div>
            <div style={exampleStyle}>
              <Sparkles size={12} style={{ color: '#7fb0ff', flexShrink: 0 }} />
              <span>“An invoicing app for my cleaning business that tracks customers, invoices and payments.”</span>
            </div>
            <div style={exampleStyle}>
              <Sparkles size={12} style={{ color: '#7fb0ff', flexShrink: 0 }} />
              <span>“A simple portfolio site to show off my work, with a contact page.”</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>
        <span style={sectionIconStyle}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const wrapperStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  background: 'linear-gradient(to right, rgba(3, 12, 28, 0.40), rgba(3, 12, 28, 0.10) 58%, rgba(3, 12, 28, 0.02))',
  fontFamily: 'var(--cron-font-family)',
};

const containerStyle: CSSProperties = {
  maxWidth: 680,
  margin: '0 auto',
  padding: 'clamp(24px, 5vh, 48px) clamp(20px, 4vw, 48px) 40px',
  display: 'flex',
  flexDirection: 'column',
  gap: 26,
  boxSizing: 'border-box',
};

const heroStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };

const heroIconStyle: CSSProperties = {
  width: 40,
  height: 40,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 11,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.25)',
  color: '#7fb0ff',
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 300,
  color: '#eaf2ff',
  letterSpacing: 0.4,
};

const subtextStyle: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: '#8da4c7',
  lineHeight: 1.6,
  maxWidth: 520,
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 16,
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 12,
  background: 'rgba(11, 22, 40, 0.72)',
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#86ade8',
};

const sectionIconStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 6,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.22)',
  color: '#7fb0ff',
};

const stepsStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  color: '#b7cdf0',
  fontSize: 12.5,
  lineHeight: 1.55,
};

const tipsStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  color: '#b7cdf0',
  fontSize: 12.5,
  lineHeight: 1.55,
};

const examplesStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };

const exampleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '9px 11px',
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 9,
  background: 'rgba(9, 18, 34, 0.6)',
  color: '#c6d8f7',
  fontSize: 12.5,
  lineHeight: 1.5,
};
