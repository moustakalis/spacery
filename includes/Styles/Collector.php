<?php
/**
 * Accumulates generated CSS for one request.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Styles;

defined( 'ABSPATH' ) || exit;

/**
 * Gathers every block's rules and emits them once.
 *
 * Keyed by the content-addressed class, so a page where two hundred blocks
 * share three spacing recipes stores three sets of rules rather than two
 * hundred. This is the whole reason the class is a hash of the spacing rather
 * than of the block: identical spacing is genuinely the same rule, and saying so
 * once is both smaller and easier to read in devtools.
 *
 * Contrast v1, which wrote a `<style>` element into every block's saved markup.
 *
 * Collected rules are also pushed into a named Style Engine store. Core's
 * `wp_enqueue_stored_styles()` iterates every store — "any other stores
 * registered by themes or otherwise" — and registers, inlines and enqueues each
 * one. Spacery therefore never decides *where* its CSS goes; core does, and gets
 * it right for both theme types. See the note on {@see Collector::CONTEXT}.
 */
final class Collector {

	/**
	 * Style Engine store name. Core prints this as `wp-style-engine-spacery`.
	 *
	 * Using the store rather than printing directly is what buys correct
	 * placement:
	 *
	 * - **Block themes** render the whole template into a variable *before*
	 *   `wp_head()` (see `template-canvas.php`: "This needs to run before <head>
	 *   so that blocks can add scripts and styles in wp_head()"). By the time
	 *   `wp_enqueue_stored_styles()` runs on `wp_enqueue_scripts`, every block
	 *   has rendered, so the CSS lands in the head.
	 * - **Classic themes** render during `the_content`, after the head is gone,
	 *   so core reads the store on `wp_footer`. Since WordPress 6.9,
	 *   `wp_hoist_late_printed_styles()` then output-buffers the template and
	 *   moves footer-printed styles into the head anyway.
	 *
	 * The second half only works for styles left in the footer *queue*: the
	 * hoist captures `wp_styles()->do_footer_items()`. Printing directly with
	 * `wp_print_styles()` marks the handle done before the capture runs, which
	 * strands the CSS in the footer — precisely the mistake this replaced.
	 */
	private const CONTEXT = 'spacery';

	/**
	 * Rules by class name.
	 *
	 * @var array<string, array<int, array<string, mixed>>>
	 */
	private array $rules = array();

	/**
	 * Records a block's styles. Repeat classes are stored once.
	 *
	 * @param GeneratedStyles $styles Generated styles.
	 */
	public function add( GeneratedStyles $styles ): void {
		if ( isset( $this->rules[ $styles->class_name ] ) ) {
			return;
		}

		$this->rules[ $styles->class_name ] = $styles->rules;

		/*
		 * Pushing to the store as each block renders, rather than flushing on a
		 * hook, means the rules are already there whenever core reads them --
		 * `wp_enqueue_scripts` for block themes, `wp_footer` for classic. The
		 * return value is the compiled CSS, which is discarded: core compiles
		 * from the store itself.
		 */
		wp_style_engine_get_stylesheet_from_css_rules(
			$styles->rules,
			array( 'context' => self::CONTEXT )
		);
	}

	/**
	 * Whether anything has been collected.
	 */
	public function is_empty(): bool {
		return array() === $this->rules;
	}

	/**
	 * How many distinct spacing recipes this request produced.
	 */
	public function count(): int {
		return count( $this->rules );
	}

	/**
	 * Compiles everything collected into one stylesheet.
	 *
	 * Not used to print anything — core does that from the store. This exists so
	 * tests can assert on the exact CSS, and so the shape is inspectable without
	 * a full WordPress request.
	 *
	 * Rules are emitted in insertion order, and within a block widest band
	 * first, so narrower bands win on equal specificity.
	 */
	public function to_css(): string {
		if ( $this->is_empty() ) {
			return '';
		}

		$flat = array();

		foreach ( $this->rules as $rules ) {
			foreach ( $rules as $rule ) {
				$flat[] = $rule;
			}
		}

		return wp_style_engine_get_stylesheet_from_css_rules( $flat );
	}

	/**
	 * Discards everything collected. For tests and long-running processes.
	 */
	public function reset(): void {
		$this->rules = array();
	}
}
