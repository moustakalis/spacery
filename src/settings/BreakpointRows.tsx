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

import type { Breakpoint } from './types';

/** Units the server accepts. Matches `Breakpoint::is_valid_length()`. */
const UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

interface BreakpointRowsProps {
	rows: Breakpoint[];
	max: number;
	onChange: (rows: Breakpoint[]) => void;
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
 * @param root0.max      Most breakpoints the server will accept.
 * @param root0.onChange Called with the next rows.
 * @return The repeater.
 */
export function BreakpointRows({
	rows,
	max,
	onChange,
}: BreakpointRowsProps): React.ReactElement {
	const update = (index: number, patch: Partial<Breakpoint>) => {
		onChange(
			rows.map((row, at) => (at === index ? { ...row, ...patch } : row))
		);
	};

	return (
		<Flex direction="column" gap={4}>
			{rows.map((row, index) => (
				<FlexItem key={index}>
					<Flex align="flex-end" gap={3}>
						<FlexBlock>
							<TextControl
								label={__('Name', 'spacery')}
								help={__(
									'Shown in the editor, e.g. Laptop.',
									'spacery'
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
								help={__(
									'Stored in block attributes. Lowercase letters, numbers and dashes.',
									'spacery'
								)}
								value={row.slug}
								onChange={(slug: string) =>
									update(index, { slug })
								}
							/>
						</FlexBlock>

						<FlexBlock>
							<UnitControl
								label={__('Up to', 'spacery')}
								help={__(
									'The widest screen this breakpoint covers.',
									'spacery'
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
										rows.filter((_, at) => at !== index)
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
					onClick={() =>
						onChange([...rows, { slug: '', label: '', max: '' }])
					}
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

/**
 * Derives a slug from a name, but only while the author has not set their own.
 *
 * Editing the name of a breakpoint whose slug is already in use in content
 * would silently orphan every value stored under the old slug, so the slug
 * stops following once it diverges from the name it came from.
 *
 * @param label The new name.
 * @param row   The row before this edit.
 * @return The slug to store.
 */
function slugFrom(label: string, row: Breakpoint): string {
	if ('' !== row.slug && row.slug !== toSlug(row.label)) {
		return row.slug;
	}

	return toSlug(label);
}

/**
 * Lowercases and dashes a name, matching what the server accepts.
 *
 * @param label A human-readable name.
 * @return A candidate slug.
 */
function toSlug(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
