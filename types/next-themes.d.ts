// Minimal declaration for next-themes so TypeScript won't error if the package isn't installed yet.
// You can remove this file after installing `next-themes` from npm.

declare module 'next-themes' {
  export type UseThemeReturn = {
    theme?: string | null
    setTheme: (theme: string) => void
    resolvedTheme?: string | null
    systemTheme?: string | null
  }

  export function useTheme(): UseThemeReturn
  export const ThemeProvider: (props: any) => JSX.Element
  export default ThemeProvider
}
