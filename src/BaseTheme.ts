import Color from "colorjs.io"
import colors from "tailwindcss/colors.js"

import { ControlVar } from "./ControlVar.js"
import { InterpolatedVars } from "./InterpolatedVars.js"
import { Theme } from "./Theme.js"
import type { InterpolatedVarsOptions, Interpolator } from "./types.js"
import * as Units from "./Units.js"
import { tailwindColorKeyNamer } from "./utils.js"

// sometimes convertions return null for a value because of conversions/color spaces
// thing is, I'm getting nulls when just doing ranges that should not return null (e.g. colors.neutral does this)
// not 100% why, but the correct colors are just null => 0, so that's why this function
function unsafeColorToOklch(color: Color): Units.Lch {
	const c = color.oklch
	return { l: c.l ?? 0, c: c.c ?? 0, h: c.h ?? 0 }
}
export const createColorJsIoInterpolator = (space?: string): Interpolator<ControlVar<any, Units.Lch>> => ({ percent, state, start, end }) => {
	const key = start.css + end.css
	// re/create state if at start or if key switched (due to multiple gradient points)
	if (state.key !== key) {
		const c1 = new Color(start.css)
		const c2 = new Color(end.css)
		state.range = c1.range(c2, { space })
		state.key = key
	}

	const mixed: Color = state.range(percent)
	return unsafeColorToOklch(mixed)
}

const colorJsInterpolator = createColorJsIoInterpolator()


export const spacing = new ControlVar(Units.rem, {	_: 0.25 })

export const tailwindColorOpts: Partial<InterpolatedVarsOptions<ControlVar<any, any>>> = {
	interpolator: colorJsInterpolator,
	keyName: tailwindColorKeyNamer,
	steps: 11,
}
export const createTailwindColor = (name: string, stops: (string)[], opts: Partial<InterpolatedVarsOptions> = {}): InterpolatedVars<Units.Lch> => {
	const controls = []
	for (const rawStop of stops) {
		const stop = new Color(rawStop)
		const control = new ControlVar<Units.Lch>(Units.oklch, unsafeColorToOklch(stop))
		controls.push(control)
	}
	return new InterpolatedVars(name, Units.oklch, controls as any, undefined, { ...tailwindColorOpts, ...opts })
}

// for now just copies the tailwind colors
export const bg = createTailwindColor("color-neutral", [
	...Object.values(colors.neutral),
])

export const ok = createTailwindColor("color-ok", [
	...Object.values(colors.green),
])

export const warning = createTailwindColor("color-warning", [
	...Object.values(colors.yellow),
])

export const danger = createTailwindColor("color-danger", [
	...Object.values(colors.red),
])
export const accent = createTailwindColor("color-accent", [
	...Object.values(colors.blue),
])

export const background = new ControlVar<Units.Lch>(Units.oklch, unsafeColorToOklch(new Color("rgb(99% 99% 99%)")))

export const foreground = new ControlVar<Units.Lch>(Units.oklch, unsafeColorToOklch(new Color("rgb(1% 1% 1%)")))

export const baseTheme = new Theme({
	"number-spacing": spacing,
	bg,
	"color-bg": background,
	"color-fg": foreground,
	ok,
	warning,
	danger,
	accent,
})
