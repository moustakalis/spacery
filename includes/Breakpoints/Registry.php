<?php
/**
 * Resolves which breakpoint set is active.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Breakpoints;

defined( 'ABSPATH' ) || exit;

/**
 * The single source of truth for Spacery's breakpoints.
 *
 * One set is active at a time and the user chooses which. Sets are never
 * blended: mixing a theme's tiers with Spacery's would produce a set nobody
 * designed, with values from two different intentions sitting side by side.
 *
 * PHP resolves; JavaScript never recomputes. The editor receives the finished
 * set, so the preview and the generated CSS cannot disagree.
 */
final class Registry {

	public const SOURCE_THEME   = 'theme';
	public const SOURCE_SPACERY = 'spacery';
	public const SOURCE_CUSTOM  = 'custom';

	public const OPTION_SOURCE = 'spacery_breakpoint_source';
	public const OPTION_CUSTOM = 'spacery_custom_breakpoints';

	/**
	 * Spacery's own tiers.
	 *
	 * Anchored on WordPress rather than on a CSS framework: `tablet` and
	 * `mobile` are core's own values from `settings.viewport`, so moving a site
	 * from the theme source to this one adds tiers without shifting the
	 * boundaries it already had. Names describe devices rather than borrowing
	 * ascending abbreviations such as Tailwind's `lg`, which mean the opposite
	 * of what they would here.
	 *
	 * @var array<string, string>
	 */
	private const PRESET = array(
		'desktop' => '1280px',
		'laptop'  => '1024px',
		'tablet'  => '782px',
		'mobile'  => '480px',
	);

	/**
	 * Core's own `settings.viewport` defaults, for when theme.json yields none.
	 *
	 * WordPress 7.1 ships these in its own theme.json, so `theme_viewport()`
	 * normally finds them and this is never reached. It exists because the
	 * takeover flow needs to say "core's tablet is 782px" with certainty, and
	 * an absent answer there would silently turn every takeover offer off.
	 *
	 * @var array<string, string>
	 */
	private const CORE_DEFAULT_VIEWPORT = array(
		'tablet' => '782px',
		'mobile' => '480px',
	);

	/**
	 * Translated labels for tiers Spacery names itself.
	 *
	 * These are Spacery's own strings, so they belong in the POT file. Labels
	 * for tiers a theme invents cannot be — there is no source string a
	 * translator could have translated — and fall back to
	 * `BreakpointSet::machine_label()` instead.
	 *
	 * Built in a method rather than a constant because `__()` cannot run at
	 * constant-definition time, and because translations must not be requested
	 * before `init`. Nothing resolves the registry that early: `register()`
	 * only attaches hooks.
	 *
	 * @return array<string, string>
	 */
	private function labels(): array {
		return array(
			'desktop' => __( 'Desktop', 'spacery' ),
			'laptop'  => __( 'Laptop', 'spacery' ),
			'tablet'  => __( 'Tablet', 'spacery' ),
			'mobile'  => __( 'Mobile', 'spacery' ),
		);
	}

	/**
	 * Attaches a translated label to a tier when Spacery is the one naming it.
	 *
	 * @param array<string, string> $boundaries Slug => boundary.
	 * @return array<int, array{slug: string, label: string, max: string}>
	 */
	private function with_labels( array $boundaries ): array {
		$labels = $this->labels();
		$tiers  = array();

		foreach ( $boundaries as $slug => $max ) {
			$tier = array(
				'slug' => $slug,
				'max'  => $max,
			);

			if ( isset( $labels[ $slug ] ) ) {
				$tier['label'] = $labels[ $slug ];
			}

			$tiers[] = $tier;
		}

		return $tiers;
	}

	/**
	 * Resolved set for this request.
	 */
	private ?BreakpointSet $resolved = null;

	/**
	 * Merged theme.json settings for this request.
	 *
	 * @var array<mixed>|null
	 */
	private ?array $settings = null;

