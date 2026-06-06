import type { ControlVar } from "./ControlVar.js"


export type Interpolator<T extends ControlVar<any, any> = ControlVar<any, any>> = (options: InterpolatorOptions<T>) => T["value"]

export type KeyNamer = (opts: { i: number, steps: number | number[], totalSteps: number, name: string, keyLimit: number, separator: string }) => string

export type InterpolatorOptions<T extends ControlVar<any, any> = ControlVar<any, any>> = {
	state: any
	step: number
	totalSteps: number
	percent: number
	steps: number | number[]
	start: T
	end: T
	keyName: string
	name: string
	exclude: string[]
	roundTo: number | false
}

export type InterpolatedVarsOptions<T extends ControlVar<any, any> = ControlVar<any, any>> = {
	interpolator: Interpolator<T>
	roundTo: number | false
	keyName: KeyNamer
	exclude: string[]
	steps: number | number[]
	separator: string
	keyLimit: number
}

