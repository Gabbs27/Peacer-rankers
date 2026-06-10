"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/guides", label: "Guías" },
  { href: "/planner", label: "Planner" },
  { href: "/compare", label: "Comparar" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative text-sm transition-colors focus-ring rounded px-1 py-0.5 ${
              active
                ? "text-[#f0e6d2]"
                : "text-gray-300 hover:text-[#e3c98a]"
            }`}
          >
            {label}
            {active && (
              <span
                aria-hidden
                className="absolute -bottom-[1.05rem] left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent"
              />
            )}
          </Link>
        );
      })}
    </>
  );
}
