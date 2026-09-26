/**
 * True when the app is being built as a static site (`pulumi-package-docs
 * static`), for publishing to GitHub/GitLab Pages.
 *
 * A static build has no server behind it, so its pages can't call the server
 * functions in `@/lib/pulumi/api` on the client. Every page is prerendered
 * with its data already baked in and shipped without the hydration script:
 * links then behave as ordinary anchors and each page load is self-contained,
 * which also keeps a large provider's schema out of the pages that don't need
 * it.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so this folds away to a
 * constant in both builds.
 */
export const isStaticDocs = import.meta.env.VITE_STATIC_DOCS === 'true'
