import { useEffect, useState } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'

const OPTIONS: {
  mode: ThemeMode
  label: string
  Icon: () => React.JSX.Element
}[] = [
  { mode: 'system', label: 'System', Icon: MonitorIcon },
  { mode: 'light', label: 'Light', Icon: SunIcon },
  { mode: 'dark', label: 'Dark', Icon: MoonIcon },
]

function applyTheme(mode: ThemeMode) {
  try {
    if (mode === 'system') {
      delete document.documentElement.dataset.theme
      localStorage.removeItem('theme')
    } else {
      document.documentElement.dataset.theme = mode
      localStorage.setItem('theme', mode)
    }
  } catch {
    // Storage can be unavailable (private browsing, locked-down environments);
    // the toggle still works for the current page load, it just won't persist.
    if (mode === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = mode
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system')

  useEffect(() => {
    // Deliberately deferred to an effect, not derived during render: the
    // server can't read localStorage, so matching its 'system' default here
    // keeps hydration's first client render consistent with the server's.
    try {
      const stored = localStorage.getItem('theme')
      // eslint-disable-next-line react/set-state-in-effect
      if (stored === 'light' || stored === 'dark') setMode(stored)
    } catch {
      // Ignore: falls back to the system-driven default already applied.
    }
  }, [])

  function choose(next: ThemeMode) {
    setMode(next)
    applyTheme(next)
  }

  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {OPTIONS.map(({ mode: optionMode, label, Icon }) => (
        <button
          key={optionMode}
          type="button"
          className="theme-switch-option"
          aria-pressed={mode === optionMode}
          onClick={() => choose(optionMode)}
          aria-label={label}
        >
          <Icon />
        </button>
      ))}
    </div>
  )
}

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function SunIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </IconSvg>
  )
}

function MoonIcon() {
  return (
    <IconSvg>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </IconSvg>
  )
}

function MonitorIcon() {
  return (
    <IconSvg>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </IconSvg>
  )
}

// Wires the static build's theme switch up without hydration: one delegated
// click listener, using the same `data-theme` + localStorage contract as
// ThemeToggle above (and as the pre-hydration script in `__root.tsx`).
const staticThemeScript = `(function(){var g=document.currentScript.previousElementSibling;if(!g)return;
function apply(m){try{if(m==='system'){delete document.documentElement.dataset.theme;localStorage.removeItem('theme')}else{document.documentElement.dataset.theme=m;localStorage.setItem('theme',m)}}catch(e){if(m==='system'){delete document.documentElement.dataset.theme}else{document.documentElement.dataset.theme=m}}sync(m)}
function sync(m){var b=g.querySelectorAll('button[data-theme-mode]');for(var i=0;i<b.length;i++){b[i].setAttribute('aria-pressed',String(b[i].getAttribute('data-theme-mode')===m))}}
g.addEventListener('click',function(e){var b=e.target.closest('button[data-theme-mode]');if(b){apply(b.getAttribute('data-theme-mode'))}});
var s=null;try{s=localStorage.getItem('theme')}catch(e){}
sync(s==='light'||s==='dark'?s:'system')})()`

/**
 * The theme switch for the static build. Same markup as `ThemeToggle`, but
 * driven by an inline script rather than React, since static pages ship
 * without the hydration bundle.
 */
export function StaticThemeToggle() {
  return (
    <>
      <div className="theme-switch" role="group" aria-label="Theme">
        {OPTIONS.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            className="theme-switch-option"
            data-theme-mode={mode}
            aria-pressed={mode === 'system'}
            aria-label={label}
          >
            <Icon />
          </button>
        ))}
      </div>
      <script dangerouslySetInnerHTML={{ __html: staticThemeScript }} />
    </>
  )
}
