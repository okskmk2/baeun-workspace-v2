import IconBase from "./IconBase";

export default function HomeIcon({ size, className, title, fill }: { size?: number; className?: string; title?: string; fill?: string }) {
  return (
    <IconBase size={size} className={className} title={title || "home"} fill={fill}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </IconBase>
  );
}
