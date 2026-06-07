import Color from "colorjs.io"
import { describe, it } from "vitest"

import { ControlVar } from "../src/ControlVar.js"
import { Units } from "../src/index.js"
import { InterpolatedVars } from "../src/InterpolatedVars.js"
import { Theme } from "../src/Theme.js"
import { paddedKeyNamer } from "../src/utils.js"


it("works", () => {
	const paddingMin = new ControlVar(Units.px, 0)
	const paddingMax = new ControlVar(Units.px, 200)


	const padding = new InterpolatedVars("padding",
		Units.px,
		[paddingMin, paddingMax],
		/* { steps: 10 } i.e. 0-9 */
	)

	const white = new ControlVar(Units.rgb, { r: 255, g: 255, b: 255 })
	const black = new ControlVar(Units.rgb, { r: 0, g: 0, b: 0 })

	const grays = new InterpolatedVars("gray", Units.rgb, [white, black], undefined, {
		steps: 4,
		keyName: paddedKeyNamer(1000), // gray-000
	})

	const lightRed = new ControlVar(Units.rgb, { r: 255, g: 0, b: 0 })
	const saturatedMiddleRed = new ControlVar(Units.rgb, { r: 255, g: 170, b: 170 })
	const darkRed = new ControlVar(Units.rgb, { r: 50, g: 0, b: 0 })

	// interpolated along multiple values
	const red = new InterpolatedVars("red", Units.rgb, [
		lightRed,
		saturatedMiddleRed,
		darkRed,
	])

	// with custom stops
	const reds = new InterpolatedVars("red", Units.rgb, [
		lightRed,
		saturatedMiddleRed,
		darkRed,
	], [0, 0.25, 0.75])


	const theme = new Theme({
		grays,
		padding,
	})

	// theme.css
	// :root {
	// 	--gray-000: rgb(255 255 255);
	// 	--gray-250: rgb(204 204 204);
	// 	--gray-500: rgb(51 51 51);
	// 	--gray-750: rgb(0 0 0);
	// 	--padding-0: 0px;
	// 	...
	// 	--padding-9: 200px;
	// }

	// change a control variable
	white.set({ r: 200, g: 200, b: 200 })

	// all variables that depend on it update
	// theme.css
	// :root {
	//		--gray-000: rgb(200 200 200);
	//		...
	//		--gray-750: rgb(0 0 0);
	// }

	// attach or detach a theme from an element
	// if none given attaches to document.documentElement
	// attaching will set the css variables on the element and keep them updated
	theme.attach(/* el */)
	theme.detach(/* el */)

	// add/remove variables
	theme.add({ reds })
	theme.add({ lightRed })
	theme.remove("lightRed")

	// ADVANCED

	// custom unit creation
	// the function argument is used as the unit definition
	const fancyRem = Units.createSimpleUnit("fancy-rem") // same as  ({ _ }: { _: number }) => `${_}fancy-rem`
	const fancyUnit = (
		{ some, fancy, unit }:
		{ some: number, fancy: "string", unit: boolean }
	) => `${some}px ${fancy} ${unit}`

	// so long as the control vars take the same arguments
	// you can use unit functions as custom formatters:
	const customRgbFormatter = ({ r, g, b, a = 0 }: Units.Rgb) => `R:${r} G:${g} B:${b} ${a ? `A:${a}` : ""}`
	const grays3 = new InterpolatedVars("gray", customRgbFormatter, [white, black])

	// custom interpolation, for example, using colorjs.io

	// import Color from "colorjs.io"

	const grays4 = new InterpolatedVars("gray", Units.rgb, [white, black], undefined, {
		interpolator: ({ percent, state, start, end }) => {
			const key = start.css + end.css
			// re/create state if at start or if key switched (due to
			// multiple stops)
			if (state.key !== key) {
				state.range = new Color(start.css).range(new Color(end.css), { space: "srgb" })
				state.key = key
			}

			const val = state.range(percent).coords
			return { r: val[0] * 255, g: val[1] * 255, b: val[0] * 255 }
		},
	})
})
