import { isBlank } from "@alanscodelog/utils/isBlank"

import { Base } from "./Base.js"
import type { ControlVar } from "./ControlVar.js"
import { getTotalSteps } from "./internal.js"
import type { InterpolatedVarsOptions } from "./types.js"
import { defaultKeyNamer, lerp } from "./utils.js"


const getStepPercent = (percent: number, startPercent: number, endPercent: number): number => {
	// the percentage into the stop
	let stopPercent = (percent - startPercent)
	let stopPercentTotal = (endPercent - startPercent)
	// if the first stop percentage > 0, this still be < 0, clamp to 0%
	if (stopPercent < 0) stopPercent = 0
	// if the last stop percentage < 1
	// stopPercentageTotal will be 0 causing division by 0, clamp to 100%
	if (stopPercentTotal === 0) {
		stopPercent = 1
		stopPercentTotal = 1
	}

	return stopPercent / stopPercentTotal
}

/**
 * Creates a list of interpolated values from a given list of {@link ControlVar}s.
 *
 * ```ts
 *
 * const v1 = new ControlVar(Units.num, 0)
 * const v2 = new ControlVar(Units.num, 100)
 *
 * const interpolated = new InterpolatedVars("spacing", Units.px, [v1, v2])
 * // interpolates from 0-100
 *
 * v1.set(50) // interpolated will now update to interpolate from 50-100
 * ```
 *
 * It can be passed multiple stops.
 * ```ts
 * const interpolated = new InterpolatedVars("spacing", Units.px, [v1, v2, v3])
 * ```
 *
 * ... or stops with positions (otherwise they are evenly spaced).
 *
 * ```ts
 *	// positions should be in a 0-1 percentage range
 * const interpolated = new InterpolatedVars("spacing", Units.px, [v1, v2, v3], [0, 0.2, 1])
 * ```
 *
 * You can change interpolation control variables and any options using `set`:
 *
 * ```ts
 * interpolated.set("values-stops", [vOther1, vOther2, vOther3], undefined)
 * interpolated.set("values-stops", [vOther1, vOther2, vOther3], [0, 0.2, 1])
 * interpolated.set("options", {steps: 20})
 * interpolated.set("stop", currentIndex, newPercent) // will re-sort after
 * ```
 */
export class InterpolatedVars<
	TUnit extends Record<string, any> = Record<string, any>,
