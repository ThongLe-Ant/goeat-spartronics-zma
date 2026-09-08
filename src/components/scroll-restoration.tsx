import { useRouteHandle } from "@/hooks";
import { FC, useEffect } from "react";
import { useLocation } from "react-router-dom";

const scrollPositions: Record<string, number> = {};

function findElementWithScrollbar(rootElement: Element = document.body): Element | null {
  if (
    rootElement.scrollHeight > rootElement.clientHeight &&
    rootElement.computedStyleMap?.().get("overflow")?.toString() !== "hidden"
  ) {
    return rootElement;
  }
  for (let i = 0; i < rootElement.children.length; i++) {
    const found = findElementWithScrollbar(rootElement.children[i]);
    if (found) return found;
  }
  return null;
}

export const ScrollRestoration: FC = () => {
  const location = useLocation();
  const [handle] = useRouteHandle();

  useEffect(() => {
    const content = findElementWithScrollbar();
    if (content) {
      if (handle.scrollRestoration !== undefined) {
        content.scrollTo(0, handle.scrollRestoration);
      } else {
        const key = `${location.pathname}${location.search}`;
        if (scrollPositions[key]) content.scrollTo(0, scrollPositions[key]);
        const save = () => {
          scrollPositions[key] = content.scrollTop;
        };
        content.addEventListener("scroll", save);
        return () => content.removeEventListener("scroll", save);
      }
    }
    return () => {};
  }, [location]);

  return <></>;
};
