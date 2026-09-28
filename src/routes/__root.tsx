import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import { PulumiLogo } from '@/components/PulumiLogo'
import { StaticThemeToggle, ThemeToggle } from '@/components/ThemeToggle'
import { isStaticDocs } from '@/lib/static-docs'
import appCss from '../styles.css?url'

// Runs before hydration so an explicit theme choice applies before first
// paint (no flash of the wrong theme). Absent (system default) is a no-op —
// styles.css's prefers-color-scheme rules already handle that case.
const themeInitScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Pulumi Package Docs',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: 'https://brand.pulumi.com/media/images/logos/icon-rounded-64w.png',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link to="/" className="site-brand">
              <PulumiLogo height={22} />
              <span className="site-brand-divider" aria-hidden="true" />
              <span className="site-brand-name">Package Docs</span>
            </Link>
            {isStaticDocs ? <StaticThemeToggle /> : <ThemeToggle />}
          </div>
        </header>
        {children}

        {/* A static build has no server to call back into, so it ships
            without the hydration script and navigates as plain links. */}
        {isStaticDocs ? null : <Scripts />}
      </body>
    </html>
  )
}
