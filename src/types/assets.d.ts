/**
 * Style imports are side effects handled by webpack, not modules with values.
 */
declare module '*.scss' {
	const content: void;
	export default content;
}

declare module '*.css' {
	const content: void;
	export default content;
}
