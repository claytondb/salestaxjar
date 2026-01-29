<?php
/**
 * Sails Tax Settings
 *
 * Handles the WooCommerce settings tab for Sails Tax.
 *
 * @package Sails_Tax
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Settings class
 */
class Sails_Tax_Settings {

    /**
     * Initialize settings
     */
    public static function init() {
        add_filter('woocommerce_settings_tabs_array', array(__CLASS__, 'add_settings_tab'), 50);
        add_action('woocommerce_settings_tabs_sails_tax', array(__CLASS__, 'render_settings_page'));
        add_action('woocommerce_update_options_sails_tax', array(__CLASS__, 'save_settings'));
        add_action('admin_enqueue_scripts', array(__CLASS__, 'enqueue_admin_scripts'));
        add_action('wp_ajax_sails_tax_verify_api_key', array(__CLASS__, 'ajax_verify_api_key'));
    }

    /**
     * Add settings tab to WooCommerce settings
     *
     * @param array $tabs Existing tabs
     * @return array Modified tabs
     */
    public static function add_settings_tab($tabs) {
        $tabs['sails_tax'] = __('Sails Tax', 'sails-tax');
        return $tabs;
    }

    /**
     * Render settings page
     */
    public static function render_settings_page() {
        woocommerce_admin_fields(self::get_settings());
    }

    /**
     * Save settings
     */
    public static function save_settings() {
        woocommerce_update_options(self::get_settings());
        
        // Verify API key on save
        $api_key = get_option('sails_tax_api_key', '');
        if (!empty($api_key)) {
            $result = Sails_Tax_API::verify_api_key($api_key);
            if (is_wp_error($result)) {
                WC_Admin_Settings::add_error(__('Warning: API key verification failed: ', 'sails-tax') . $result->get_error_message());
            }
        }
        
        // Clear tax rate cache
        delete_transient('sails_tax_rates_cache');
    }

    /**
     * Get settings fields
     *
     * @return array Settings fields
     */
    public static function get_settings() {
        $settings = array(
            // Section: General
            array(
                'title' => __('Sails Tax Settings', 'sails-tax'),
                'type' => 'title',
                'desc' => sprintf(
                    __('Configure your Sails Tax integration. Need an API key? <a href="%s" target="_blank">Sign up at sails.tax</a>', 'sails-tax'),
                    'https://sails.tax/dashboard/api-keys'
                ),
                'id' => 'sails_tax_general_settings',
            ),
            
            // Enable/Disable
            array(
                'title' => __('Enable Sails Tax', 'sails-tax'),
                'desc' => __('Enable automatic sales tax calculation', 'sails-tax'),
                'id' => 'sails_tax_enabled',
                'type' => 'checkbox',
                'default' => 'no',
            ),
            
            // API Key
            array(
                'title' => __('API Key', 'sails-tax'),
                'desc' => __('Enter your Sails Tax API key. Starts with "stax_"', 'sails-tax'),
                'id' => 'sails_tax_api_key',
                'type' => 'password',
                'default' => '',
                'css' => 'min-width: 400px;',
                'custom_attributes' => array(
                    'autocomplete' => 'new-password',
                ),
            ),
            
            // Connection Status
            array(
                'title' => __('Connection Status', 'sails-tax'),
                'type' => 'sails_tax_connection_status',
                'id' => 'sails_tax_connection_status',
            ),
            
            array(
                'type' => 'sectionend',
                'id' => 'sails_tax_general_settings',
            ),
            
            // Section: Ship From Address
            array(
                'title' => __('Ship From Address', 'sails-tax'),
                'type' => 'title',
                'desc' => __('Your business address used for tax calculations in origin-based states.', 'sails-tax'),
                'id' => 'sails_tax_from_address',
            ),
            
            array(
                'title' => __('State', 'sails-tax'),
                'id' => 'sails_tax_from_state',
                'type' => 'select',
                'options' => self::get_us_states(),
                'default' => '',
                'desc' => __('Select your business state', 'sails-tax'),
            ),
            
            array(
                'title' => __('City', 'sails-tax'),
                'id' => 'sails_tax_from_city',
                'type' => 'text',
                'default' => '',
                'css' => 'min-width: 300px;',
            ),
            
            array(
                'title' => __('ZIP Code', 'sails-tax'),
                'id' => 'sails_tax_from_zip',
                'type' => 'text',
                'default' => '',
                'css' => 'min-width: 150px;',
            ),
            
            array(
                'type' => 'sectionend',
                'id' => 'sails_tax_from_address',
            ),
            
            // Section: Advanced
            array(
                'title' => __('Advanced Settings', 'sails-tax'),
                'type' => 'title',
                'id' => 'sails_tax_advanced_settings',
            ),
            
            array(
                'title' => __('Debug Mode', 'sails-tax'),
                'desc' => __('Enable debug logging (logs will appear in WooCommerce > Status > Logs)', 'sails-tax'),
                'id' => 'sails_tax_debug_mode',
                'type' => 'checkbox',
                'default' => 'no',
            ),
            
            array(
                'type' => 'sectionend',
                'id' => 'sails_tax_advanced_settings',
            ),
        );
        
        return apply_filters('sails_tax_settings', $settings);
    }

