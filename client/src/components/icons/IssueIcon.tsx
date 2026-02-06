import IconBase from "./IconBase";

export default function IssueIcon({ size, className, title, fill }: { size?: number; className?: string; title?: string; fill?: string }) {
  return (
    <IconBase size={size} className={className} title={title || "bug_report"} fill={fill}>
      <path d="M20 8h-3.81a5.002 5.002 0 00-9.38 0H4v2h2.09c.17.72.46 1.39.86 2H4v2h4v6h8v-6h4v-2h-3.57c.4-.61.69-1.28.86-2H20V8zM12 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
    </IconBase>
  );
}
