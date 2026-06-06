import { expectType } from "@alanscodelog/utils/expectType"
import { describe, expect, it } from "vitest"

import { ControlVar } from "../src/ControlVar.js"
import { Units } from "../src/index.js"
import { InterpolatedVars } from "../src/InterpolatedVars.js"
import { paddedKeyNamer } from "../src/utils.js"


it("simple interpolation with one variable", () => {
	const v1 = new ControlVar(Units.num, 0)

	const test = new InterpolatedVars("test", Units.num, [v1], undefined, { steps: 11 })

	expect(test.value[0]._).to.equal(0)
	expect(test.value[10]._).to.equal(0)
})
it("simple interpolation with two variables", () => {
	const v1 = new ControlVar(Units.num, 0)
	const v2 = new ControlVar(Units.num, 100)

	const test = new InterpolatedVars("test", Units.num, [v1, v2], undefined, { steps: 11 })

	expect(test.value[0]._).to.equal(0)
	expect(test.value[5]._).to.equal(50)
	expect(test.value[10]._).to.equal(100)
})
it("simple interpolation with two stops", () => {
	const v1 = new ControlVar(Units.num, 0)
	const v2 = new ControlVar(Units.num, 100)

	const test = new InterpolatedVars("test", Units.num, [v1, v2], [0, 1], { steps: 11 })

	expect(test.value[0]._).to.equal(0)
	expect(test.value[5]._).to.equal(50)
	expect(test.value[10]._).to.equal(100)
})
it("simple interpolation with two stops with irregular stops", () => {
	const v1 = new ControlVar(Units.num, 0)
	const v2 = new ControlVar(Units.num, 100)

	const test = new InterpolatedVars("test", Units.num, [v2, v1], [0.8, 0.2], { steps: 11 })
	expect(test.values).to.deep.equal([v1, v2])
	expect(test.stops).to.deep.equal([0.2, 0.8])
	expect(test.value[0]._).to.equal(0)
	expect(test.value[5]._).to.equal(50)
	expect(test.value[10]._).to.equal(100)
})
it("interpolation with multiple stops", () => {
	const v1 = new ControlVar(Units.num, 0)
	const v2 = new ControlVar(Units.num, 100)
	const v3 = new ControlVar(Units.num, 0)

	const test = new InterpolatedVars("test", Units.num, [v1, v2, v3], [0, 0.2, 1], { steps: 11 })

	expect(test.value[0]._).to.equal(0)
	expect(test.value[1]._).to.equal(50)
	expect(test.value[2]._).to.equal(100)
	expect(test.value[6]._).to.equal(50)
	expect(test.value[10]._).to.equal(0)
})
it("object interpolation", () => {
	const white = new ControlVar(Units.rgb, { r: 255, g: 255, b: 255 })
	const black = new ControlVar(Units.rgb, { r: 0, g: 0, b: 0 })

	const grays = new InterpolatedVars("gray", Units.rgb, [white, black], undefined, { keyName: paddedKeyNamer() })
	expect(Object.keys(grays.value).length).to.equal(10)

	grays.set("options", { steps: 3, keyName: paddedKeyNamer(3 * 500) })
	expect(grays.value).to.deep.equal([
		{ r: 255, g: 255, b: 255 },
		{ r: 255 / 2, g: 255 / 2, b: 255 / 2 },
		{ r: 0, g: 0, b: 0 },
	])
	expect(grays.interpolated).to.deep.equal({
		"gray-000": "rgb(255 255 255)",
		"gray-500": "rgb(127.5 127.5 127.5)",
		"gray-1000": "rgb(0 0 0)",
	})

	white.set({ r: 100, g: 100, b: 100 })
	expect(grays.interpolated["gray-500"]).to.equal("rgb(50 50 50)")
})
it("works with optional alpha units", () => {
	const var1 = new ControlVar(Units.rgb, { r: 255, g: 255, b: 255, a: 1 })
	const var2 = new ControlVar(Units.rgb, { r: 255, g: 255, b: 255, a: 0 })
	const wrongvar2 = new ControlVar(Units.rgb, { r: 255, g: 255, b: 255 })

	expectType<typeof var1, "equal", typeof var2>(true)
	expectType<typeof var1, "equal", typeof wrongvar2>(false)

	// Interpolated vars should type error if [var1, wrongvar2] is passed
	// but not error if being passed [var1, var2] with alpha values
	const grays = new InterpolatedVars("gray", Units.rgb, [var1, var2], undefined, { steps: 3, keyName: paddedKeyNamer() })
})
it("example - alias interpolation", () => {
	const color = new ControlVar(Units.cssVar, "red")

	const alias = new InterpolatedVars("alias", Units.cssVar, [color], undefined, {
		interpolator: ({ keyName, name, start }) => ({ _: keyName.replace(name, start.value._) }),
		keyName: paddedKeyNamer(),
	})


	expect(alias.interpolated["alias-000"]).to.equal("var(--red-000)")
	expect(alias.interpolated["alias-900"]).to.equal("var(--red-900)")

	color.set("blue")
	expect(alias.interpolated["alias-000"]).to.equal("var(--blue-000)")
	expect(alias.interpolated["alias-900"]).to.equal("var(--blue-900)")
})
