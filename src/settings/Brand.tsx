/**
 * Spacery's mark, and the two places the settings screen wears it.
 *
 * Twice per screen, both at interface scale (design system §5.5). The header
 * tile is the page's only dark surface, which is the ground the accent was
 * drawn for; the footer is one flat tone, because at 18px a second value reads
 * as blur rather than depth. Nothing else on the screen is branded, and nothing
 * on a screen Spacery does not own is branded at all.
 */

import {
	Flex,
	FlexItem,
	__experimentalHeading as Heading,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import { getScreenData } from './screen';

/**
 * The mark's six bars on its own 77-unit grid (design system §6).
 *
 * The three accent bars are one side repeated at 8 / 6 / 4 thickness: the
 * spacing value thinning toward mobile, which is the argument the mark makes.
 * The count never changes — a logo that drops a bar at small sizes stops being
 * one logo — so the box size is what gets adjusted, never the geometry.
 */
const BARS = [
	{ x: 18, y: 0, width: 41, height: 8, rx: 4, accent: true },
	{ x: 18, y: 19, width: 41, height: 6, rx: 3, accent: true },
	{ x: 18, y: 36, width: 41, height: 4, rx: 2, accent: true },
	{ x: 18, y: 69, width: 41, height: 8, rx: 4, accent: false },
	{ x: 0, y: 18, width: 8, height: 41, rx: 4, accent: false },
	{ x: 69, y: 18, width: 8, height: 41, rx: 4, accent: false },
];

/**
 * The mark, drawn from `docs/brand/mark.svg`'s geometry.
 *
 * Always `aria-hidden`: it sits beside the word Spacery in both placements, so
 * announcing it would read the plugin's name twice.
 *
 * @param root0        Component props.
 * @param root0.size   Box size in pixels.
 * @param root0.accent Colour for the three graduated bars.
 * @param root0.frame  Colour for the other three sides.
 * @return The mark.
 */
export function Mark({
	size,
	accent,
	frame,
}: {
	size: number;
	accent: string;
	frame: string;
}): React.ReactElement {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 77 77"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			{BARS.map((bar) => (
				<rect
					key={`${bar.x}-${bar.y}`}
					x={bar.x}
					y={bar.y}
					width={bar.width}
					height={bar.height}
					rx={bar.rx}
					fill={bar.accent ? accent : frame}
				/>
			))}
		</svg>
	);
}

/**
 * The page heading: mark, name, version.
 *
 * Rendered by the loading state as well as the loaded screen, so the page has a
 * heading before the two REST requests answer (S6). It reads the version from
 * the published global and simply omits the tag if that is missing, rather than
 * showing an empty box.
 *
 * @return The masthead.
 */
export function Masthead(): React.ReactElement {
	const { version } = getScreenData();

	return (
		<Flex justify="flex-start" align="center" gap={3}>
			<FlexItem>
				<div
					style={{
						width: '32px',
						height: '32px',
						borderRadius: '7px',
						background:
							'linear-gradient(180deg, #201E3E 0%, #141327 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Mark size={20} accent="#8B7CFF" frame="#ffffff" />
				</div>
			</FlexItem>

			<FlexItem>
				<Heading level={1}>{__('Spacery', 'spacery')}</Heading>
			</FlexItem>

			{'' !== version && (
				<FlexItem>
					<div
						style={{
							border: '1px solid #d8d8d8',
							borderRadius: '2px',
							padding: '2px 6px',
						}}
					>
						{/*
						 * The number alone, as the drawing has it. A screen
						 * reader reads it straight after the h1, so it comes
						 * out as "Spacery 1.0.0" -- which is what the footer
						 * says too, and what a version tag beside a name
						 * means anywhere.
						 */}
						<Text variant="muted" size={12}>
							{version}
						</Text>
					</div>
				</FlexItem>
			)}
		</Flex>
	);
}

/**
 * The footer: the mark again, the version, and where to go next.
 *
 * The links are ordinary same-tab anchors. `ExternalLink` would be the WordPress
 * component for this, but `@wordpress/components` is a script external here and
 * `src/types/wordpress.d.ts` is hand-written, so using it would mean declaring a
 * component nobody can check against the package — for two links that need
 * nothing but an href.
 *
 * @return The footer, or nothing when there is neither a version nor a link.
 */
export function Footer(): React.ReactElement | null {
	const { version, docsUrl, supportUrl } = getScreenData();

	if ('' === version && '' === docsUrl && '' === supportUrl) {
		return null;
	}

	return (
		<div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '16px' }}>
			{/* Signature left, where to go next right. */}
			<Flex justify="space-between" align="center">
				<FlexItem>
					<Flex align="center" gap={2}>
						<FlexItem>
							<Mark size={18} accent="#646464" frame="#646464" />
						</FlexItem>

						{'' !== version && (
							<FlexItem>
								<Text variant="muted" size={12}>
									{sprintf(
										/* translators: %s: the plugin version. */
										__('Spacery %s', 'spacery'),
										version
									)}
								</Text>
							</FlexItem>
						)}
					</Flex>
				</FlexItem>

				<FlexItem>
					<Flex align="center" gap={4}>
						{'' !== docsUrl && (
							<FlexItem>
								<a href={docsUrl}>
									{__('Documentation', 'spacery')}
								</a>
							</FlexItem>
						)}

						{'' !== supportUrl && (
							<FlexItem>
								<a href={supportUrl}>
									{__('Support', 'spacery')}
								</a>
							</FlexItem>
						)}
					</Flex>
				</FlexItem>
			</Flex>
		</div>
	);
}