> extends Base {
	name: string

	unit: (value: TUnit) => string

	values: ControlVar<any, TUnit>[] = []

	stops: number[] | undefined = undefined

	ready: boolean = false

	value: Record<string, any>[] = []

	interpolated: Record<string, string> = {}

	options: InterpolatedVarsOptions<ControlVar<any, TUnit>> = {
		roundTo: 3,
		exclude: [],
		keyLimit: 10,
		keyName: defaultKeyNamer,
		interpolator: lerp as any,
		separator: "-",
		steps: 10,
	}

	constructor(
		name: string,
		unit: (value: TUnit) => string,
		values: ControlVar<any, TUnit>[],
		stops?: number[],
		options: Partial<InterpolatedVarsOptions<ControlVar<any, TUnit>>> = {}
	) {
		super()
		if (isBlank(name)) throw new Error("Name cannot be blank.")

		this.name = name
		this.unit = unit

		this.set("values-stops", values, stops)
		this.set("options", options)

		this.ready = true
		this.notify()
	}

	set(
		/** The property configuration to update. */
		type: "values-stops",
		/** The new control variables array. */
		values: ControlVar<any, TUnit>[],
		/** The new explicit stops array, or undefined to switch to even spacing. */
		stops?: number[] | undefined
	): void

	set(
		/** Targets a specific stop position to change. */
		type: "stop",
		/** The target array index of the stop to modify. Values will get resorted after setting. */
		index: number,
		/** The new position value (0 to 1) for the stop. */
		value: number
	): void

	set(
		/** Updates class configuration options. */
		type: "options",
		/** Partial options object. */
		value: Partial<InterpolatedVarsOptions<ControlVar<any, TUnit>>>
	): void

	set(type: "values-stops" | "stop" | "options", arg1: any, arg2?: any): void {
		if (type === "options") {
			this.options = { ...this.options, ...arg1 }
			if (this.ready) { this.notify() }
			return
		}

		if (type === "stop") {
			const index = arg1 as number
			const newPosition = arg2 as number

			if (this.stops === undefined) {
				throw new Error("Cannot update position on evenly spaced stops. Set values-stops with positions first.")
			}
			if (index < 0 || index >= this.stops.length) {
				throw new Error(`Index ${index} is out of bounds.`)
			}
			if (newPosition < 0 || newPosition > 1) {
				throw new Error("Stop percentage must be expressed in a value from 0 to 1.")
			}

			this.stops[index] = newPosition
			this.sortStopsAndValues()

			if (this.ready) { this.notify() }
			return
		}

		if (type === "values-stops") {
			const nextValues = arg1 as ControlVar<any, TUnit>[]
			const nextStops = arg2 as number[] | undefined

			this.checkStopsCorrectness(nextValues, nextStops)

			if (this.ready) {
				for (const v of this.values) {
					v?.removeDep(this)
				}
			}

			this.values = [...nextValues]
			this.stops = nextStops ? [...nextStops] : undefined

			for (const v of this.values) {
				v.addDep(this)
			}

			if (this.stops !== undefined) {
				this.sortStopsAndValues()
			}

			if (this.ready) { this.notify() }
		}
	}


	protected checkStopsCorrectness(
		values: ControlVar<any, TUnit>[],
		stops: number[] | undefined
	): void {
		if (stops === undefined) return
		if (stops.length !== values.length) {
			throw new Error("Stops array must be the same length as the values array.")
		}
		if (stops.find(entry => entry > 1 || entry < 0) !== undefined) {
			throw new Error("Stop percentage must be expressed in a value from 0 to 1.")
		}
	}

	protected sortStopsAndValues(): void {
		if (this.stops === undefined) return
		const combined = this.values.map((v, i) => ({ v, s: this.stops![i] }))
		combined.sort((a, b) => a.s - b.s)
		this.values = combined.map(item => item.v)
		this.stops = combined.map(item => item.s)
	}

	protected notify(): void {
		this.recompute()
		this._notify()
	}

	protected recompute(): void {
		const valRes: Record<string, any>[] = []
		const interpolatedRes: Record<string, string> = {}
		const steps = this.options.steps
		const totalSteps = getTotalSteps(steps)
		const { values, stops, name } = this
		const hasStops = stops !== undefined
		const lastStopIndex = values.length - 1
		const nonStopStepPercent = lastStopIndex === 0 ? 0 : 1 / lastStopIndex // avoid division by 0
		const state = {}

		let stopIndex = -1
		let nextStopIndex = -1
		let startPercent = -1
		let endPercent = -1
		for (let i = 0; i < totalSteps; i++) {
			let percent = Array.isArray(steps)
				? steps[i]
				: (i) / (steps - 1)

			let startVal: ControlVar<any, TUnit>, endVal: ControlVar<any, TUnit>

			if (hasStops) {
				while (
					(stopIndex < 0 ||
					endPercent < percent) &&
					stopIndex < values.length - 1
				) {
					stopIndex++
					startPercent = stops[stopIndex]
					nextStopIndex = Math.min(stopIndex + 1, lastStopIndex)
					endPercent = stops[nextStopIndex]
				}

				startVal = values[stopIndex]
				endVal = values[nextStopIndex]
				percent = getStepPercent(percent, startPercent, endPercent)
			} else {
				const startValIndex = Math.floor(percent * (lastStopIndex))
				const endValIndex = Math.min(startValIndex + 1, lastStopIndex)
				startPercent = startValIndex * nonStopStepPercent
				endPercent = endValIndex * nonStopStepPercent
				percent = getStepPercent(percent, startPercent, endPercent)
				startVal = values[startValIndex]
				endVal = values[endValIndex]
			}

			const keyName = this.options.keyName({ i, steps, totalSteps, name: this.name, keyLimit: this.options.keyLimit, separator: this.options.separator })

			const val: Record<string, any> = this.options.interpolator({
				start: startVal,
				end: endVal,
				name,
				percent,
				state,
				step: i,
				keyName,
				totalSteps,
				steps,
				exclude: this.options.exclude,
				roundTo: this.options.roundTo,
			})
			valRes.push(val)
			interpolatedRes[keyName] = this.unit(val as TUnit)
		}
		this.value = valRes
		this.interpolated = interpolatedRes
	}
}
