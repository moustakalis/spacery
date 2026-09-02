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

import { BreakpointRows } from './BreakpointRows';
import { fetchInfo, fetchSettings, saveSettings, wasAccepted } from './data';
import type {
	Breakpoint,
	BreakpointInfo,
	StoredSettings,
	StoredSource,
} from './types';

type Status =
	| { kind: 'idle' }
	| { kind: 'saving' }
	| { kind: 'saved' }
	| { kind: 'rejected' }
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
	const [status, setStatus] = useState<Status>({ kind: 'idle' });

	useEffect(() => {
		let cancelled = false;

		Promise.all([fetchSettings(), fetchInfo()])
			.then(([stored, breakpoints]) => {
				if (!cancelled) {
					setSettings(stored);
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

	const source = settings.spacery_breakpoint_source;
	const rows = settings.spacery_custom_breakpoints;

	const save = async () => {
		setStatus({ kind: 'saving' });

		try {
			const stored = await saveSettings(settings);

			setSettings(stored);
			setInfo(await fetchInfo());
			setStatus({
				kind: wasAccepted(rows, stored.spacery_custom_breakpoints)
					? 'saved'
					: 'rejected',
			});
		} catch (error: unknown) {
			setStatus({ kind: 'error', message: describe(error) });
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
							selected={source}
							options={sourceOptions(info)}
							onChange={(next: string) =>
								setSettings({
									...settings,
									spacery_breakpoint_source:
										next as StoredSource,
								})
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
								max={info.maxBreakpoints}
								onChange={(next: Breakpoint[]) =>
									setSettings({
										...settings,
										spacery_custom_breakpoints: next,
									})
								}
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
					disabled={'saving' === status.kind}
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
				__('Decide for me (currently %s)', 'spacery'),
				info.defaultSource
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
						/* translators: %s: the source in use, e.g. "theme". */
						__('Source: %s', 'spacery'),
						info.effectiveSource
					)}
				</Text>
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
 * The range a tier covers, in the same shape the generated CSS uses.
 *
 * Mirrors `BreakpointSet::media_queries()`. It is a description for humans, not
 * the CSS itself — the server remains the only thing that generates a query.
 *
 * @param tiers The resolved set, widest first.
 * @param index Which tier to describe.
 * @return A human-readable range.
 */
function band(tiers: Breakpoint[], index: number): string {
	const tier = tiers[index]!;
	const narrower = tiers[index + 1];

	if (!narrower) {
		return sprintf(
			/* translators: %s: a CSS length, e.g. "480px". */
			__('up to %s', 'spacery'),
			tier.max
		);
	}

	return sprintf(
		/* translators: 1: a CSS length. 2: a wider CSS length. */
		__('over %1$s, up to %2$s', 'spacery'),
		narrower.max,
		tier.max
	);
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
	if ('rejected' === status.kind) {
		return (
			<Notice status="error" onRemove={onDismiss}>
				{__(
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