	/**
	 * Registers the hooks that keep the memo honest.
	 *
	 * Resolution is memoized per request, which is safe only while nothing
	 * changes underneath it. Saving the settings screen does exactly that, so
	 * both options invalidate the memo on write. Without this, a request that
	 * resolves, saves and then resolves again would serve the pre-save answer.
	 */
	public function register(): void {
		foreach ( array( self::OPTION_SOURCE, self::OPTION_CUSTOM ) as $option ) {
			add_action( "update_option_{$option}", array( $this, 'flush' ) );
			add_action( "add_option_{$option}", array( $this, 'flush' ) );
			add_action( "delete_option_{$option}", array( $this, 'flush' ) );
		}

		// A theme switch replaces theme.json, and with it the theme source.
		add_action( 'switch_theme', array( $this, 'flush' ) );
	}

	/**
	 * Discards the memoized set and settings.
	 *
	 * Cheap: the next resolve() rebuilds from options and theme.json, both of
	 * which core caches itself.
	 */
	public function flush(): void {
		$this->resolved = null;
		$this->settings = null;
	}

	/**
	 * The active set.
	 *
	 * Memoized per request, invalidated by {@see Registry::flush()}. Every path
	 * is total: an invalid theme or option falls back to the preset rather than
	 * failing.
	 */
	public function resolve(): BreakpointSet {
		if ( $this->resolved instanceof BreakpointSet ) {
			return $this->resolved;
		}

		$set = match ( $this->source() ) {
			self::SOURCE_CUSTOM  => $this->from_option(),
			self::SOURCE_SPACERY => null,
			default              => $this->from_theme(),
		};

		if ( ! $set instanceof BreakpointSet ) {
			$set = $this->preset();
		}

		/**
		 * Filters the active breakpoint set.
		 *
		 * Runs last, whichever source produced the set, so a developer always
		 * has the final word. Returning anything other than a BreakpointSet
		 * leaves the resolved set untouched.
		 *
		 * @since 0.1.0
		 *
		 * @param BreakpointSet $set    The resolved set.
		 * @param string        $source The source that produced it.
		 */
		$filtered = apply_filters( 'spacery_breakpoints', $set, $this->source() );

		$this->resolved = $filtered instanceof BreakpointSet ? $filtered : $set;

		return $this->resolved;
	}

	/**
	 * Which source is active.
	 *
	 * An unrecognized stored value is treated as unset rather than as an error,
	 * so a hand-edited option cannot break the editor.
	 */
	public function source(): string {
		$stored = get_option( self::OPTION_SOURCE, '' );

		if ( in_array( $stored, array( self::SOURCE_THEME, self::SOURCE_SPACERY, self::SOURCE_CUSTOM ), true ) ) {
			return $stored;
		}

		return $this->default_source();
	}

	/**
	 * The source used when the user has not chosen one.
	 *
	 * Defaults to the theme whenever the theme has an opinion, so a site agrees
	 * with core out of the box and never emits a second, conflicting set of
	 * breakpoints. Adopting Spacery's wider tiers stays a deliberate act.
	 */
	public function default_source(): string {
		return $this->theme_declares_breakpoints() ? self::SOURCE_THEME : self::SOURCE_SPACERY;
	}

	/**
	 * Whether the active theme declares breakpoints Spacery can read.
	 */
	public function theme_declares_breakpoints(): bool {
		return array() !== $this->theme_custom_breakpoints() || array() !== $this->theme_viewport();
	}

	/**
	 * Spacery's built-in set.
	 */
	public function preset(): BreakpointSet {
		$set = BreakpointSet::from_array( $this->with_labels( self::PRESET ) );

		if ( ! $set instanceof BreakpointSet ) {
			/*
			 * Deliberately fatal, and deliberately the only place in this class
			 * that is.
			 *
			 * Everywhere else handles bad data totally, because everywhere else
			 * the data is external: a theme.json someone else wrote, an option
			 * someone hand-edited. Falling back there is right, because the site
			 * is not at fault and should keep working.
			 *
			 * PRESET is internal. If it is invalid, Spacery has been edited
			 * wrongly, and every fallback would be a guess at what the developer
			 * meant while quietly serving the wrong breakpoints. A test asserts
			 * this branch is unreachable; if it ever runs, the loud failure is
			 * the useful behaviour.
			 */
			throw new \LogicException( 'Spacery: the built-in breakpoint preset is invalid.' );
		}

		return $set;
	}

