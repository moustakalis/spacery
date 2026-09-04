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
	__experimentalNumberControl as NumberControl,
	__experimentalText as Text,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from 'react';

import { applyEdit, retagUnit } from './box';
import { parseLength, unitFor } from './length';
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

interface SpacingBoxProps {
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
 * @param root0.label        Feature name, e.g. "Padding".
 * @param root0.sides        Sides the block supports, in canonical order.
 * @param root0.values       Values authored at this tier.
 * @param root0.placeholders What each empty side would fall back to.
 * @param root0.units        Units the theme allows.
 * @param root0.onChange     Called with the next values for every side.
 * @return The box.
 */
export function SpacingBox({
	label,
	sides,
	values,
	placeholders,
	units,
	onChange,
}: SpacingBoxProps): React.ReactElement {
	const [linked, setLinked] = useState(true);

	/*
	 * A unit the author picked outlives the values.
	 *
	 * Reading the unit from the stored values alone looks right until the box
	 * is emptied: with nothing left to read, `rem` would silently become `px`,
	 * and the next number typed would mean something the author did not choose.
	 */
	const [chosen, setChosen] = useState<string | undefined>(undefined);

	const allowed = units.map((unit) => unit.value);
	const unit =
		chosen && allowed.includes(chosen)
			? chosen
			: unitFor(
					sides.map((side) => values[side]),
					allowed
				);

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
		setChosen(next);
		onChange(retagUnit(sides, values, next));
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
								<SelectControl
									hideLabelFromVision
									label={__('Unit', 'spacery')}
									value={unit}
									options={units}
									onChange={changeUnit}
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
						</Flex>
					</FlexItem>
				</Flex>
			</FlexItem>

			<FlexItem>
				<Flex gap={1} align="flex-start">
					{sides.map((side) => (
						<FlexBlock key={side}>
							<NumberControl
								label={sideLabel(side)}
								labelPosition="bottom"
								size="compact"
								spinControls="none"
								value={parseLength(values[side])?.value ?? ''}
								placeholder={placeholderFor(
									placeholders[side],
									unit
								)}
								onChange={(next?: string) => change(side, next)}
							/>
						</FlexBlock>
					))}
				</Flex>
			</FlexItem>
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
