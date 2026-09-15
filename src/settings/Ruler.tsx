/**
 * The breakpoint set, drawn to scale.
 *
 * The `Covers` column beside it already says what each tier covers, and says it
 * accessibly. What a column of ranges cannot show is proportion: that four
 * tiers crowd the narrow end and leave everything above the widest one to the
 * default, or that one of them is an order of magnitude wider than the rest.
 *
 * So the bar is one `role="img"` with an `aria-label` built by `described()`,
 * which says in a sentence what the drawing says in proportions; the axis
 * beneath it is `aria-hidden`, because a tick is a mark on that picture and not
 * a fact of its own. A picture that has to be described in full to be usable is
 * not earning its space -- but it still owes a screen reader the sentence.
 *
 * Built to `docs/design/admin-screen.png`, which is the drawing §5.1 of the
 * design system is the companion to. The first version of this component was
 * built from the prose alone and missed it in four ways, none of which could
 * fail a test: it painted `currentColor` at stepped opacities, so the
 * prescribed blue ramp rendered as grey; the steps ran light to dark rather
 * than dark to light; it was 10px tall with no labels; and it had no axis, so
 * nothing tied a band's edge to the width that ends it.
 */

import {
	Flex,
	FlexItem,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import {
	axisTicks,
	band,
	labelsFit,
	rampColor,
	ruler,
	type Segment,
} from './bands';
import { emphasise } from './emphasise';
import type { Breakpoint } from './types';

/**
 * Bar height.
 *
 * Below 40 the labels crowd; above 46 it stops reading as a scale and starts
 * reading as a chart, which would claim more attention than a derived value
 * deserves.
 */
const HEIGHT = 44;

/**
 * Diagonals for the region no tier claims.
 *
 * Light enough to read plain grey text over, because that region carries the
 * words `no tier` and they are the point of drawing it at all.
 */
const HATCH =
	'repeating-linear-gradient(45deg, #d8d8d8 0 1px, #ffffff 1px 5px)';

/**
 * A saw-toothed right edge, for a band running past the axis.
 *
 * §5.1 asks for a broken edge rather than hatching here, and the distinction
 * is the point: hatching means *nothing covers this*, so using it for a tier
 * that covers everything beyond the axis said the opposite of the truth.
 */
const TORN = [
	'0 0',
	'calc(100% - 7px) 0',
	'100% 12.5%',
	'calc(100% - 7px) 25%',
	'100% 37.5%',
	'calc(100% - 7px) 50%',
	'100% 62.5%',
	'calc(100% - 7px) 75%',
	'100% 87.5%',
	'calc(100% - 7px) 100%',
	'0 100%',
].join(', ');

/**
 * How one band is painted.
 *
 * @param segment The band.
 * @param index   Its position among the covered bands, narrowest first.
 * @param covered How many bands a tier actually covers.
 * @return Inline styles for the band.
 */
function paint(
	segment: Segment,
	index: number,
	covered: number
): React.CSSProperties {
	if ('default' === segment.key) {
		// Nothing claims this width, so nothing colours it.
		return { backgroundImage: HATCH };
	}

	const background = rampColor(index, covered);

	return segment.clipped
		? { background, clipPath: `polygon(${TORN})` }
		: { background };
}

/**
 * What a band says on itself.
 *
 * A clipped band carries its real width, because the drawing deliberately
 * stops short of it and the number is the only thing that says where it really
 * ends. Every other band is named by the list below, so the name is enough.
 *
 * @param segment The band.
 * @return A label.
 */
function caption(segment: Segment): string {
	return segment.clipped
		? sprintf(
				/* translators: 1: breakpoint name. 2: a CSS length. */
				__('%1$s to %2$s', 'spacery'),
				segment.label,
				segment.max
			)
		: segment.label;
}

/**
 * The bar as a sentence, for anyone who cannot see it.
 *
 * This used to be a list of tiers beside the drawing, and the design replaced
 * the list with the drawing — "show the bands instead of describing them". A
 * description is still owed to a screen reader, so it moves into the image's
 * own label rather than disappearing with the list.
 *
 * @param tiers The resolved set, widest first.
 * @return One sentence naming every tier and what it covers.
 */
function described(tiers: Breakpoint[]): string {
	return tiers
		.map((tier, index) =>
			sprintf(
				/* translators: 1: breakpoint name. 2: the range it covers. */
				__('%1$s, %2$s.', 'spacery'),
				tier.label,
				band(tiers, index)
			)
		)
		.join(' ');
}

/**
 * The ruler.
 *
 * @param root0             Component props.
 * @param root0.tiers       The resolved set, widest first.
 * @param root0.pixelsPerEm From the server's own constant.
 * @return The drawing, or nothing when there is no set to draw.
 */
export function Ruler({
	tiers,
	pixelsPerEm,
}: {
	tiers: Breakpoint[];
	pixelsPerEm: number;
}): React.ReactElement | null {
	const { segments, clamped } = ruler(tiers, pixelsPerEm);

	if (0 === segments.length) {
		return null;
	}

	const widest = tiers[0]!;
	const covered = segments.filter(
		(segment) => 'default' !== segment.key
	).length;
	const labelled = labelsFit(segments);
	const ticks = axisTicks(segments);

	return (
		<Flex direction="column" gap={3}>
			<FlexItem>
				{/*
				 * One image with a description, rather than a hidden list: the
				 * design replaced the list with the drawing, and a screen
				 * reader is still owed the same sentence.
				 */}
				<div
					role="img"
					aria-label={described(tiers)}
					style={{
						display: 'flex',
						height: `${HEIGHT}px`,
						borderRadius: '2px',
						overflow: 'hidden',
					}}
				>
					{segments.map((segment, index) => (
						<div
							key={segment.key}
							style={{
								width: `${segment.share}%`,
								display: 'flex',
								alignItems: 'center',
								overflow: 'hidden',
								whiteSpace: 'nowrap',
								padding: '0 8px',
								/*
								 * The separator is drawn *inside* the band,
								 * which is the whole point of `border-box`
								 * here. `gap: 2px` was the previous answer and
								 * its comment claimed a border "would add width
								 * to every band and lie about the
								 * proportions" -- the gap did exactly that.
								 * Four gaps made the row 100% + 8px, flex shrank
								 * every band to fit, and each boundary landed
								 * 1 to 3px left of the width it names.
								 * Measured before and after.
								 */
								borderRight:
									index === segments.length - 1
										? undefined
										: '2px solid #ffffff',
								boxSizing: 'border-box',
								fontSize: '12px',
								fontWeight: 600,
								/*
								 * White on the ramp, which is why nothing in it
								 * may be lighter than `#3858e9`. The uncovered
								 * band is hatched on the card's own white, so
								 * it takes the muted text colour instead.
								 */
								color:
									'default' === segment.key
										? '#646464'
										: '#ffffff',
								...paint(segment, index, covered),
							}}
						>
							{labelled && caption(segment)}
						</div>
					))}
				</div>

				{/*
				 * The axis. Absolutely positioned so each tick sits exactly
				 * over its boundary rather than wherever flex would put it.
				 */}
				<div
					aria-hidden="true"
					style={{ position: 'relative', height: '20px' }}
				>
					{ticks.map((tick) => (
						<div
							key={`${tick.at}-${tick.label}`}
							style={{
								position: 'absolute',
								left: `${tick.at}%`,
								top: 0,
								display: 'flex',
								flexDirection: 'column',
								/*
								 * **Zero width, so the mark lands on the
								 * boundary and the label centres under it.**
								 *
								 * This used to be a `translateX(-50%)` on the
								 * whole group with the mark at its left edge,
								 * which centres the *label* on the boundary and
								 * puts the **mark half a label-width early**.
								 * Measured: 16.8px at `480px`, 19.2px at
								 * `1280px` -- always exactly half that tick's
								 * label. The bar looked bigger than the number
								 * it was named by, which is how it was
								 * reported.
								 *
								 * A zero-width box cannot be moved by the
								 * length of its own text, so both children
								 * overflow it symmetrically and the 1px mark
								 * sits on the boundary.
								 */
								width: 0,
								alignItems:
									0 === tick.at ? 'flex-start' : 'center',
							}}
						>
							<div
								style={{
									width: '1px',
									height: '4px',
									background: '#949494',
								}}
							/>
							<span
								style={{
									fontSize: '11px',
									color: '#646464',
									marginTop: '2px',
									// The box is 0 wide, so the label has to be
									// told not to wrap into a column of glyphs.
									whiteSpace: 'nowrap',
								}}
							>
								{tick.label}
							</span>
						</div>
					))}
				</div>
			</FlexItem>

			<FlexItem>
				{/*
				 * A bordered note rather than a muted line, because it is the
				 * one thing on this card the author may need to act on: the
				 * region above the widest breakpoint is not a rounding error,
				 * it is every screen wider than the set covers.
				 */}
				<div
					style={{
						borderLeft: '4px solid #3858e9',
						background: '#f6f7f7',
						padding: '12px 16px',
					}}
				>
					{/*
					 * The band is full width; its sentence is not. Without this
					 * the note ran to 101 characters on one line -- it escaped
					 * §7's measure pass because `emphasise()` splits the string
					 * into several text nodes and the audit was reading whole
					 * ones. `textWrap` rides along for the same reason it does
					 * on the other three: the cap decides how wide a line may
					 * be, so it is also where the line division belongs.
					 */}
					<div style={{ maxWidth: '420px', textWrap: 'balance' }}>
						<Text size={13}>
							{clamped
								? emphasise(
										/* translators: %s: a CSS length, e.g. "11920px". */
										__(
											'The widest band runs to %s and is cut short here.',
											'spacery'
										),
										widest.max
									)
								: emphasise(
										/* translators: %s: a CSS length, e.g. "1280px". */
										__(
											'Screens wider than %s match no breakpoint, so blocks use their ordinary spacing. Raise the widest breakpoint to cover them.',
											'spacery'
										),
										widest.max
									)}
						</Text>
					</div>
				</div>
			</FlexItem>
		</Flex>
	);
}
