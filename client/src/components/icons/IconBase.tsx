type IconBaseProps = {
  size?: number;
  className?: string;
  title?: string;
  viewBox?: string;
  children?: any;
  fill?: string;
};

export default function IconBase({ size = 24, className, title, viewBox = "0 0 24 24", children, fill = "currentColor" }: IconBaseProps) {
  return (
    <svg
      class={className}
      width={size}
      height={size}
      viewBox={viewBox}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      fill={fill}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
