// The development twin of jsx-runtime.ts.
import * as R from "react/jsx-dev-runtime";
import { translateProps } from "./translate";

export type { JSX } from "react/jsx-dev-runtime";
export const Fragment = R.Fragment;

type Args = Parameters<typeof R.jsxDEV>;

export function jsxDEV(type: Args[0], props: Args[1], ...rest: [Args[2], Args[3], Args[4], Args[5]]) {
  return R.jsxDEV(type, translateProps(type, props as Record<string, unknown>) as Args[1], ...rest);
}
