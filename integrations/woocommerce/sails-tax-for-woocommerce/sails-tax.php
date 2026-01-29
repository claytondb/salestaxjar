<?php
/**
 * Plugin Name: Sails Tax for WooCommerce
 * Plugin URI: https://sails.tax/integrations/woocommerce
 * Description: Automatic sales tax calculation for WooCommerce powered by Sails Tax. Accurate rates for all US states, counties, and cities.
 * Version: 1.0.0
 * Author: Sails Tax
 * Author URI: https://sails.tax
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: sails-tax
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.5
 *
 * @package Sails_Tax
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('SAILS_TAX_VERSION', '1.0.0');
define('SAILS_TAX_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SAILS_TAX_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SAILS_TAX_API_URL', 'https://sails.tax/api/v1');

/**
 * Check if WooCommerce is active
 */
function sails_tax_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            echo '<div class="error"><p>';
            echo '<strong>Sails Tax for WooCommerce</strong> requires WooCommerce to be installed and activated.';
            echo '</p></div>';
        });
        return false;
    }
    return true;
}

/**
 * Initialize the plugin
 */
function sails_tax_init() {
    if (!sails_tax_check_woocommerce()) {
        return;
    }
    
    // Load classes
    require_once SAILS_TAX_PLUGIN_DIR . 'includes/class-sails-tax-api.php';
    require_once SAILS_TAX_PLUGIN_DIR . 'includes/class-sails-tax-settings.php';
    require_once SAILS_TAX_PLUGIN_DIR . 'includes/class-sails-tax-calculator.php';
    
    // Initialize components
    Sails_Tax_Settings::init();
    Sails_Tax_Calculator::init();
}
add_action('plugins_loaded', 'sails_tax_init');

/**
 * Plugin activation
 */
function sails_tax_activate() {
    // Set default options
    add_option('sails_tax_enabled', 'no');
    add_option('sails_tax_api_key', '');
    add_option('sails_tax_debug_mode', 'no');
    add_option('sails_tax_nexus_states', array());
    
    // Clear any cached tax rates
    delete_transient('sails_tax_rates_cache');
}
register_activation_hook(__FILE__, 'sails_tax_activate');

/**
 * Plugin deactivation
 */
function sails_tax_deactivate() {
    // Clear cached data
    delete_transient('sails_tax_rates_cache');
}
register_deactivation_hook(__FILE__, 'sails_tax_deactivate');

/**
 * Add settings link to plugins page
 */
function sails_tax_settings_link($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=wc-settings&tab=sails_tax') . '">Settings</a>';
    array_unshift($links, $settings_link);
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'sails_tax_settings_link');

/**
 * Declare HPOS compatibility
 */
add_action('before_woocommerce_init', function() {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});
