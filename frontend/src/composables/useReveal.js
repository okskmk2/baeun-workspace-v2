import { onBeforeUnmount, onMounted } from "vue";

export function useReveal(el, { once = true, threshold = 0.2 } = {}) {
  let observer = null;

  onMounted(() => {
    const root = el.value;
    if (!root) return;

    const isRevealTarget =
      root.classList.contains("reveal") || root.classList.contains("reveal-up");
    const targets = isRevealTarget
      ? [root]
      : Array.from(root.querySelectorAll(".reveal, .reveal-up"));

    if (!targets.length) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      targets.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          if (once) observer?.unobserve(entry.target);
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((node) => observer?.observe(node));
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });
}