	/**
	 * Core's own viewport tiers, whatever source Spacery is using.
	 *
	 * Not the same question as `resolve()`. When the site follows the theme
	 * these two agree, but under Spacery's preset or a custom set they need not,
	 * and the takeover flow has to be able to tell a Spacery tier that merely
	 * shares core's name from one that shares core's boundary. Moving a value
	 * between tiers with different bounds changes which widths it applies to,
	 * which is a change of meaning dressed up as a move.
	 *
	 * @return BreakpointSet|null Core's tiers, or null if even the fallback is
	 *                            unusable — which would mean this class is
	 *                            broken, not the site.
	 */
	public function core_viewports(): ?BreakpointSet {
		$viewport = $this->theme_viewport();

		if ( array() === $viewport ) {
			$viewport = self::CORE_DEFAULT_VIEWPORT;
		}

		return BreakpointSet::from_array( $this->with_labels( $viewport ) );
	}

	/**
	 * The theme's set, or null when it declares nothing usable.
	 *
	 * Public because the settings screen has to show what choosing "Theme"
	 * would actually get you. Reading it does not make it active.
	 */
	public function theme(): ?BreakpointSet {
		return $this->from_theme();
	}

	/**
	 * The theme's set, or null when it declares nothing usable.
	 *
	 * A theme speaking to Spacery directly wins over core's two viewport
	 * values, because it is the more specific statement of intent.
	 */
	private function from_theme(): ?BreakpointSet {
		$custom = $this->theme_custom_breakpoints();

		if ( array() !== $custom ) {
			return BreakpointSet::from_array( $custom );
		}

		$viewport = $this->theme_viewport();

		if ( array() === $viewport ) {
			return null;
		}

		return BreakpointSet::from_array( $this->with_labels( $viewport ) );
	}

	/**
	 * `settings.custom.spacery.breakpoints` from theme.json.
	 *
	 * @return array<mixed>
	 */
	private function theme_custom_breakpoints(): array {
		$value = $this->settings_at( array( 'custom', 'spacery', 'breakpoints' ) );

		return is_array( $value ) ? $value : array();
	}

	/**
	 * `settings.viewport` from theme.json, WordPress 7.1's own breakpoints.
	 *
	 * Read verbatim. Core's values are already upper bounds in Spacery's model,
	 * so there is nothing to convert; `mobile: 480px` is Spacery's mobile tier
	 * at 480px. Only keys core actually defines are taken, so a future core key
	 * cannot silently become a Spacery tier.
	 *
	 * @return array<string, string>
	 */
	private function theme_viewport(): array {
		$value = $this->settings_at( array( 'viewport' ) );

		if ( ! is_array( $value ) ) {
			return array();
		}

		$viewport = array();

		foreach ( array( 'tablet', 'mobile' ) as $slug ) {
			$max = $value[ $slug ] ?? null;

			if ( is_string( $max ) && Breakpoint::is_valid_length( $max ) ) {
				$viewport[ $slug ] = $max;
			}
		}

		return $viewport;
	}

	/**
	 * The user's own set from the settings screen, or null.
	 */
	private function from_option(): ?BreakpointSet {
		$stored = get_option( self::OPTION_CUSTOM, array() );

		if ( ! is_array( $stored ) || array() === $stored ) {
			return null;
		}

		return BreakpointSet::from_array( $stored );
	}

	/**
	 * Reads a path out of theme.json settings, or null when it is absent.
	 *
	 * Deliberately not `wp_get_global_settings( $path )`. That function ends
	 * with `_wp_array_get( $settings, $path, $settings )`, so a **missing path
	 * returns the entire settings tree** rather than null. Passing that to
	 * `is_array()` would report every site as declaring breakpoints. Walking the
	 * path here makes absence unambiguous.
	 *
	 * @param string[] $path Settings path, e.g. `array( 'custom', 'spacery' )`.
	 * @return mixed Value at the path, or null when any segment is missing.
	 */
	private function settings_at( array $path ): mixed {
		if ( null === $this->settings ) {
			$settings       = wp_get_global_settings();
			$this->settings = is_array( $settings ) ? $settings : array();
		}

		$node = $this->settings;

		foreach ( $path as $segment ) {
			if ( ! is_array( $node ) || ! array_key_exists( $segment, $node ) ) {
				return null;
			}

			$node = $node[ $segment ];
		}

		return $node;
	}
}
