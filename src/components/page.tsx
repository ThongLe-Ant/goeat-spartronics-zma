import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

/**
 * Scroll container for the active route. Each page manages its own internal
 * height/scroll (height:100%), so this just fills the remaining space and
 * re-keys on path change to replay the entrance animation.
 */
function Page() {
  const location = useLocation();
  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div key={location.pathname} className="ge-fade" style={{ height: "100%" }}>
        <Suspense>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

export default Page;
