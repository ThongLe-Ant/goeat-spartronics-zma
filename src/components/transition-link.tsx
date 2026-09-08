import { NavLink, NavLinkProps } from "react-router-dom";

export interface TransitionLinkProps extends NavLinkProps {}

/** Wrapper for view-transition enabled Links. */
export default function TransitionLink(props: TransitionLinkProps) {
  return <NavLink {...props} viewTransition />;
}
