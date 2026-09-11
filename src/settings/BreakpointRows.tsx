/**
 * The editable list of custom breakpoints.
 */

import {
	Button,
	Flex,
	FlexBlock,
	FlexItem,
	TextControl,
	__experimentalText as Text,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import { blankRow, slugFrom, slugHasMoved, type Row } from './rows';
import type { Field, RowProblem } from './validate';

/** Units the server accepts. Matches `Breakpoint::is_valid_length()`. */
const UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

interface BreakpointRowsProps {
	rows: Row[];
	/** One problem per row that has one, keyed by the row's client id. */
	problems: Record<string, RowProblem>;
	max: number;
	onChange: (rows: Row[]) => void;
}

/**
 * A repeater for the site's own breakpoint set.
 *
 * Rows are kept in the order the author typed them, not sorted as they edit.
 * Re-sorting on every keystroke moves the field under the cursor the moment a
 * width crosses another one, which makes the control feel broken. The server
 * stores a canonical widest-first order, and the screen adopts that ordering
 * when it reads the saved result back.
 *
 * @param root0          Component props.
 * @param root0.rows     Current rows.
 * @param root0.problems One problem per row that has one.
 * @param root0.max      Most breakpoints the server will accept.
 * @param root0.onChange Called with the next rows.
 * @return The repeater.
 */
export function BreakpointRows({
	rows,
	problems,
	max,
	onChange,
}: BreakpointRowsProps): React.ReactElement {
	/**
	 * A field's help text: its problem when it has one, its guidance otherwise.
	 *
	 * `help` is WordPress's own slot for this and is already tied to the input
	 * for assistive technology, so a message here is announced with the field
	 * rather than floating beside it. The guidance it replaces is only useful
	 * until something is wrong.
	 *
	 * @param row      The row.
	 * @param field    Which field is being rendered.
	 * @param guidance What to say when the field is fine.
	 * @return The help text.
	 */
	const helpFor = (row: Row, field: Field, guidance: string): string => {
		const problem = problems[row.id];

		return problem && problem.field === field ? problem.message : guidance;
	};
	const update = (index: number, patch: Partial<Row>) => {
		onChange(
			rows.map((row, at) => (at === index ? { ...row, ...patch } : row))
		);
	};

	return (
		<Flex direction="column" gap={4}>
			{rows.map((row, index) => (
				<FlexItem key={row.id}>
					<Flex align="flex-end" gap={3}>
						<FlexBlock>
							<TextControl
								label={__('Name', 'spacery')}
								help={helpFor(
									row,
									'label',
									__(
										'Shown in the editor, e.g. Laptop.',
										'spacery'
									)
								)}
								value={row.label}
								onChange={(label: string) =>
									update(index, {
										label,
										// Keep the slug in step until the author
										// edits it, so the common case needs one
										// field rather than two.
										slug: slugFrom(label, row),
									})
								}
							/>
						</FlexBlock>

						<FlexBlock>
							<TextControl
								label={__('Slug', 'spacery')}
								help={helpFor(
									row,
									'slug',
									__(
										'Stored in block attributes. Lowercase letters, numbers and dashes.',
										'spacery'
									)
								)}
								value={row.slug}
								onChange={(slug: string) =>
									update(index, { slug })
								}
							/>
							{slugHasMoved(row) && (
								<Text variant="muted" size={12}>
									{sprintf(
										/* translators: %s: the slug the breakpoint was saved under. */
										__(
											'Spacing already saved under %s will stop applying. To change only what this breakpoint is called, edit its name and leave the slug alone.',
											'spacery'
										),
										row.storedSlug ?? ''
									)}
								</Text>
							)}
						</FlexBlock>

						<FlexBlock>
							<UnitControl
								label={__('Up to', 'spacery')}
								help={helpFor(
									row,
									'max',
									__(
										'The widest screen this breakpoint covers.',
										'spacery'
									)
								)}
								value={row.max}
								units={UNITS}
								onChange={(next?: string) =>
									update(index, { max: next ?? '' })
								}
							/>
						</FlexBlock>

						<FlexItem>
							<Button
								variant="tertiary"
								isDestructive
								onClick={() =>
									onChange(
										rows.filter(
											(other) => other.id !== row.id
										)
									)
								}
								label={sprintf(
									/* translators: %s: breakpoint name. */
									__('Remove %s', 'spacery'),
									row.label || row.slug
								)}
							>
								{__('Remove', 'spacery')}
							</Button>
						</FlexItem>
					</Flex>
				</FlexItem>
			))}

			<FlexItem>
				<Button
					variant="secondary"
					disabled={rows.length >= max}
					onClick={() => onChange([...rows, blankRow()])}
				>
					{__('Add breakpoint', 'spacery')}
				</Button>
			</FlexItem>

			{rows.length >= max && (
				<FlexItem>
					<Text variant="muted" size={12}>
						{sprintf(
							/* translators: %d: maximum number of breakpoints. */
							__(
								'%d breakpoints is the maximum. Beyond that the editor asks more of an author than it gives back.',
								'spacery'
							),
							max
						)}
					</Text>
				</FlexItem>
			)}
		</Flex>
	);
}
