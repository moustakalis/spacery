/**
 * The Spacery settings screen.
 */

import {
	Button,
	Card,
	CardBody,
	CardHeader,
	CheckboxControl,
	Flex,
	FlexItem,
	Notice,
	RadioControl,
	Spinner,
	__experimentalHeading as Heading,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useState } from 'react';

import { coverage } from './bands';
import { Footer, Masthead } from './Brand';
import { BreakpointRows } from './BreakpointRows';
import { Ruler } from './Ruler';
import { fetchInfo, fetchSettings, saveSettings, wasAccepted } from './data';
import { changedCount, isDirty, toBreakpoints, toRows, type Row } from './rows';
import { fallbackNotice, sourceName, sourceOptions } from './sources';
import { cautions, isValid, saveHint, validate } from './validate';
import type { BreakpointInfo, StoredSettings, StoredSource } from './types';

type Status =
	| { kind: 'idle' }
	| { kind: 'saving' }
	| { kind: 'saved' }
	/** Stored, but what is in use could not be read back. */
	| { kind: 'stale' }
	/** The breakpoints were refused. The source beside them may still have changed. */
	| { kind: 'rejected'; sourceChanged: boolean }
	| { kind: 'error'; message: string };

/**
 * The whole screen.
 *
 * One source is active at a time and the author picks which — decision D2.
 * Blending a theme's tiers with Spacery's would produce a set nobody designed,
 * so the screen never offers a merge; it shows what each source contains and
 * asks for a choice.
 *
 * @return The settings screen.
 */
