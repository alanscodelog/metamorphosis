import { keys } from "@alanscodelog/utils/keys"

import { Base } from "./Base.js"
import { type ControlVar } from "./ControlVar.js"
import { InterpolatedVars } from "./InterpolatedVars.js"
import { escapeKey } from "./utils.js"


/**
 * Creates a theme class for grouping variables and applying them to elements.
 */
export class Theme<TValues extends Record<string, InterpolatedVars<any> | ControlVar<any, any>> = Record<string, InterpolatedVars<any> | ControlVar<any, any>>> extends Base {
	protected ready: boolean = false

	els: HTMLElement[] = []

	css: Record<string, string> = {}

	value: TValues = {} as any

	options: { escapeChar: string } = {
		/** For replacing invalid css variable key characters. */
		escapeChar: "-",
	}

	protected _listeners: Record<string, (() => void) []> = { change: []}

	constructor(value: TValues, opts: Partial<Theme<TValues>["options"]> = {}) {
		super()
		this.add(value)
		this.set("options", opts)
		this.recompute(false)
		this.ready = true
	}

	setOpts(value: Partial<Theme<TValues>["options"]> = {}): void {
		this.options = { ...this.options, ...value }
		if (!this.ready) return
		this.notify()
	}

	add(value: Record<string, ControlVar<any, any> | InterpolatedVars<any> >): void {
		for (const key of keys(value)) {
			this._add(key, value[key])
		}
	}

	protected _add(key: string, value: InterpolatedVars<any> | ControlVar<any, any>): void {
		if (this.value[key]) throw new Error(`Key ${key} already exists in theme. Use set to change the value.`)
		if (this.ready) { this.value[key as keyof TValues]?.removeDep(this) }

		this.value[key as keyof TValues] = value as TValues[keyof TValues]

		value.addDep(this)

		if (this.ready) { this.notify() }
	}

	remove(key: string): void {
		if (!this.value[key]) return
		if (this.ready) { this.value[key]?.removeDep(this) }

		const value = this.value[key]
		this._generateCss(this.css, key, this.options.escapeChar, value, { remove: true })
		delete this.value[key]

		// NOTE the use of _, we don't need to recompute other keys
		if (this.ready) { this.notify() }
	}

	set(
		/** Updates class configuration options. */
		type: "options",
		/** Partial options object configuration. */
		value: Partial<Theme<TValues>["options"]>
	): void

	set(
		/** Changes or registers a single InterpolatedVar or ControlVar key mapping. */
		type: "key",
		/** The variable identifier string name. */
		key: string,
		/** The new control or interpolated variable wrapper instance. */
		value: InterpolatedVars<any> | ControlVar<any, any>
	): void

	set(type: "options" | "key", arg1: any, arg2?: any): void {
		if (type === "options") {
			this.setOpts(arg1)
			return
		}

		if (type === "key") {
			const key = arg1 as string
			const value = arg2 as InterpolatedVars<any> | ControlVar<any, any>

			if (this.ready) { this.value[key]?.removeDep(this) }

			this.value[key as keyof TValues] = value as TValues[keyof TValues]
			this._generateCss(this.css, key, this.options.escapeChar, value)
			value.addDep(this)

			if (this.ready) { this.notify({ recompute: false }) }
		}
	}

	protected notify({ recompute = true }: { recompute?: boolean } = {}): void {
		if (!this.ready) return
		if (recompute) this.recompute(false)

		for (const listener of this._listeners.change) {
			listener()
		}
		for (const el of this.els) {
			this._lastPropertiesSet = Theme.setElVariables(el, this.css, this._lastPropertiesSet)
		}
	}

	on(type: "change", cb: () => void): void {
		this._listeners[type].push(cb)
	}

	off(type: "change", cb: () => void): void {
		const i = this._listeners[type].findIndex(cb)
		if (i > -1) {
			this._listeners[type].splice(i, 1)
		}
	}

	protected _generateCss(
		res: Record<string, string>,
		key: string,
		sep: string,
		value: InterpolatedVars<any> | ControlVar<any, any>,
		{ remove = false }: { remove?: boolean } = {}
	): void {
		if (value instanceof InterpolatedVars) {
			for (const k of Object.keys(value.interpolated)) {
				if (remove) {
					delete res[`--${escapeKey(k, sep)}`]
				} else {
					res[`--${escapeKey(k, sep)}`] = value.interpolated[k]
				}
			}
		} else {
			if (remove) {
				delete res[`--${escapeKey(key, sep)}`]
			} else {
				res[`--${escapeKey(key, sep)}`] = value.css
			}
		}
	}

	/**
	 * The theme can force dependencies to recompute.
	 *
	 * This should not be needed unless you want to recompute based of some external state.
	 *
	 * Please file a bug report otherwise.
	 */
	recompute(force: boolean = true): void {
		const res: Record<string, string> = {}
		for (const [key, val] of Object.entries(this.value)) {
			if (force) {
				(val as any).recompute()
			}
			this._generateCss(res, key, this.options.escapeChar, val)
		}
		this.css = res
	}

	protected _lastPropertiesSet: string[] = []

	// todo move to utils?
	/**
	 * Set css variables on an element.
	 *
	 * Careful that the css properties are prefixed with `--`, otherwise they might conflict with other style properties.
	 *
	 * Can be passed a list of already set properties to remove. Returns a list of properties that were set.
	 */
	static setElVariables(el: HTMLElement, css: Record<string, string>, lastPropertiesSet: string[] = []): string[] {
		for (const prop of lastPropertiesSet) {
			el.style.removeProperty(prop)
		}
		const newLastPropertiesSet = []
		for (const key of keys(css)) {
			el.style.setProperty(key, css[key])
			newLastPropertiesSet.push(key)
		}
		return newLastPropertiesSet
	}

	/**
	 * Attach to an element and automatically set and update the theme's properties on it.
	 *
	 * If no element is passed, attaches to `document.documentElement`.
	 */
	attach(el: HTMLElement = document.documentElement): void {
		this.els.push(el)
		this._lastPropertiesSet = Theme.setElVariables(el, this.css, this._lastPropertiesSet)
	}

	detach(el: HTMLElement = document.documentElement): void {
		const existing = this.els.indexOf(el)
		if (existing >= 0) {
			this.els.splice(existing, 1)
			for (const prop of this._lastPropertiesSet) {
				el.style.removeProperty(prop)
			}
		} else {
			// eslint-disable-next-line no-console
			console.warn("Was not attached to element:", el)
		}
	}
}