    /**
     * Get US states for dropdown
     *
     * @return array States
     */
    public static function get_us_states() {
        return array(
            '' => __('Select a state...', 'sails-tax'),
            'AL' => 'Alabama', 'AK' => 'Alaska', 'AZ' => 'Arizona', 'AR' => 'Arkansas',
            'CA' => 'California', 'CO' => 'Colorado', 'CT' => 'Connecticut', 'DE' => 'Delaware',
            'FL' => 'Florida', 'GA' => 'Georgia', 'HI' => 'Hawaii', 'ID' => 'Idaho',
            'IL' => 'Illinois', 'IN' => 'Indiana', 'IA' => 'Iowa', 'KS' => 'Kansas',
            'KY' => 'Kentucky', 'LA' => 'Louisiana', 'ME' => 'Maine', 'MD' => 'Maryland',
            'MA' => 'Massachusetts', 'MI' => 'Michigan', 'MN' => 'Minnesota', 'MS' => 'Mississippi',
            'MO' => 'Missouri', 'MT' => 'Montana', 'NE' => 'Nebraska', 'NV' => 'Nevada',
            'NH' => 'New Hampshire', 'NJ' => 'New Jersey', 'NM' => 'New Mexico', 'NY' => 'New York',
            'NC' => 'North Carolina', 'ND' => 'North Dakota', 'OH' => 'Ohio', 'OK' => 'Oklahoma',
            'OR' => 'Oregon', 'PA' => 'Pennsylvania', 'RI' => 'Rhode Island', 'SC' => 'South Carolina',
            'SD' => 'South Dakota', 'TN' => 'Tennessee', 'TX' => 'Texas', 'UT' => 'Utah',
            'VT' => 'Vermont', 'VA' => 'Virginia', 'WA' => 'Washington', 'WV' => 'West Virginia',
            'WI' => 'Wisconsin', 'WY' => 'Wyoming', 'DC' => 'District of Columbia',
        );
    }

    /**
     * Enqueue admin scripts
     *
     * @param string $hook Current admin page
     */
    public static function enqueue_admin_scripts($hook) {
        if ($hook !== 'woocommerce_page_wc-settings') {
            return;
        }
        
        if (!isset($_GET['tab']) || $_GET['tab'] !== 'sails_tax') {
            return;
        }
        
        wp_enqueue_script(
            'sails-tax-admin',
            SAILS_TAX_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            SAILS_TAX_VERSION,
            true
        );
        
        wp_localize_script('sails-tax-admin', 'sailsTaxAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sails_tax_admin'),
            'strings' => array(
                'verifying' => __('Verifying...', 'sails-tax'),
                'connected' => __('Connected', 'sails-tax'),
                'disconnected' => __('Not connected', 'sails-tax'),
                'error' => __('Error', 'sails-tax'),
            ),
        ));
        
        wp_enqueue_style(
            'sails-tax-admin',
            SAILS_TAX_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            SAILS_TAX_VERSION
        );
    }

    /**
     * AJAX handler for API key verification
     */
    public static function ajax_verify_api_key() {
        check_ajax_referer('sails_tax_admin', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Unauthorized'));
        }
        
        $api_key = isset($_POST['api_key']) ? sanitize_text_field($_POST['api_key']) : '';
        
        $result = Sails_Tax_API::verify_api_key($api_key);
        
        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        }
        
        wp_send_json_success(array('message' => __('API key is valid!', 'sails-tax')));
    }
}

/**
 * Custom settings field: Connection Status
 */
add_action('woocommerce_admin_field_sails_tax_connection_status', function($value) {
    $api_key = get_option('sails_tax_api_key', '');
    $enabled = get_option('sails_tax_enabled', 'no') === 'yes';
    
    ?>
    <tr valign="top">
        <th scope="row" class="titledesc">
            <label><?php esc_html_e('Connection Status', 'sails-tax'); ?></label>
        </th>
        <td class="forminp">
            <div id="sails-tax-connection-status">
                <?php if (empty($api_key)) : ?>
                    <span class="status-indicator status-disconnected">
                        <span class="dashicons dashicons-warning"></span>
                        <?php esc_html_e('No API key configured', 'sails-tax'); ?>
                    </span>
                <?php elseif (!$enabled) : ?>
                    <span class="status-indicator status-disabled">
                        <span class="dashicons dashicons-minus"></span>
                        <?php esc_html_e('Tax calculation disabled', 'sails-tax'); ?>
                    </span>
                <?php else : ?>
                    <span class="status-indicator status-connected">
                        <span class="dashicons dashicons-yes-alt"></span>
                        <?php esc_html_e('Connected and active', 'sails-tax'); ?>
                    </span>
                <?php endif; ?>
                
                <?php if (!empty($api_key)) : ?>
                    <button type="button" class="button" id="sails-tax-verify-btn">
                        <?php esc_html_e('Verify Connection', 'sails-tax'); ?>
                    </button>
                <?php endif; ?>
            </div>
        </td>
    </tr>
    <?php
});
