/**
 * The site's own breakpoint set, as a table.
 *
 * Built to `docs/design/admin-screen.png`. The first version of this component
 * gave every row its own column labels and its own help text, so four rows
 * printed twelve labels and twelve lines of guidance — the defect
 * `docs/design/settings-screen.png` opens by naming, and one the design system
 * forbids in as many words: "Per-row `help` is forbidden — N rows repeat it N
 * times" (§5.2). The column labels appear once, in a header; the guidance
 * appears once, under the table; and `help` is left free for the one thing it
 * is worth spending on, which is what is wrong with this row.
 *
 * Rows are kept in the order the author typed them, not sorted as they edit.
 * Re-sorting on every keystroke moves the field under the cursor the moment a
 * width crosses another one, which makes the control feel broken. The server
 * stores a canonical widest-first order, the screen adopts that order when it
 * reads the saved result back, and the card header says so.
 */

import {
	Button,
	Flex,
	FlexItem,
	TextControl,
	__experimentalText as Text,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import type { Coverage } from './bands';
import {
	blankRow,
	slugFrom,
	slugHasMoved,
	slugIsDerived,
	slugTyped,
	type Row,
} from './rows';
import type { Field, RowProblem } from './validate';

/** Units the server accepts. Matches `Breakpoint::is_valid_length()`. */
const UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/**
 * The × that removes a row.
 *
 * Inline rather than from `@wordpress/icons`, which is a script external this
 * repository cannot check a declaration against. `Button` accepts any node
 * here and wraps it in `Icon` itself.
 */
const CLOSE = (
	<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
		<path
			d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.061L12 10.939 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z"
			fill="currentColor"
		/>
	</svg>
);

interface BreakpointRowsProps {
	rows: Row[];
	/** One problem per row that has one, keyed by the row's client id. */
	problems: Record<string, RowProblem>;
	/** Advisory cautions, which do not block a save. */
	cautions: Record<string, RowProblem>;
	/** What each row covers, derived from the widths as they are typed. */
	coverage: Record<string, Coverage>;
	max: number;
	/** What runs while this list is empty, named so the empty state can say. */
	fallback: string;
	onChange: (rows: Row[]) => void;
}

/**
 * A repeater for the site's own breakpoint set.
 *
 * @param root0          Component props.
 * @param root0.rows     Current rows.
 * @param root0.problems One problem per row that has one.
 * @param root0.cautions Advisory cautions, which do not block a save.
 * @param root0.coverage What each row covers.
 * @param root0.max      Most breakpoints the server will accept.
 * @param root0.fallback What runs while the list is empty.
 * @param root0.onChange Called with the next rows.
 * @return The repeater.
 */
export function BreakpointRows({
	rows,
	problems,
	cautions,
	coverage,
	max,
	fallback,
	onChange,
}: BreakpointRowsProps): React.ReactElement {
	/**
	 * A field's message, when it has one.
	 *
	 * `help` is WordPress's own slot for this and is already tied to the input
	 * for assistive technology, so a message here is announced with the field
	 * rather than floating beside it. Nothing else goes in it: the guidance
	 * this used to carry is one line under the table.
	 *
	 * @param row   The row.
	 * @param field Which field is being rendered.
	 * @return The message, or undefined when the field is fine.
	 */
	const noteFor = (row: Row, field: Field): RowProblem | undefined => {
		// A refusal outranks a caution: one stops the save, the other advises.
		const note = problems[row.id] ?? cautions[row.id];

		return note && note.field === field ? note : undefined;
	};

	/**
	 * The class that colours a field and its message.
	 *
	 * Three severities, two treatments: red for a row fighting another row,
	 * amber for a field that is unfinished or probably a typo. See
	 * `style.scss`, and `validate.ts` for which is which.
	 *
	 * @param row   The row.
	 * @param field Which field is being rendered.
	 * @return A class name, or an empty string.
	 */
	const fieldClass = (row: Row, field: Field): string => {
		const note = noteFor(row, field);

		return note ? `spacery-field spacery-field--${note.severity}` : '';
	};

	const update = (index: number, patch: Partial<Row>) => {
		onChange(
			rows.map((row, at) => (at === index ? { ...row, ...patch } : row))
		);
	};

	if (0 === rows.length) {
		return (
			<EmptyState
				fallback={fallback}
				onAdd={() => onChange([blankRow()])}
			/>
		);
	}

	return (
		<Flex direction="column" gap={0}>
			<FlexItem>
				<div className="spacery-table__head">
					<div>{__('Name', 'spacery')}</div>
					<div>{__('Slug', 'spacery')}</div>
					<div>{__('Up to', 'spacery')}</div>
					<div>{__('Covers', 'spacery')}</div>
					<div />
				</div>
			</FlexItem>

			{rows.map((row, index) => {
				const covers = coverage[row.id];
				const conflicted = 'conflict' === problems[row.id]?.severity;

				return (
					<FlexItem key={row.id}>
						<div
							className={`spacery-table__row${
								conflicted
									? ' spacery-table__row--conflict'
									: ''
							}`}
						>
							<div className={fieldClass(row, 'label')}>
								<TextControl
									label={__('Name', 'spacery')}
									hideLabelFromVision
									help={noteFor(row, 'label')?.message}
									value={row.label}
									onChange={(label: string) =>
										update(index, {
											label,
											// Keep the slug in step until the
											// author edits it, so the common
											// case needs one field rather
											// than two.
											slug: slugFrom(label, row),
										})
									}
								/>
							</div>

							<div className={fieldClass(row, 'slug')}>
								{/*
								 * A hint while the slug is still derived from
								 * the name, the stored value once there is
								 * one. See `slugIsDerived()`.
								 */}
								<TextControl
									label={__('Slug', 'spacery')}
									hideLabelFromVision
									help={noteFor(row, 'slug')?.message}
									value={slugIsDerived(row) ? '' : row.slug}
									placeholder={
										slugIsDerived(row)
											? row.slug
											: undefined
									}
									onChange={(slug: string) =>
										update(index, {
											slug: slugTyped(slug, row),
										})
									}
								/>
								{slugHasMoved(row) && (
									<Text variant="muted" size={12}>
										{sprintf(
											/* translators: %s: the slug the breakpoint was saved under. */
											__(
												'Spacing saved under %s will stop applying. To rename it, change the name and leave the slug alone.',
												'spacery'
											),
											row.storedSlug ?? ''
										)}
									</Text>
								)}
							</div>

							<div className={fieldClass(row, 'max')}>
								<UnitControl
									label={__('Up to', 'spacery')}
									hideLabelFromVision
									help={noteFor(row, 'max')?.message}
									value={row.max}
									units={UNITS}
									onChange={(next?: string) =>
										update(index, { max: next ?? '' })
									}
								/>
							</div>

							{/*
							 * Derived, never editable (§5.2), and red when the
							 * row covers nothing — which is a thing an author
							 * can do with two valid widths, and the only place
							 * on the screen that says so in the row itself.
							 */}
							<div
								className={`spacery-table__covers${
									false === covers?.covers
										? ' spacery-table__covers--nothing'
										: ''
								}`}
							>
								{covers?.text}
							</div>

							<div className="spacery-table__remove">
								<Button
									icon={CLOSE}
									size="small"
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
								/>
							</div>
						</div>
					</FlexItem>
				);
			})}

			<FlexItem>
				<div className="spacery-table__foot">
					<Flex justify="space-between" align="flex-start" gap={4}>
						<FlexItem>
							<Button
								variant="secondary"
								disabled={rows.length >= max}
								onClick={() => onChange([...rows, blankRow()])}
							>
								{__('Add breakpoint', 'spacery')}
							</Button>
						</FlexItem>

						{/*
						 * The guidance, once, for the whole table -- and the two
						 * facts an author needs are which column the editor shows
						 * and which one the content is stored under.
						 */}
						<FlexItem>
							<div
								style={{
									textAlign: 'right',
									maxWidth: '420px',
									textWrap: 'balance',
								}}
							>
								<Text variant="muted" size={12}>
									{rows.length >= max
										? sprintf(
												/* translators: %d: maximum number of breakpoints. */
												__(
													'%d breakpoints is the maximum.',
													'spacery'
												),
												max
											)
										: __(
												'Name appears in the editor. Slug is stored on your blocks and follows the name until you edit it.',
												'spacery'
											)}
								</Text>
							</div>
						</FlexItem>
					</Flex>
				</div>
			</FlexItem>
		</Flex>
	);
}

/**
 * What the card says before the first breakpoint exists.
 *
 * Centred, with its own button, because a lone *Add breakpoint* in an empty
 * card leaves the author guessing what the site is doing about spacing
 * meanwhile — and the answer is that something else is in effect.
 *
 * @param root0          Component props.
 * @param root0.fallback The breakpoint set in use meanwhile.
 * @param root0.onAdd    Called to add the first row.
 * @return The empty state.
 */
function EmptyState({
	fallback,
	onAdd,
}: {
	fallback: string;
	onAdd: () => void;
}): React.ReactElement {
	return (
		<div style={{ textAlign: 'center', padding: '24px 0' }}>
			<Text weight={600}>
				{__("You haven't defined any breakpoints yet", 'spacery')}
			</Text>
			<div style={{ margin: '8px auto 20px', maxWidth: '440px' }}>
				<Text variant="muted" size={13}>
					{sprintf(
						/* translators: %s: the breakpoint set in use meanwhile. */
						__(
							'Until you add one, Spacery uses %s — shown in In use now below.',
							'spacery'
						),
						fallback
					)}
				</Text>
			</div>
			<Button variant="primary" onClick={onAdd}>
				{__('Add your first breakpoint', 'spacery')}
			</Button>
		</div>
	);
}
