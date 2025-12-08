import { cn } from "@/lib/utils";
import Image from "next/image";

interface MyLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export function ClipizyLogo({ className, style }: MyLogoProps) {
  const mergedStyle: React.CSSProperties = {
    aspectRatio: "1 / 1",
    objectFit: "contain",
    ...style,
  };

  return (
    <Image
      src="/logo.svg"
      alt="Clipizy Logo"
      width={256}
      height={256}
      className={cn("w-12 h-12 aspect-square object-contain", className)}
      style={mergedStyle}
      priority
    />
  );
}