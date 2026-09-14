<?php
/**
 * Editor settings payload tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Blocks\Supported;
use Spacery\Breakpoints\Registry;
use Spacery\Editor\Settings;

/**
 * What the editor is actually told.
 *
 * The regression these defend is an ordering one, and it was invisible to every
 * other kind of test. `responsiveEditingEnabled` is core's value, readable only
 * from `block_editor_settings_all`; the payload used to be encoded on
 * `enqueue_block_editor_assets`, one hook earlier. Measured on WordPress 7.1,
 * the asset hook fires **first**, so the flag was serialized while it still
 * held its initialised `true` and a site that had switched responsive editing
 * off was published to the editor as having it on — disabling the one fallback
 * D12 exists for. The correct value sat in `$settings['spacery']`, which
 * JavaScript cannot read, and the stale one in the global, which it can.
 *
 * So these tests fire the hooks in the order WordPress really fires them.
 */
final class SettingsTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	/**
	 * The payload attached to the editor, decoded.
	 *
	 * @return array<string, mixed>
	 */
	private function payload(): array {
		$scripts = $GLOBALS['spacery_test_inline_scripts'];

		$this->assertNotEmpty( $scripts, 'Nothing was attached to any editor handle.' );

		$data = end( $scripts )['data'];

		$this->assertMatchesRegularExpression( '/^window\.spacerySettings = /', $data );

		$json = substr( $data, strlen( 'window.spacerySettings = ' ), -1 );

		return json_decode( $json, true );
	}

	/**
	 * Runs a request the way WordPress orders it: assets first, settings after.
	 *
	 * @param array<string, mixed> $settings Editor settings before filtering.
	 */
	private function run_request( array $settings ): void {
		( new Settings( new Registry(), new Supported() ) )->register();

		do_action( 'enqueue_block_editor_assets' );

		apply_filters( 'block_editor_settings_all', $settings );
	}

	/**
	 * The regression itself.
	 */
	public function test_payload_carries_a_responsive_editing_flag_switched_off_by_a_filter(): void {
		$this->run_request( array( 'responsiveEditingEnabled' => false ) );

		$this->assertFalse( $this->payload()['responsiveEditingEnabled'] );
	}

	public function test_payload_carries_the_flag_when_it_is_on(): void {
		$this->run_request( array( 'responsiveEditingEnabled' => true ) );

		$this->assertTrue( $this->payload()['responsiveEditingEnabled'] );
	}

	/**
	 * Absent is on. Core only sets the key when the mode exists, and Spacery
	 * must not read a missing key as "switched off".
	 */
	public function test_absent_flag_is_treated_as_on(): void {
		$this->run_request( array() );

		$this->assertTrue( $this->payload()['responsiveEditingEnabled'] );
	}

	/**
	 * Nothing may be attached before the flag can be read. This is the assertion
	 * that fails against the old arrangement even if the payload later looks
	 * right, because attaching early is the defect rather than a symptom of it.
	 */
	public function test_nothing_is_attached_on_the_asset_hook_alone(): void {
		( new Settings( new Registry(), new Supported() ) )->register();

		do_action( 'enqueue_block_editor_assets' );

		$this->assertSame(
			array(),
			$GLOBALS['spacery_test_inline_scripts'],
			'The payload was encoded before core\'s settings filter had run.'
		);
	}

	/**
	 * The filter can be applied more than once in a request; the global must
	 * not be assigned twice per handle.
	 */
	public function test_the_payload_is_attached_once_per_request(): void {
		( new Settings( new Registry(), new Supported() ) )->register();

		do_action( 'enqueue_block_editor_assets' );

		apply_filters( 'block_editor_settings_all', array() );
		apply_filters( 'block_editor_settings_all', array() );

		$this->assertCount( 1, $GLOBALS['spacery_test_inline_scripts'] );
	}

	/**
	 * The server-side mirror keeps working. It is not what JavaScript reads,
	 * but it is where the value was correct all along, and a reader comparing
	 * the two is how the defect was finally understood.
	 */
	public function test_the_settings_array_still_mirrors_the_payload(): void {
		( new Settings( new Registry(), new Supported() ) )->register();

		do_action( 'enqueue_block_editor_assets' );

		$filtered = apply_filters(
			'block_editor_settings_all',
			array( 'responsiveEditingEnabled' => false )
		);

		$this->assertFalse( $filtered['spacery']['responsiveEditingEnabled'] );
	}
}
