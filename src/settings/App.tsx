/**
 * The Spacery settings screen.
 */

import {
	Button,
	Card,
	CardBody,
	CardHeader,
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

import { band } from './bands';
import { BreakpointRows } from './BreakpointRows';
import { Ruler } from './Ruler';
import { fetchInfo, fetchSettings, saveSettings, wasAccepted } from './data';
import { toBreakpoints, toRows, type Row } from './rows';
import { cautions, isValid, validate } from './validate';
import type {
	Breakpoint,
	BreakpointInfo,
	EffectiveSource,
	StoredSettings,
	StoredSource,
} from './types';

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
	const [status, setStatus] = useState<Status>({ kind: 'idle' });

	useEffect(() => {
		let cancelled = false;

		Promise.all([fetchSettings(), fetchInfo()])
			.then(([stored, breakpoints]) => {
				if (!cancelled) {
					setSettings(stored);
					setRows(toRows(stored.spacery_custom_breakpoints));
					setSource(stored.spacery_breakpoint_source);
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

	if ('error' === status.kind && null === settings) {
		return (
			<Notice status="error" isDismissible={false}>
				{status.message}
			</Notice>
		);
	}

	if (null === settings || null === info) {
		return <Spinner />;
	}

	/*
	 * Checked on every render rather than on submit, because the server refuses
	 * an invalid set whole: a rule caught only at save time reads as "nothing
	 * changed" when the author has been typing for a minute.
	 */
	const rules = { ...info.rules, maxBreakpoints: info.maxBreakpoints };
	const problems = validate(rows, rules);

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
			});
		} catch (error: unknown) {
			setStatus({ kind: 'error', message: describe(error) });
			return;
		}

		setSettings(stored);
		setRows(toRows(stored.spacery_custom_breakpoints));
		setSource(stored.spacery_breakpoint_source);

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
				<Heading level={1}>{__('Spacery', 'spacery')}</Heading>
				<Text variant="muted">
					{__(
						'Spacery adds responsive padding and margin to any block that supports spacing. These are the breakpoints it offers.',
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
						<Text variant="muted" size={12}>
							{__(
								'One source is used at a time. Spacery never mixes two sets: values from different intentions sitting side by side produce a set nobody designed.',
								'spacery'
							)}
						</Text>
					</CardBody>
				</Card>
			</FlexItem>

			{'custom' === source && (
				<FlexItem>
					<Card>
						<CardHeader>
							<Heading level={2}>
								{__('Your breakpoints', 'spacery')}
							</Heading>
						</CardHeader>
						<CardBody>
							<BreakpointRows
								rows={rows}
								problems={problems.rows}
								cautions={cautions(rows, rules)}
								max={info.maxBreakpoints}
								onChange={(next: Row[]) => setRows(next)}
							/>
						</CardBody>
					</Card>
				</FlexItem>
			)}

			<FlexItem>
				<Card>
					<CardHeader>
						<Heading level={2}>
							{__('In use now', 'spacery')}
						</Heading>
					</CardHeader>
					<CardBody>
						<ResolvedSet info={info} />
					</CardBody>
				</Card>
			</FlexItem>

			<FlexItem>
				<Button
					variant="primary"
					onClick={save}
					isBusy={'saving' === status.kind}
					disabled={'saving' === status.kind || !isValid(problems)}
				>
					{__('Save changes', 'spacery')}
				</Button>
			</FlexItem>
		</Flex>
	);
}

/**
 * The radio options, each saying what choosing it would get you.
 *
 * The theme entry names its breakpoints rather than saying "Theme", because
 * whether the theme has any is the fact the choice turns on.
 *
 * @param info What each source contains.
 * @return Options for RadioControl.
 */
function sourceOptions(
	info: BreakpointInfo
): Array<{ label: string; value: string }> {
	const themeLabel = info.theme
		? sprintf(
				/* translators: %s: comma-separated breakpoint names. */
				__('This theme — %s', 'spacery'),
				info.theme.map(describeTier).join(', ')
			)
		: __('This theme — it declares no breakpoints', 'spacery');

	return [
		{
			value: '',
			label: sprintf(
				/* translators: %s: the source that will be followed. */
				__('Decide for me — currently %s', 'spacery'),
				sourceName(info.defaultSource)
			),
		},
		{ value: 'theme', label: themeLabel },
		{
			value: 'spacery',
			label: sprintf(
				/* translators: %s: comma-separated breakpoint names. */
				__("Spacery's own — %s", 'spacery'),
				info.preset.map(describeTier).join(', ')
			),
		},
		{ value: 'custom', label: __('Breakpoints I define below', 'spacery') },
	];
}

/**
 * The set actually in effect, with the media query each tier will emit.
 *
 * Showing the query rather than only the boundary is what makes the disjoint
 * bands visible: a tier covers a range, and its lower edge is the next tier's
 * boundary rather than zero.
 *
 * @param root0      Component props.
 * @param root0.info What each source contains.
 * @return The resolved set.
 */
function ResolvedSet({ info }: { info: BreakpointInfo }): React.ReactElement {
	if (0 === info.resolved.length) {
		return (
			<Text variant="muted">
				{__('No breakpoints are active.', 'spacery')}
			</Text>
		);
	}

	return (
		<Flex direction="column" gap={2}>
			<FlexItem>
				<Text variant="muted" size={12}>
					{sprintf(
						/* translators: %s: where the breakpoints come from. */
						__('From: %s', 'spacery'),
						sourceName(info.effectiveSource)
					)}
				</Text>
			</FlexItem>
			<FlexItem>
				<Ruler
					tiers={info.resolved}
					pixelsPerEm={info.rules.pixelsPerEm}
				/>
			</FlexItem>

			{info.resolved.map((tier, index) => (
				<FlexItem key={tier.slug}>
					<Flex justify="space-between">
						<FlexItem>
							<Text>{tier.label}</Text>
						</FlexItem>
						<FlexItem>
							<Text variant="muted" size={12}>
								{band(info.resolved, index)}
							</Text>
						</FlexItem>
					</Flex>
				</FlexItem>
			))}
		</Flex>
	);
}

/**
 * A readable name for a source.
 *
 * The stored value is a slug, and a settings screen that prints `spacery` at
 * someone is showing them the database rather than an answer. Exhaustive over
 * `EffectiveSource` on purpose: adding a fourth source should fail the
 * typecheck here rather than quietly render its slug.
 *
 * @param source The source in effect.
 * @return A human-readable name.
 */
function sourceName(source: EffectiveSource): string {
	switch (source) {
		case 'theme':
			return __('your theme', 'spacery');
		case 'custom':
			return __('the breakpoints you defined', 'spacery');
		default:
			return __("Spacery's own set", 'spacery');
	}
}

/**
 * A tier as "Label (782px)".
 *
 * @param tier A breakpoint.
 * @return A short description.
 */
function describeTier(tier: Breakpoint): string {
	return `${tier.label} (${tier.max})`;
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
					'Settings saved. What is in use could not be read back — reload the page to see it.',
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
							'Your breakpoint source was saved. Those breakpoints were not: every breakpoint needs a name and a width in px, em or rem, and no two may share a width.',
							'spacery'
						)
					: __(
							'Those breakpoints were not saved, and nothing changed. Every breakpoint needs a name and a width in px, em or rem, and no two may share a width.',
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
