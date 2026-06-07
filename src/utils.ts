import { keys } from "@alanscodelog/utils/keys"

import type { ControlVar } from "./ControlVar.js"
import type { InterpolatedVarsOptions, InterpolatorOptions, KeyNamer } from "./types.js"

/**
 *
 * The default key naming function.
 *
 * Names keys like `foo-0`, `foo-1`, etc.
 */
export const defaultKeyNamer: InterpolatedVarsOptions<any>["keyName"] = ({ i, name }) => `${name}-${i}`

/** See {@link defaultKeyNamer} */
export const padNum = (num: number, limit: number, steps: number): string => {
	const n = (num / steps) * limit
	const rounded = Math.floor(n)
	return rounded.toString().padEnd(limit.toString().length - 1, "0")
}
/**
 *
 * A padded key naming function.
 *
 * Names keys like `foo-000`, `foo-100`, etc.
 *
 * Note the number depends on the limit and the number of steps passed. The number is rounded to the nearest integer.
 *
 * e.g. 10 steps with a limit of 1000: [foo-000, foo-100, ... foo-900]
 *
 * Note that the last key will be foo-900 NOT foo-1000.
 *
 * To make it end at foo-1000 use `paddedKeyNamer((stepCount + 1) * desiredPadAmount)`.
 *
 */

export const paddedKeyNamer = (keyLimit: number = 1000): InterpolatedVarsOptions<any>["keyName"] => ({ totalSteps, i, name }) => {
	const start = `${name}-`
	return `${start}${padNum(i, keyLimit, totalSteps)}`
}
/**
 * Similar to {@link paddedKeyNamer} but just multiplies the step by the given pad amount.
 */
export const paddedByStepKeyNamer = (stepPadAmount: number = 100): InterpolatedVarsOptions<any>["keyName"] => ({ i, name }) => {
	const num = i * stepPadAmount
	const roundedString = Math.floor(num)
	const start = `${name}-`
	return `${start}${roundedString}`.padEnd(start.length + 3, "0")
}

export const tailwindColorKeyNamer: KeyNamer = ({ i, name, separator }) => `${name}${separator}${["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"][i]}`

/**
 * Creates an array from a ratio.
 */
export const createArrayfromRatio = ({ ratio, length }: { ratio: number, length: 10 }): number[] => {
	const res: number[] = [...Array(length)].reduce((arr: number[], _, i) => {
		arr.push(arr[i] * ratio)
		return arr
	}, [1])
	return res
}


/**
 * If passed a number, rounds it, otherwise returns it.
 */
export const roundIfNeeded = (roundTo: number | false, num: number | any): typeof num => {
	if (typeof num === "number") {
		if (roundTo !== false && roundTo > -1) {
			return (+num.toFixed(roundTo))
		}
		return num
	}
	return num
}


/**
 * Multiplies each step by the start value.
 *
 * For example:
 *
 * ```ts
 * const spacingControl = new ControlVar(Unit.rem, 1)
 * const spacing = new InterpolatedVars("spacing", Unit.rem, [spacingControl], {
 * 	steps: 4,
 * 	interpolator: createNumericalInterpolator(scaleValue),
 * })
 * // spacing values are now [0rem, 1rem, 2rem, 3rem]
 * spacingControl.set(2)
 * // scales to [0rem, 2rem, 4rem, 6rem]
 * ```
 */
export const scaleValue: NumericalInterpolator = ({ start, step }) => step * start

/** Lerps between the start and end values. */
export const lerpValue: NumericalInterpolator = ({ start, end, percent }) => start + ((end - start) * percent)
export type NumericalInterpolator = (opts: Omit<InterpolatorOptions<ControlVar<any, any>>, "start" | "end"> & { start: number, end: number }) => number

/**
 * A utility function for creating a numerical interpolators.
 *
 * It iterates through the keys of the start and end values, and passes those as the start and end values to the interpolator given ({@link lerpValue} by default).
 */
export const createNumericalInterpolator = (interpolator: NumericalInterpolator = lerpValue) => (opts: InterpolatorOptions<ControlVar<any, any>>): Record<string, number> => {
	const { start, end, exclude, roundTo } = opts
	const val: Record<string, any> = {}
	for (const key of Object.keys(start.value)) {
		if (exclude.includes(key as any)) {
			val[key] = start.value[key]
			continue
		}
		val[key] = start.value[key]
		const startValue = start.value[key]
		const endValue = end.value[key]
		if (typeof startValue === "number" && typeof endValue === "number") {
			const interpolated = interpolator({ ...opts, start: startValue, end: endValue })
			if (typeof interpolated === "number" && isNaN(interpolated)) {
				throw new Error(`Interpolation for key ${key} from ${startValue} to ${endValue} resulted in ${interpolated}.`)
			}
			val[key as any] = roundIfNeeded(roundTo, interpolated)
		}
	}
	return val
}

/** The default interpolator. */
export const lerp = createNumericalInterpolator()

/** Helper to create a modified object with some change applied to it's keys. */
export const modifiyKeys = (modify: (key: string) => string, obj: Record<string, string>): Record<string, string> => {
	const res: Record<string, string> = {}
	for (const key of keys(obj)) {
		res[modify(key)] = obj[key]
	}
	return res
}

/**
 * Converts the css object returned by {@link Theme} to a string.
 *
 * Can be used to, for example, set the inner html of a style element directly.
 *
 * ```ts
 * styleEl.innerHTML = `:root{\n${cssObjectToString(baseTheme.css)}\n}`
 * ```
 */
export const cssObjectToString = (obj: Record<string, string>): string => Object.entries(obj)
	.map(([key, value]) => `${key}: ${value};`)
	.join("")

/**
 * Replaces invalid css variable name characters.
 */
export const escapeKey = (key: string, sep: string): string => key.replace(/[^a-zA-Z0-9_-]/g, sep)
