import { UIMatch, useMatches } from "react-router-dom";

export interface RouteHandle {
  title?: string;
  back?: boolean;
  noScroll?: boolean;
  /** which bottom-nav to show: 'emp' | 'admin' | undefined (hidden) */
  nav?: "emp" | "admin";
  scrollRestoration?: number;
}

export function useRouteHandle() {
  const matches = useMatches() as UIMatch<undefined, RouteHandle>[];
  const lastMatch = matches[matches.length - 1];
  return [lastMatch.handle ?? {}, lastMatch, matches] as const;
}
