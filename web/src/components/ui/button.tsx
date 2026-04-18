import type { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "danger" }) {
  const { variant = "default", className = "", ...rest } = props;
  return <button className={`btn btn-${variant} ${className}`} {...rest} />;
}
