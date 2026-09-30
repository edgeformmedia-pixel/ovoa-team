// React's JSX runtime, with the text translated (translate.ts). vite.config.ts
// and tsconfig.json point JSX at this through jsxImportSource.
import * as R from "react/jsx-runtime";
import { translateProps } from "./translate";

export type { JSX } from "react/jsx-runtime";
export const Fragment = R.Fragment;

type Props = Parameters<typeof R.jsx>[1];

export function jsx(type: Parameters<typeof R.jsx>[0], props: Props, key?: Parameters<typeof R.jsx>[2]) {
  return R.jsx(type, translateProps(type, props as Record<string, unknown>) as Props, key);
}

export function jsxs(type: Parameters<typeof R.jsxs>[0], props: Props, key?: Parameters<typeof R.jsxs>[2]) {
  return R.jsxs(type, translateProps(type, props as Record<string, unknown>) as Props, key);
}
