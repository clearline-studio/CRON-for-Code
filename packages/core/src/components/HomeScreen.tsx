import { useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, Folder, Send } from 'lucide-react';
import { useWorkspaceStore } from '../context.js';
import { visibleProjects } from '../store.js';
import { STARTER_TEMPLATES } from '../starter-templates.js';
import { relativeTime } from '../time.js';

// Home dashboard (CODE BY PROMPT entry): hero prompt + real recent projects +
// honest starter-template ideas. It is the "no project selected" centre view
// and the Home tab view. Hero submit and template clicks run the existing
// New-Project (folder picker) flow — the plan/build pipeline is a later slice.
interface HomeScreenProps {
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
}

export function HomeScreen({ onNewProject, onSelectProject }: HomeScreenProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const [prompt, setPrompt] = useState('');

  const recent = visibleProjects(projects)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Keep the typed text local: carrying it into the new project is out of scope.
    onNewProject();
  }

  return (
    <div style={wrapperStyle} data-testid="home-screen">
      <div style={containerStyle}>
        <section style={heroStyle}>
          <h1 style={heroHeadingStyle}>What do you want to build?</h1>
          <p style={heroSubtextStyle}>
            Tell CRON what you want to make — it plans, builds, and shows you the result.
          </p>
          <form style={promptFormStyle} onSubmit={handleSubmit}>
            <div style={promptRowStyle}>
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe what you want to build..."
                aria-label="Describe what you want to build"
                style={promptInputStyle}
              />
              <button type="submit" style={buildButtonStyle} aria-label="Build" title="Build">
                <Send size={15} />
              </button>
            </div>
          </form>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Recent projects</h2>
          {recent.length === 0 ? (
            <div style={emptyHintStyle}>
              No projects yet — describe what you want to build above, or start from a template below.
            </div>
          ) : (
            <div style={recentGridStyle}>
              {recent.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  style={projectCardStyle}
                  data-testid={`home-project-${project.id}`}
                >
                  <span style={projectIconStyle}>
                    <Folder size={15} />
                  </span>
                  <span style={projectTextStyle}>
                    <span style={projectNameStyle}>{project.name}</span>
                    <span style={projectMetaStyle}>Updated {relativeTime(project.updatedAt)}</span>
                  </span>
                  <ArrowRight size={13} style={{ flexShrink: 0, color: '#5f7392' }} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Start from a template</h2>
          <div style={templateRowStyle}>
            {STARTER_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={onNewProject}
                  style={templateCardStyle}
                  data-testid={`home-template-${template.id}`}
                >
                  <span style={templateIconStyle}>
                    <Icon size={17} />
                  </span>
                  <span style={templateNameStyle}>{template.name}</span>
                  <span style={templateDescStyle}>{template.description}</span>
                </button>
              );
            })}
          </div>
          <p style={templateNoteStyle}>
            These are starter ideas — pick one and CRON will set up a new project for it.
          </p>
        </section>
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
  maxWidth: 720,
  margin: '0 auto',
  padding: 'clamp(24px, 5vh, 48px) clamp(20px, 4vw, 48px) 40px',
  display: 'flex',
  flexDirection: 'column',
  gap: 34,
  boxSizing: 'border-box',
};

const heroStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const heroHeadingStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 300,
  color: '#f5f9ff',
  letterSpacing: 0.4,
};

const heroSubtextStyle: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: '#8da4c7',
  lineHeight: 1.5,
  maxWidth: 520,
};

const promptFormStyle: CSSProperties = {
  marginTop: 8,
};

const promptRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 6px 6px 16px',
  border: '1px solid rgba(31,130,255,.45)',
  borderRadius: 12,
  background: 'rgba(9, 18, 34, 0.85)',
  boxShadow: '0 0 18px rgba(23,107,255,.14)',
};

const promptInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#f5f9ff',
  fontSize: 14,
  fontFamily: 'var(--cron-font-family)',
  padding: '8px 0',
};

const buildButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  border: 'none',
  borderRadius: 9,
  background: 'linear-gradient(to bottom, #1F82FF, #176BFF)',
  color: '#ffffff',
  cursor: 'pointer',
  boxShadow: '0 0 16px rgba(23,107,255,.4)',
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const sectionHeadingStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  color: '#5f7392',
};

const recentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: 9,
};

const projectCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '10px 11px',
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 10,
  background: 'rgba(11, 22, 40, 0.72)',
  color: '#d9e8ff',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  boxSizing: 'border-box',
};

const projectIconStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  borderRadius: 7,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.25)',
  color: '#7fb0ff',
};

const projectTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const projectNameStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: '#f5f9ff',
};

const projectMetaStyle: CSSProperties = {
  fontSize: 10,
  color: '#5f7392',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const emptyHintStyle: CSSProperties = {
  padding: '14px 16px',
  border: '1px dashed rgba(100,160,255,.22)',
  borderRadius: 10,
  color: '#8da4c7',
  fontSize: 12,
  lineHeight: 1.5,
};

const templateRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 9,
};

const templateCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 7,
  padding: '14px 14px 13px',
  border: '1px solid rgba(100,160,255,.16)',
  borderRadius: 10,
  background: 'rgba(11, 22, 40, 0.72)',
  color: '#d9e8ff',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--cron-font-family)',
  boxSizing: 'border-box',
};

const templateIconStyle: CSSProperties = {
  width: 30,
  height: 30,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 8,
  background: 'rgba(23, 107, 255, 0.12)',
  border: '1px solid rgba(31,130,255,.25)',
  color: '#7fb0ff',
};

const templateNameStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#f5f9ff',
};

const templateDescStyle: CSSProperties = {
  fontSize: 10.5,
  lineHeight: 1.45,
  color: '#5f7392',
};

const templateNoteStyle: CSSProperties = {
  margin: 0,
  fontSize: 10.5,
  color: '#5f7392',
  lineHeight: 1.5,
};
