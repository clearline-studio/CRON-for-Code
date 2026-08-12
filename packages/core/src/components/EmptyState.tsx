import { FolderOpen, Shield, Cpu, Plus, ArrowRight } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { useWorkspaceStore, useWorkspaceStoreRaw } from '../context.js';
import { visibleProjects } from '../store.js';

interface EmptyStateProps {
  onSelectProject: () => void;
}

// Entry / project-selection screen. Launch lands here; the working canvas appears
// only after the user explicitly opens (folder picker) or resumes a project.
// Balanced composition: the welcome card is centred in the usable canvas with a
// right-side art panel that counterbalances it (art drops away on narrow
// windows so the content never hugs the far left or clips).
export function EmptyState({ onSelectProject }: EmptyStateProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const raw = useWorkspaceStoreRaw();
  const [narrow, setNarrow] = useState(false);
  const logoStyle = getComputedStyle(document.documentElement).getPropertyValue('--cron-logo-url').trim();
  const hasLogo = logoStyle && logoStyle !== 'none';
  const resumeProjects = visibleProjects(projects).filter((p) => p.availability === 'available');

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 900px)');
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return (
    <div style={wrapperStyle}>
      <div style={contentZoneStyle}>
        <div style={cardStyle}>
          {hasLogo ? (
            <img
              src={logoStyle.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')}
              alt="CRON for Code"
              style={logoStyleProp}
            />
          ) : (
            <FolderOpen size={52} opacity={0.35} color="#5f7392" />
          )}
          <div style={headingStyle}>CRON for Code</div>
          <div style={subtitleStyle}>Plan with Gemma. Build with the coding agent. You stay in charge.</div>
          <div style={descStyle}>
            Open or resume a local project to plan, execute, verify, and release code changes with governance built in.
          </div>
          <div style={actionsStyle}>
            <button onClick={onSelectProject} style={ctaStyle}>
              <Plus size={17} /> Open Project
            </button>
          </div>
          {resumeProjects.length > 0 && (
            <div style={resumeSectionStyle}>
              <div style={resumeTitleStyle}>Resume a project</div>
              {resumeProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  style={resumeCardStyle}
                  onClick={() => void raw.getState().selectProject(project.id)}
                >
                  <span style={resumeNameStyle}>{project.name}</span>
                  <span style={resumePathStyle}>{project.rootPath}</span>
                  <ArrowRight size={15} style={resumeArrowStyle} />
                </button>
              ))}
            </div>
          )}
          <div style={chipsStyle}>
            <div style={chipStyle}>
              <Cpu size={10} />
              <span>Planner: Gemma</span>
            </div>
            <div style={{ ...chipStyle, borderColor: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8' }}>
              <Shield size={10} />
              <span>Executor: OpenCode</span>
            </div>
            <div style={{ ...chipStyle, borderColor: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }}>
              <Shield size={10} />
              <span>Release Gate: Locked</span>
            </div>
          </div>
        </div>
      </div>
      {!narrow && (
        <div style={artZoneStyle} aria-hidden="true">
          <div style={artGlowStyle} />
        </div>
      )}
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  height: '100%',
  fontFamily: 'var(--cron-font-family)',
  position: 'relative',
  zIndex: 1,
  overflow: 'auto',
  background: 'linear-gradient(to right, rgba(3, 12, 28, 0.40), rgba(3, 12, 28, 0.10) 58%, rgba(3, 12, 28, 0.02))',
};

const contentZoneStyle: CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'max(32px, env(safe-area-inset-top)) clamp(20px, 4vw, 56px)',
  boxSizing: 'border-box',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  maxWidth: 560,
  width: '100%',
  textAlign: 'left',
  gap: 'var(--cron-space-md)',
  background: 'rgba(11, 22, 40, 0.42)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 14,
  padding: '34px 40px',
  boxShadow: '0 24px 70px rgba(0, 0, 0, 0.34)',
};

const artZoneStyle: CSSProperties = {
  flex: '0 1 clamp(240px, 34vw, 460px)',
  minWidth: 0,
  position: 'relative',
  backgroundImage: 'var(--cron-shell-bg-image)',
  backgroundSize: 'cover',
  backgroundPosition: 'center 18%',
  maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0))',
  WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0))',
};

const artGlowStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse at 30% 45%, rgba(59, 130, 246, 0.10), transparent 62%)',
};

const logoStyleProp: CSSProperties = {
  width: 176,
  height: 'auto',
  opacity: 0.9,
  marginBottom: 4,
};

const headingStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 300,
  color: '#eaf2ff',
  letterSpacing: 0.5,
};

const subtitleStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-lg)',
  color: '#8da4c7',
  fontWeight: 400,
  marginTop: -8,
  maxWidth: 420,
  lineHeight: 1.45,
};

const descStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-md)',
  color: 'var(--cron-panel-text-muted)',
  lineHeight: 'var(--cron-line-height)',
  maxWidth: 430,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 4,
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '10px 28px',
  background: 'var(--cron-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 7,
  cursor: 'pointer',
  fontSize: 'var(--cron-font-size-md)',
  fontFamily: 'var(--cron-font-family)',
  fontWeight: 500,
};

const resumeSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  marginTop: 8,
  textAlign: 'left',
};

const resumeTitleStyle: CSSProperties = {
  fontSize: 'var(--cron-font-size-xs)',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  color: '#5f7392',
  fontFamily: 'var(--cron-font-family)',
};

const resumeCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(13, 26, 48, 0.72)',
  border: '1px solid var(--cron-panel-border)',
  borderRadius: 8,
  cursor: 'pointer',
  color: '#eaf2ff',
  fontFamily: 'var(--cron-font-family)',
};

const resumeNameStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 'var(--cron-font-size-md)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const resumePathStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 'var(--cron-font-size-xs)',
  color: '#5f7392',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const resumeArrowStyle: CSSProperties = {
  flexShrink: 0,
  color: '#60a5fa',
};

const chipsStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 6,
  flexWrap: 'wrap' as const,
  justifyContent: 'flex-start',
};

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 10px',
  borderRadius: 12,
  border: '1px solid rgba(95, 115, 146, 0.25)',
  fontSize: 'var(--cron-font-size-xs)',
  color: '#5f7392',
  fontFamily: 'var(--cron-font-family)',
};
