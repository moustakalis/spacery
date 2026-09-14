/**
 * Four sides, one row, with a link toggle.
 *
 * Written rather than taken from core. `BoxControl` is the right *look* — it is
 * what core uses for the same properties — but it opens linked, showing a
 * single field for all four sides, and it takes one set of input props for
 * every side. Spacery needs the opposite of both: four fields visible by
 * default, because the point of the panel is per-side control, and a different
 * placeholder on each field, because each side inherits its own value from a
 * wider tier and showing one side's inheritance on all four would be wrong
 * three times out of four.
 *
 * The unit picker also carries a `custom` mode, in which the four fields take
 * whole CSS values instead of numbers. That is the only way to author a mixture
 * — `0`, `30rem`, `calc(100% - 2rem)` — and the only way to *see* a value some
 * other tool stored that no number field can hold.
 *
 * Linking here syncs the fields rather than collapsing them, so the four values
 * stay visible while they are being kept equal, and it is **on by default**:
 * equal sides are what most spacing is, and a box that starts apart makes the
 * common case four edits instead of one.
 */

import {
	Button,
	Flex,
	FlexBlock,
	FlexItem,
	SelectControl,
	__experimentalInputControl as InputControl,
	__experimentalNumberControl as NumberControl,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useState } from 'react';

import { applyEdit, clearBox, isAuthored, switchUnit } from './box';
import { readBoxState, rememberLinked, rememberUnit } from './boxState';
import { CUSTOM, parseLength, unitFor } from './length';
import { type Side, sideLabel } from './supports';

/** The link glyph, drawn here for the same reason the device icons are. */
const LINKED = (
	<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path
			fill="currentColor"
			d="M15.6 7.2H14v1.5h1.6c2 0 3.7 1.7 3.7 3.8s-1.7 3.8-3.7 3.8H14v1.5h1.6c2.8 0 5.2-2.4 5.2-5.3s-2.3-5.3-5.2-5.3ZM4.7 12.5c0-2.1 1.7-3.8 3.7-3.8H10V7.2H8.4c-2.9 0-5.2 2.4-5.2 5.3s2.3 5.3 5.2 5.3H10v-1.5H8.4c-2 0-3.7-1.7-3.7-3.8Zm4.1.8h6.4v-1.5H8.8v1.5Z"
		/>
	</svg>
);

const UNLINKED = (
	<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path
			fill="currentColor"
			d="M15.6 7.2H14v1.5h1.6c2 0 3.7 1.7 3.7 3.8s-1.7 3.8-3.7 3.8H14v1.5h1.6c2.8 0 5.2-2.4 5.2-5.3s-2.3-5.3-5.2-5.3ZM4.7 12.5c0-2.1 1.7-3.8 3.7-3.8H10V7.2H8.4c-2.9 0-5.2 2.4-5.2 5.3s2.3 5.3 5.2 5.3H10v-1.5H8.4c-2 0-3.7-1.7-3.7-3.8Z"
		/>
	</svg>
);

/**
 * A counter-clockwise arrow, for the same reason the link glyph is drawn here.
 */
const RESET = (
	<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path
			fill="currentColor"
			d="M12 4.5a7.5 7.5 0 1 0 7.4 8.7h-1.5A6 6 0 1 1 12 6c1.6 0 3 .6 4 1.6l-2.3 2.3h5.6V4.3l-2.2 2.2A7.5 7.5 0 0 0 12 4.5Z"
		/>
	</svg>
);

/**
 * Custom mode, which used to be the last entry in the unit list.
 *
 * A pencil rather than the word, for the reason the list was the wrong place
 * for it: `custom` is not a unit. Every other entry says what the numbers in
 * the fields mean; `custom` said what the fields *are*, and a `<select>` cannot
 * show that difference. It also sized the picker -- a `<select>` takes its
 * width from its widest option, so the rarest choice was setting the geometry
 * of the row it sat in.
 */
const EDIT = (
	<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path
			fill="currentColor"
			d="M4 20l1.2-4.2 9.3-9.3 3 3-9.3 9.3L4 20Zm12.4-11.6 1.8-1.8a1.2 1.2 0 0 0 0-1.7l-1.3-1.3a1.2 1.2 0 0 0-1.7 0l-1.8 1.8 3 3Z"
		/>
	</svg>
);

interface SpacingBoxProps {
	/** Identifies this box's remembered preferences. From `boxKey()`. */
	stateKey: string;
	/** Which property this box sets. Only the floor below depends on it. */
	feature: 'padding' | 'margin';
	label: string;
	sides: Side[];
	/** Values authored at this tier. */
	values: Partial<Record<Side, string>>;
	/** What each empty side would fall back to. */
	placeholders: Partial<Record<Side, string>>;
	units: Array<{ value: string; label: string }>;
	onChange: (next: Partial<Record<Side, string | undefined>>) => void;
}

