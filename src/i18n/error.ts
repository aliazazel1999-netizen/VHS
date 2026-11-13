/** Wrap an error with additional context, preserving the cause. */
export default class Werror extends Error {
	override cause: unknown

	constructor(cause: unknown, ...context: string[]) {
		super(context.join(': '))
		this.name = 'Werror'
		this.cause = cause
	}
}
