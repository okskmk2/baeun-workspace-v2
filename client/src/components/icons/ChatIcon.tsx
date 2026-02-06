import IconBase from "./IconBase";

export default function ChatIcon({ size, className, title, fill }: { size?: number; className?: string; title?: string; fill?: string }) {
  return (
    <IconBase size={size} className={className} title={title || "chat_bubble"} fill={fill}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v14l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </IconBase>
  );
}