export function App(): React.ReactElement {
	const [settings, setSettings] = useState<StoredSettings | null>(null);
	const [info, setInfo] = useState<BreakpointInfo | null>(null);

	/*
	 * The rows are held here rather than read straight off `settings` because
	 * editing needs identity the wire format does not carry: which React node
	 * belongs to which breakpoint, and whether a slug is one the server has
	 * already stored. See `rows.ts`.
	 */
	const [rows, setRows] = useState<Row[]>([]);
	const [source, setSource] = useState<StoredSource>('');

	/*
	 * D24, and part of the same save cycle as everything above it. A checkbox
	 * that wrote on click would be a second way to commit this screen, and the
	 * Discard button beside it would then mean "all of it except that".
	 */
	const [deleteData, setDeleteData] = useState(false);
	const [status, setStatus] = useState<Status>({ kind: 'idle' });

	useEffect(() => {
		let cancelled = false;

		Promise.all([fetchSettings(), fetchInfo()])
			.then(([stored, breakpoints]) => {
				if (!cancelled) {
					setSettings(stored);
					setRows(toRows(stored.spacery_custom_breakpoints));
					setSource(stored.spacery_breakpoint_source);
					setDeleteData(stored.spacery_delete_data);
					setInfo(breakpoints);
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setStatus({ kind: 'error', message: describe(error) });
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	/*
	 * Held above the guards below, because the effect that depends on it must
	 * run on every render. `settings` is the last thing the server returned, so
	 * this is "does the screen hold anything the server does not".
	 */
	const dirty =
		null !== settings && isDirty(rows, source, deleteData, settings);

	/*
	 * The browser's own warning, which is the only one that can interrupt a
	 * navigation. Its wording belongs to the browser; all a page can do is ask.
	 */
	useEffect(() => {
		if (!dirty) {
			return;
		}

		const warn = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', warn);

		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty]);

	if ('error' === status.kind && null === settings) {
		return (
			<Flex direction="column" gap={5}>
				<FlexItem>
					<Masthead />
				</FlexItem>
				<FlexItem>
					<Notice status="error" isDismissible={false}>
						{status.message}
					</Notice>
				</FlexItem>
			</Flex>
		);
	}

	/*
	 * Two REST round-trips, and the screen used to render a bare spinner on an
	 * empty page while they ran (S6): nothing named the page, and a screen
	 * reader was told nothing at all, because a spinner alone is decorative.
	 * The heading is available markup that does not depend on either request,
	 * so it renders immediately and the wait is announced rather than blank.
	 */
	if (null === settings || null === info) {
		return (
			<Flex direction="column" gap={5}>
				<FlexItem>
					<Masthead />
				</FlexItem>
				<FlexItem>
					<div role="status">
						<Flex justify="flex-start" align="center" gap={2}>
							<FlexItem>
								<Spinner />
							</FlexItem>
							<FlexItem>
								<Text variant="muted">
									{__('Loading your breakpoints…', 'spacery')}
								</Text>
							</FlexItem>
						</Flex>
					</div>
				</FlexItem>
			</Flex>
		);
	}

	/*
	 * Checked on every render rather than on submit, because the server refuses
	 * an invalid set whole: a rule caught only at save time reads as "nothing
	 * changed" when the author has been typing for a minute.
	 */
	const rules = { ...info.rules, maxBreakpoints: info.maxBreakpoints };
	const problems = validate(rows, rules);
	const valid = isValid(problems);
	const changed = changedCount(rows, settings.spacery_custom_breakpoints);
	const sourceChanged = source !== settings.spacery_breakpoint_source;

	/**
	 * Puts the screen back to what the server holds.
	 *
	 * The counterpart to the count beside it: an author told that two
	 * breakpoints are unsaved needs a way to say "not those two". Reverting to
	 * `settings` rather than reloading keeps the notice and the rest of the
	 * page where they are.
	 */
	const discard = () => {
		setRows(toRows(settings.spacery_custom_breakpoints));
		setSource(settings.spacery_breakpoint_source);
		setDeleteData(settings.spacery_delete_data);
		setStatus({ kind: 'idle' });
	};

	const save = async () => {
		setStatus({ kind: 'saving' });

		const sent = toBreakpoints(rows);
		const sentSource = source;
		const previousSource = settings.spacery_breakpoint_source;

		/*
		 * The save and the refresh are two outcomes, not one. Reported
		 * together, a failing `fetchInfo()` told the author their settings had
		 * not saved when the write had already succeeded -- and the obvious
		 * response to that is to try again.
		 */
		let stored: StoredSettings;

		try {
			stored = await saveSettings({
				spacery_breakpoint_source: sentSource,
				spacery_custom_breakpoints: sent,
				spacery_delete_data: deleteData,
			});
		} catch (error: unknown) {
			setStatus({ kind: 'error', message: describe(error) });
			return;
		}

		setSettings(stored);
		setRows(toRows(stored.spacery_custom_breakpoints));
		setSource(stored.spacery_breakpoint_source);
		setDeleteData(stored.spacery_delete_data);

		/*
		 * The two options are sanitised independently, so a half-typed row can
		 * be refused while the source beside it is stored. "Nothing changed" is
		 * then untrue, and the screen is already showing the new source.
		 */
		const outcome: Status = wasAccepted(
			sent,
			stored.spacery_custom_breakpoints
		)
			? { kind: 'saved' }
			: {
					kind: 'rejected',
					/*
					 * Whether the source *changed*, not whether the server
					 * accepted it: it accepts an unchanged source too, and
					 * announcing that as a save would be its own small lie.
					 */
					sourceChanged:
						stored.spacery_breakpoint_source !== previousSource,
				};

		try {
			setInfo(await fetchInfo());
			setStatus(outcome);
		} catch {
			// A refusal is worth more to the author than a stale panel is.
			setStatus('saved' === outcome.kind ? { kind: 'stale' } : outcome);
		}
	};

	return (
		<Flex direction="column" gap={5}>
			<FlexItem>
				<Masthead />
				<Text variant="muted">
					{__(
						'Responsive block controls, at the breakpoints you choose.',
						'spacery'
					)}
				</Text>
			</FlexItem>

			<StatusNotice
				status={status}
				onDismiss={() => setStatus({ kind: 'idle' })}
			/>

			<FlexItem>
				<Card>
					<CardHeader>
						<Heading level={2}>
							{__('Breakpoint source', 'spacery')}
						</Heading>
					</CardHeader>
					<CardBody>
						<RadioControl
							/*
							 * The CardHeader's <h2> is a heading, not a label,
							 * so without this the fieldset has no accessible
							 * name. Hidden from vision because the heading is
							 * already doing that work.
							 */
							label={__('Breakpoint source', 'spacery')}
							hideLabelFromVision
							selected={source}
							options={sourceOptions(info)}
							onChange={(next: string) =>
								setSource(next as StoredSource)
							}
						/>
						{/*
						 * Capped at the measure the design system prescribes
						 * (§7). A `CardBody` gives a sentence the whole card --
						 * 814px here, which ran the previous copy to 128
						 * characters on one line. The breakpoint table's
						 * guidance line already used this value.
						 */}
						<div style={{ maxWidth: '420px', textWrap: 'balance' }}>
							<Text variant="muted" size={12}>
								{__(
									'Only one source applies at a time — Spacery never merges two sets.',
									'spacery'
								)}
							</Text>
						</div>
					</CardBody>
				</Card>
			</FlexItem>

			{'custom' === source && (
				<FlexItem>
					<Card>
						<CardHeader>
							<Flex justify="space-between" align="center">
								<FlexItem>
									<Heading level={2}>
										{__('Your breakpoints', 'spacery')}
									</Heading>
								</FlexItem>
								{/*
								 * How many, out of how many, and why the order
								 * changes under the author's hands after a
								 * save. The count also retires a guidance
								 * line: the maximum is visible before it is
								 * reached.
								 */}
								<FlexItem>
									<Text variant="muted" size={12}>
										{sprintf(
											/* translators: 1: how many breakpoints are defined. 2: the maximum. */
											__(
												'%1$d of %2$d · sorted widest first',
												'spacery'
											),
											rows.length,
											info.maxBreakpoints
										)}
									</Text>
								</FlexItem>
							</Flex>
						</CardHeader>
						<CardBody>
							<BreakpointRows
								rows={rows}
								problems={problems.rows}
								cautions={cautions(rows, rules)}
								coverage={coverage(rows, rules)}
								max={info.maxBreakpoints}
								fallback={sourceName(info.resolvedSource)}
								onChange={(next: Row[]) => setRows(next)}
							/>
						</CardBody>
					</Card>
				</FlexItem>
			)}

			<FlexItem>
				<Card>
					<CardHeader>
						{/*
						 * The heading and one line of right-aligned meta, which
						 * is what a CardHeader is for (§4). `From:` belongs
						 * here rather than in the body: it qualifies the whole
						 * card, and the card's content is now a drawing.
						 */}
						<Flex justify="space-between" align="center">
							<FlexItem>
								<Heading level={2}>
									{__('In use now', 'spacery')}
								</Heading>
							</FlexItem>
							<FlexItem>
								<Text variant="muted" size={12}>
									{sprintf(
										/* translators: %s: where the breakpoints come from. */
										__('From: %s', 'spacery'),
										sourceName(info.resolvedSource)
									)}
								</Text>
							</FlexItem>
						</Flex>
					</CardHeader>
					<CardBody>
						<ResolvedSet info={info} source={source} />
					</CardBody>
				</Card>
			</FlexItem>

			<FlexItem>
				<Card>
					<CardHeader>
						<Heading level={2}>
							{__('When you delete Spacery', 'spacery')}
						</Heading>
					</CardHeader>
					<CardBody>
						{/*
						 * Off by default, and the help text says what the
						 * default costs rather than only what the checkbox
						 * does. Deleting is not neutral tidying: the stored
						 * breakpoints are the key every stored block value
						 * resolves through, so a site that removes them and
						 * later reinstalls gets Spacery's preset — the same
						 * four slugs at different widths — and its spacing
						 * quietly changes. See D24.
						 */}
						<div style={{ maxWidth: '420px', textWrap: 'balance' }}>
							<CheckboxControl
								label={__(
									'Delete my settings when Spacery is deleted',
									'spacery'
								)}
								help={
									deleteData
										? __(
												'Your breakpoints go too. Values on your blocks stay, but a future install may apply them at different widths.',
												'spacery'
											)
										: __(
												'Your breakpoints are kept, so reinstalling leaves your values exactly as they are.',
												'spacery'
											)
								}
								checked={deleteData}
								onChange={setDeleteData}
							/>
						</div>
					</CardBody>
				</Card>
			</FlexItem>

			<FlexItem>
				{/*
				 * Sticky, because the rows it saves can run past the fold: a
				 * save button below twelve breakpoints is a scroll away from
				 * the work it commits. The Card is what makes it opaque —
				 * inventing a background colour here would be inventing one
				 * WordPress already owns.
				 */}
				<div style={{ position: 'sticky', bottom: 0 }}>
					<Card>
						<CardBody>
							{/*
							 * Save first, then why it is as it is, then the way
							 * out (§5.3, and the drawing). The button leads
							 * because it is the thing being explained; a
							 * sentence in front of it reads as a caption to
							 * nothing.
							 */}
							<Flex justify="space-between" align="center">
								<FlexItem>
									<Flex align="center" gap={3}>
										<FlexItem>
											{/*
											 * Three appearances for three
											 * states (§5.3), from the
											 * components' own variants rather
											 * than a hand-set colour: solid
											 * while there is something to
											 * save, solid-but-disabled while
											 * something above is wrong, and
											 * outlined when there is simply
											 * nothing to do -- which stops a
											 * faded primary from looking like
											 * the action of the page when it
											 * is not.
											 */}
											<Button
												variant={
													dirty
														? 'primary'
														: 'secondary'
												}
												onClick={save}
												isBusy={
													'saving' === status.kind
												}
												disabled={
													'saving' === status.kind ||
													!valid ||
													!dirty
												}
											>
												{__('Save changes', 'spacery')}
											</Button>
										</FlexItem>
										<FlexItem>
											<Text variant="muted" size={12}>
												{saveHint(
													problems,
													changed,
													sourceChanged,
													deleteData !==
														settings.spacery_delete_data
												)}
											</Text>
										</FlexItem>
									</Flex>
								</FlexItem>

								<FlexItem>
									<Button
										variant="tertiary"
										onClick={discard}
										disabled={!dirty}
									>
										{__('Discard', 'spacery')}
									</Button>
								</FlexItem>
							</Flex>
						</CardBody>
					</Card>
				</div>
			</FlexItem>

			<FlexItem>
				<Footer />
			</FlexItem>
		</Flex>
	);
}

/**
 * The set actually in effect, drawn rather than listed.
 *
 * "Show the bands instead of describing them" — `docs/design/settings-screen.png`.
 * This card used to print `over 782px, up to 1024px` once per tier and leave
 * the reader to assemble a mental picture; the ruler makes the two facts that
 * matter visible at once, that the bands are disjoint and that nothing covers
 * screens wider than the widest one. The sentences did not disappear: they are
 * the ruler's accessible description.
 *
 * @param root0        Component props.
 * @param root0.info   What each source contains.
 * @param root0.source The stored choice, which is not always what is in effect.
 * @return The resolved set.
 */
function ResolvedSet({
	info,
	source,
}: {
	info: BreakpointInfo;
	source: StoredSource;
}): React.ReactElement {
	/*
	 * A chosen source can be empty — custom before the first row is added, or a
	 * theme that declares nothing — and the registry then falls through to the
	 * next one. Printing only the result leaves the author looking at a set
	 * that contradicts the choice above it, with nothing joining the two (E4).
	 */
	const fallback = fallbackNotice(source, info);

	if (0 === info.resolved.length) {
		return (
			<Text variant="muted">
				{__('No breakpoints are active.', 'spacery')}
			</Text>
		);
	}

	return (
		<Flex direction="column" gap={4}>
			{null !== fallback && (
				<FlexItem>
					{/*
					 * A caution, not a muted aside: the author chose one thing
					 * and is looking at another. Border, tint and text are the
					 * design system's caution triple — and the text is never
					 * the border colour, which fails contrast at this size.
					 */}
					<div
						style={{
							borderLeft: '4px solid #dba617',
							background: '#fcf9e8',
							padding: '12px 16px',
							color: '#8a6616',
						}}
					>
						<Text size={13}>{fallback}</Text>
					</div>
				</FlexItem>
			)}

			<FlexItem>
				<Ruler
					tiers={info.resolved}
					pixelsPerEm={info.rules.pixelsPerEm}
				/>
			</FlexItem>
		</Flex>
	);
}

/**
 * The notice for whatever just happened, if anything did.
 *
 * @param root0           Component props.
 * @param root0.status    Current status.
 * @param root0.onDismiss Called when the notice is dismissed.
 * @return A notice, or null.
 */
function StatusNotice({
	status,
	onDismiss,
}: {
	status: Status;
	onDismiss: () => void;
}): React.ReactElement | null {
	if ('saved' === status.kind) {
		return (
			<Notice status="success" onRemove={onDismiss}>
				{__('Settings saved.', 'spacery')}
			</Notice>
		);
	}

	/*
	 * The server refuses an invalid set whole and hands back the previous one,
	 * so this is not "something went wrong" — it is "nothing changed, and here
	 * is why". Saying so plainly beats a success notice over an unchanged set.
	 */
	if ('stale' === status.kind) {
		return (
			<Notice status="warning" onRemove={onDismiss}>
				{__(
					'Settings saved. Reload the page to see what is in use.',
					'spacery'
				)}
			</Notice>
		);
	}

	if ('rejected' === status.kind) {
		return (
			<Notice status="error" onRemove={onDismiss}>
				{status.sourceChanged
					? __(
							'Your source was saved. The breakpoints were not: each needs a name and a width in px, em or rem, and no two may share a width.',
							'spacery'
						)
					: __(
							'Nothing was saved: each breakpoint needs a name and a width in px, em or rem, and no two may share a width.',
							'spacery'
						)}
			</Notice>
		);
	}

	if ('error' === status.kind) {
		return (
			<Notice status="error" onRemove={onDismiss}>
				{status.message}
			</Notice>
		);
	}

	return null;
}

/**
 * A readable message from whatever the REST layer threw.
 *
 * @param error Anything.
 * @return A message for the author.
 */
function describe(error: unknown): string {
	if (
		'object' === typeof error &&
		null !== error &&
		'message' in error &&
		'string' === typeof (error as { message: unknown }).message
	) {
		return (error as { message: string }).message;
	}

	return __('Something went wrong talking to the site.', 'spacery');
}
