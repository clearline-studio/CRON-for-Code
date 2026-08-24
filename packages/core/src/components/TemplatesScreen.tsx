import { type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { STARTER_TEMPLATES } from '../starter-templates.js';

// Spec §A.1 — "Start from a template" library: 6 honest starter ideas in a 3x2
// grid. There is no template engine, so every card opens the existing
// New-Project flow (same as Home). Never implies a template is applied.
interface TemplatesScreenProps {
  onNewProject: () => void;
}

export function TemplatesScreen({ onNewProject }: TemplatesScreenProps) {
  return (
    <div style={wrapperStyle} data-testid="templates-screen">
      <div style={containerStyle}>
        <section style={heroStyle}>
          <h1 style={headingStyle}>Start from a template</h1>
          <p style={subtextStyle}>
            Pick a starter idea and CRON will set up a brand-new project for it.
          </p>
        </section>

        <div style={gridStyle}>
          {STARTER_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                onClick={onNewProject}
                style={cardStyle}
                data-testid={`template-card-${template.id}`}
              >
                <span style={iconStyle}>
                  <Icon size={18} />
                </span>
                <span style={nameStyle}>{template.name}</span>
                <span style={descStyle}>{template.description}</span>
                <span style={useStyle}>
                  Use template <ArrowRight size={11} />
                </span>
              </button>
            );
          })}
        </div>

        <p style={noteStyle}>
          These are starter ideas — CRON plans and builds the app from scratch when
          you pick one. They are not pre-made apps.
        </p>
      </div>
    </div>
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
  maxWidth: 760,
  margin: '0 auto',
  padding: 'clamp(24px, 5vh, 48px) clamp(20px, 4vw, 48px) 40px',
  display: 'flex',
  flexDirection: 'column',
  gap: 26,
  boxSizing: 'border-box',
};

const heroStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };

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
  lineHeight: 1.5,
  maxWidth: 520,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
  gap: 12,
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: '16px 16px 14px',
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 12,
  background: 'rgba(11, 22, 40, 0.72)',
  color: '#d9e8ff',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  boxSizing: 'border-box',
};

const iconStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 9,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.25)',
  color: '#7fb0ff',
};

const nameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#eaf2ff',
};

const descStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.5,
  color: '#5f7392',
};

const useStyle: CSSProperties = {
  marginTop: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 10.5,
  fontWeight: 700,
  color: '#7fb0ff',
  paddingTop: 6,
};

const noteStyle: CSSProperties = {
  margin: 0,
  fontSize: 10.5,
  color: '#5f7392',
  lineHeight: 1.5,
};
