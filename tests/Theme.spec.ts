import { describe, expect, it, vi } from "vitest"

import { ControlVar } from "../src/ControlVar.js"
import { Units } from "../src/index.js"
import { Theme } from "../src/Theme.js"


it("theme on change works", () => {
	const theme = new Theme({})
	const onChange = vi.fn(() => { })

	theme.on("change", onChange)
	theme.set("key", "gray", new ControlVar(Units.num, 0))
	expect(onChange.mock.calls.length).to.equal(1)
})
// todo more tests