/**
 * The control.
 *
 * @param root0              Component props.
 * @param root0.stateKey     Identifies this box's remembered preferences.
 * @param root0.feature      Which property this box sets.
 * @param root0.label        Feature name, e.g. "Padding".
 * @param root0.sides        Sides the block supports, in canonical order.
 * @param root0.values       Values authored at this tier.
 * @param root0.placeholders What each empty side would fall back to.
 * @param root0.units        Units the theme allows.
 * @param root0.onChange     Called with the next values for every side.
 * @return The box.
 */
export function SpacingBox({
	stateKey,
	feature,
	label,
	sides,
	values,
	placeholders,
	units,
	onChange,
}: SpacingBoxProps): React.ReactElement {
	/*
	 * Both of these are seeded from, and written back to, a store that outlives
	 * this component -- see `boxState.ts`. The inspector unmounts the panel on
	 * every selection change, so component state alone lost them the moment the
	 * author clicked another block, which is the commonest thing they do.
	 */
	const [linked, setLinkedState] = useState(
		() => readBoxState(stateKey).linked
	);

	/*
	 * A unit the author picked outlives the values.
	 *
	 * Reading the unit from the stored values alone looks right until the box
	 * is emptied: with nothing left to read, `rem` would silently become `px`,
	 * and the next number typed would mean something the author did not choose.
	 */
	const [chosen, setChosenState] = useState<string | undefined>(
		() => readBoxState(stateKey).chosen
	);

	const setLinked = (next: boolean): void => {
		rememberLinked(stateKey, next);
		setLinkedState(next);
	};

	const allowed = units.map((unit) => unit.value);

	/**
	 * Which unit the box is in.
	 *
	 * Three sources, in order of who decided. The author's own pick outranks
	 * everything, for as long as this page is loaded. Then the box's stored
	 * values, which the author also typed. Only a box holding nothing of its
	 * own is described by what it inherits -- which matters, because a box
	 * inheriting `var:preset|spacing|60` from core's own control used to open
	 * in `px` and put that string inside a number field.
	 *
	 * @return The unit, or `CUSTOM`.
	 */
	const resolveUnit = (): string => {
		if (chosen && (CUSTOM === chosen || allowed.includes(chosen))) {
			return chosen;
		}

		const stored = sides.map((side) => values[side]);

		if (stored.some((value) => value)) {
			return unitFor(stored, allowed);
		}

		return unitFor(
			sides.map((side) => placeholders[side]),
			allowed
		);
	};

	const unit = resolveUnit();

	/**
	 * The unit this box would be in if it were not in custom mode.
	 *
	 * What the picker shows while custom is on, and where the pencil returns
	 * to. It cannot just be `unit`, which is `custom` then, and it cannot be
	 * `unitFor()` alone: that reports `custom` for a value no number field can
	 * hold (D22), which is exactly the box most likely to be in custom mode.
	 * So a real unit is always chosen, falling back to the first the theme
	 * allows.
	 *
	 * @return An allowed unit, never `CUSTOM`.
	 */
	const lengthUnit = (): string => {
		if (chosen && allowed.includes(chosen)) {
			return chosen;
		}

		const stored = sides.map((side) => values[side]);
		const read = unitFor(
			stored.some((value) => value)
				? stored
				: sides.map((side) => placeholders[side]),
			allowed
		);

		return allowed.includes(read) ? read : (allowed[0] ?? 'px');
	};

	/**
	 * Applies one field's new number.
	 *
	 * @param side  The side that changed.
	 * @param input The field's contents.
	 */
	const change = (side: Side, input: string | undefined): void => {
		onChange(applyEdit({ sides, values, side, input, unit, linked }));
	};

	/**
	 * Re-labels every authored side with a new unit.
	 *
	 * @param next The chosen unit.
	 */
	const changeUnit = (next: string): void => {
		rememberUnit(stateKey, next);
		setChosenState(next);
		onChange(switchUnit(sides, values, unit, next));
	};

	return (
		<Flex direction="column" gap={1}>
			<FlexItem>
				<Flex justify="space-between" align="center">
					<FlexItem>
						<Text weight={600} size={11} upperCase>
							{label}
						</Text>
					</FlexItem>

					<FlexItem>
						<Flex align="center" gap={1}>
							<FlexItem>
								{/*
								 * Compact, to match the fields it modifies:
								 * since WordPress 7.1 a control's default
								 * height is 40px, and the four number fields
								 * are `size="compact"` at 32, so a
								 * default-sized picker stood taller than
								 * everything it sat beside.
								 *
								 * Width is still pinned -- a `<select>` sizes
								 * to its widest option -- but that option is
								 * now `rem` rather than `custom`, which is
								 * what moving custom to the pencil bought
								 * back.
								 *
								 * In custom mode this shows the unit the box
								 * would otherwise be in, and choosing one here
								 * leaves custom mode. That is the second way
								 * out, and the one an author reaches for when
								 * they know which unit they want rather than
								 * only that they are done with CSS values.
								 */}
								<div style={{ width: '3.5rem' }}>
									<SelectControl
										hideLabelFromVision
										label={__('Unit', 'spacery')}
										size="compact"
										value={
											CUSTOM === unit
												? lengthUnit()
												: unit
										}
										options={units}
										onChange={changeUnit}
									/>
								</div>
							</FlexItem>

							<FlexItem>
								<Button
									size="small"
									icon={EDIT}
									isPressed={CUSTOM === unit}
									label={
										CUSTOM === unit
											? __(
													'Use a number and a unit',
													'spacery'
												)
											: __('Enter a CSS value', 'spacery')
									}
									onClick={() =>
										changeUnit(
											CUSTOM === unit
												? lengthUnit()
												: CUSTOM
										)
									}
								/>
							</FlexItem>

							<FlexItem>
								<Button
									size="small"
									icon={linked ? LINKED : UNLINKED}
									isPressed={linked}
									label={
										linked
											? __('Unlink sides', 'spacery')
											: __(
													'Link sides — one value for all four',
													'spacery'
												)
									}
									onClick={() => setLinked(!linked)}
								/>
							</FlexItem>

							{/*
							 * Only when there is something to reset. A control
							 * that spends most of its life disabled is clutter
							 * that also lies about being available, and this row
							 * is already carrying three things.
							 */}
							{isAuthored(sides, values) && (
								<FlexItem>
									<Button
										size="small"
										icon={RESET}
										label={sprintf(
											/* translators: %s: a spacing property, e.g. "Padding". */
											__('Reset %s', 'spacery'),
											label
										)}
										onClick={() =>
											onChange(clearBox(sides))
										}
									/>
								</FlexItem>
							)}
						</Flex>
					</FlexItem>
				</Flex>
			</FlexItem>

			<FlexItem>
				{/*
				 * The class is the stylesheet's only hook. `Flex` is declared
				 * in the hand-written `src/types/wordpress.d.ts` and does not
				 * take `className`, which is not something to assert about a
				 * component whose source is not in `node_modules` to check --
				 * so the row carries a plain wrapper instead.
				 */}
				<div className="spacery-sides">
					<Flex gap={1} align="flex-start">
						{sides.map((side) => (
							<FlexBlock key={side}>
								{CUSTOM === unit ? (
									<InputControl
										label={sideLabel(side)}
										labelPosition="bottom"
										size="compact"
										value={values[side] ?? ''}
										placeholder={placeholders[side]}
										onChange={(next?: string) =>
											change(side, next)
										}
									/>
								) : (
									<NumberControl
										label={sideLabel(side)}
										labelPosition="bottom"
										size="compact"
										/*
										 * Native, not `custom`. Core's custom spin
										 * buttons render as a suffix two 24px
										 * buttons wide: measured at **60px inside a
										 * 59px field**, which left the number
										 * itself 12px. Four sides is the whole
										 * point of this box, so the field is 59px
										 * and stays 59px; the browser's own arrows
										 * sit inside it and cost nothing until the
										 * field is hovered or focused.
										 */
										spinControls="native"
										/*
										 * Padding has a floor and margin does not.
										 * `Generator::is_value()` allows a leading
										 * `-`, so a negative padding is emitted and
										 * then dropped by the browser -- invisible
										 * either way, but the arrows are what make
										 * it reachable by holding a key rather than
										 * by deliberately typing a minus sign.
										 */
										{...('padding' === feature
											? { min: 0 }
											: {})}
										value={
											parseLength(values[side])?.value ??
											''
										}
										placeholder={placeholderFor(
											placeholders[side],
											unit
										)}
										onChange={(next?: string) =>
											change(side, next)
										}
									/>
								)}
							</FlexBlock>
						))}
					</Flex>
				</div>
			</FlexItem>

			{CUSTOM === unit && (
				<FlexItem>
					<Text variant="muted" size={12}>
						{__(
							'A length, calc() or a preset, one per side. Anything else is dropped.',
							'spacery'
						)}
					</Text>
				</FlexItem>
			)}
		</Flex>
	);
}

/**
 * What to show in an empty field.
 *
 * The bare number when the inherited value uses the box's unit, and the whole
 * value when it does not — a lone "2" under a `px` picker would read as two
 * pixels when it is two rem.
 *
 * @param inherited The value this side falls back to, if any.
 * @param unit      The unit the box is showing.
 * @return Placeholder text, or undefined when nothing is inherited.
 */
function placeholderFor(
	inherited: string | undefined,
	unit: string
): string | undefined {
	if (!inherited) {
		return undefined;
	}

	const parsed = parseLength(inherited);

	if (!parsed || parsed.unit !== unit) {
		return inherited;
	}

	return String(parsed.value);
}
