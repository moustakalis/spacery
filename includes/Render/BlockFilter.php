<?php
/**
 * Applies generated spacing to blocks on the front end.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Render;

use Spacery\Blocks\Supported;
use Spacery\Styles\Collector;
use Spacery\Styles\GeneratedStyles;
use Spacery\Styles\Generator;
use WP_HTML_Tag_Processor;

defined( 'ABSPATH' ) || exit;

/**
 * Adds Spacery's class to rendered blocks and prints the stylesheet.
 *
 * Nothing here touches saved markup. The `spacery` attribute lives in the block
 * comment delimiter and is read at render time, so deactivating the plugin
 * leaves every post valid — the attribute simply stops being interpreted. This
 * is the structural fix for v1, which serialized a `<style>` element into
 * `save()` and could therefore never change its output without invalidating
 * every existing block.
 */
final class BlockFilter {

	/**
	 * Constructor.
	 *
	 * @param Generator $generator Style generator.
	 * @param Collector $collector Style collector.
	 * @param Supported $supported Block deny-list.
	 */
	public function __construct(
		private readonly Generator $generator,
		private readonly Collector $collector,
		private readonly Supported $supported
	) {}

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		add_filter( 'render_block', array( $this, 'filter_block' ), 10, 2 );
	}

	/**
	 * Adds the generated class to a block's wrapper.
	 *
	 * @param string       $content Rendered block HTML.
	 * @param array<mixed> $block   Parsed block.
	 * @return string
	 */
	public function filter_block( string $content, array $block ): string {
		$attribute = $block['attrs']['spacery'] ?? null;

		if ( null === $attribute || '' === trim( $content ) ) {
			return $content;
		}

		/*
		 * A denied block keeps whatever attribute it was saved with -- removing
		 * it would edit the author's content -- but stops being styled. That
		 * makes denying a block reversible: re-allow it and the spacing comes
		 * back exactly as it was.
		 */
		$name = $block['blockName'] ?? '';

		if ( ! is_string( $name ) || ! $this->supported->renders( $name ) ) {
			return $content;
		}

		$styles = $this->generator->generate( $attribute );

		if ( ! $styles instanceof GeneratedStyles ) {
			return $content;
		}

		$processor = new WP_HTML_Tag_Processor( $content );

		if ( ! $processor->next_tag() ) {
			return $content;
		}

		/*
		 * add_class() rather than rewriting the class attribute: the wrapper
		 * already carries core's block-support classes, and rebuilding the tag
		 * would risk dropping them or reordering attributes for no gain.
		 */
		$processor->add_class( $styles->class_name );

		$this->collector->add( $styles );

		return $processor->get_updated_html();
	}
}
