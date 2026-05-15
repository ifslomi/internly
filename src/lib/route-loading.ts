type RouterLike = {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

export function startRouteLoading() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:route-loading-start'));
}

export function stopRouteLoading() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:route-loading-stop'));
}

export function navigateWithLoader(
  router: RouterLike,
  href: string,
  options?: { scroll?: boolean }
) {
  startRouteLoading();
  router.push(href, options);
}

export function replaceWithLoader(
  router: RouterLike,
  href: string,
  options?: { scroll?: boolean }
) {
  startRouteLoading();
  router.replace(href, options);
}
