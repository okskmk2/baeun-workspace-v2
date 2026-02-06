import IconBase from "./IconBase";

export default function BoardIcon({ size, className, title, fill }: { size?: number; className?: string; title?: string; fill?: string }) {
  return (
    <IconBase size={size} className={className} title={title || "view_list"} fill={fill}>
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z" />
    </IconBase>
  );
}
