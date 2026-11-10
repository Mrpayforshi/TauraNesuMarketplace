import type { SVGProps } from 'react';

/**
 * TauraNesu icon set.
 *
 * One consistent family: 24px grid, 1.5px monoline stroke, round caps and
 * joins, drawn in `currentColor` so colour is controlled from CSS.
 * All icons are decorative by default (aria-hidden) — pass `aria-label`
 * and `role="img"` if one ever needs to carry meaning on its own.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Buyer — a car key */
export function IconKey(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="m17 6 3 3" />
      <path d="m14.5 8.5 2 2" />
    </Icon>
  );
}

/** Seller — a banknote */
export function IconBanknote(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 12h.01" />
      <path d="M18 12h.01" />
    </Icon>
  );
}

/** Dealer — a storefront */
export function IconStorefront(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5 12.5V20h14v-7.5" />
      <path d="M10 20v-4.5h4V20" />
    </Icon>
  );
}

/** Verified dealers — shield with a check */
export function IconShieldCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8 7.5 9.5 4.4-1.5 7.5-5.1 7.5-9.5V6L12 3z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Icon>
  );
}

/** Active listings — a car */
export function IconCar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 17H4a1 1 0 0 1-1-1v-3.5l2.2-5A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.2L21 12.5V16a1 1 0 0 1-1 1h-1" />
      <path d="M3 12.5h18" />
      <path d="M9.5 17h5" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
    </Icon>
  );
}

/** Free to browse — a ticked circle */
export function IconCircleCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Icon>
  );
}

/** Forward arrow, replaces the "→" text glyph */
export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}
