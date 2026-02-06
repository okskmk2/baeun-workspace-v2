import IconBase from "./IconBase";

export default function ProjectIcon({ size, className, title, fill }: { size?: number; className?: string; title?: string; fill?: string }) {
  return (
    <IconBase size={size} className={className} title={title || "folder"} fill={fill}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </IconBase>
  );
}
