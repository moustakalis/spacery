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
 */
final class Collector {

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
	 * Rules are emitted in insertion order, and within a block widest band
	 * first, so narrower bands win on equal specificity. Because this is a
	 * single generated stylesheet, that ordering is guaranteed rather than
	 * dependent on where blocks happen to sit in the content.
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
