### 🚧 WORK IN PROGRESS 🚧
[![Docs][docs-src]][docs-href]
[![Release][release-src]][release-href]
[![npm version][npm-version-src]][npm-version-href]
[![License][license-src]][license-href]


# [Docs](https://alanscodelog.github.io/metamorphosis)

Metamorphosis is a css variable management library that helps create and organize variables into easily configurable themes.

Establish a few control variables and easily create interpolated variables with multiple stops.

It can be used by itself or as a compliment to other css libraries (e.g. tailwind). It's also easy to integrate other interpolators such as colorsjs.io.

It's designed to allow management from the js side to allow for easy, consistent user theming in apps (though it can be used to statically generate css variables as well).

All variables are strongly typed with typescript.

# Usage

A quick example:

```ts
const paddingMin = new ControlVar(Units.px, 0)
const paddingMax = new ControlVar(Units.px, 200)


const padding = new InterpolatedVars("padding",
	Units.px,
	[paddingMin, paddingMax],
	/* { steps: 10 } i.e. 0-9 */
)

const white = new ControlVar(Units.rgb, { r: 255, g: 255, b: 255 })
const black = new ControlVar(Units.rgb, { r: 0, g: 0, b: 0 })

const grays = new InterpolatedVars("gray", Units.rgb, [white, black], undefined,
	{
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
// 	--gray-000: rgb(255 255 255);
// 	--gray-250: rgb(204 204 204);
// 	--gray-500: rgb(51 51 51);
// 	--gray-750: rgb(0 0 0);
// 	--padding-0: 0px;
// 	...
// 	--padding-9: 200px;

// change a control variable
white.set({ r: 200, g: 200, b: 200 })

// all variables that depend on it update
// theme.css
//		--gray-000: rgb(200 200 200);
//		...
//		--gray-750: rgb(0 0 0);

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

```

For an example of more advanced usage, see [the example base theme](https://github.com/AlansCodeLog/metamorphosis/blob/master/src/BaseTheme.ts).

The library has optional peer dependencies for tailwind and colorjs.io. colorjs.io is only needed if importing the base theme from `metamorphosis/BaseTheme`. And tailwind is only needed if importing from `metamorphosis/tailwind`.

## Tailwind V4 Config

You can call `themeAsTailwindCss` from `metamorphosis/tailwind.js` to convert a theme into a tailwind v4 theme. Just print the results and copy or save them to a css file as part of your build then import them into your config. This will ensure things look okay (at least with the default theme colors) until the js loads.

<!-- Badges -->
[docs-src]: https://github.com/alanscodelog/metamorphosis/actions/workflows/docs.yml/badge.svg
[docs-href]: https://github.com/alanscodelog/metamorphosis/actions/workflows/docs.yml
[release-src]: https://github.com/alanscodelog/metamorphosis/actions/workflows/release.yml/badge.svg
[release-href]: https://github.com/alanscodelog/metamorphosis/actions/workflows/release.yml
[npm-version-src]: https://img.shields.io/npm/v/metamorphosis/latest
[npm-version-href]: https://www.npmjs.com/package/metamorphosis/v/latest
[license-src]: https://img.shields.io/npm/l/metamorphosis.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/metamorphosis
