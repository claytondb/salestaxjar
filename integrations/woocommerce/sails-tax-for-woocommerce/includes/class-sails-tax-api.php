<?php
/**
 * Sails Tax API Client
 *
 * Handles communication with the Sails Tax API.
 *
 * @package Sails_Tax
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * API Client class
 */
class Sails_Tax_API {

    /**
     * API base URL
     *
     * @var string
     */
    private static $api_url = SAILS_TAX_API_URL;

    /**
     * Cache duration in seconds (5 minutes)
     *
     * @var int
     */
    const CACHE_DURATION = 300;

    /**
     * Calculate tax for a given order/cart
     *
     * @param array $args Tax calculation arguments
     * @return array|WP_Error Tax calculation result or error
     */
    public static function calculate_tax($args) {
        $api_key = get_option('sails_tax_api_key', '');
        
        if (empty($api_key)) {
            return new WP_Error('no_api_key', 'Sails Tax API key is not configured');
        }
        
        // Build request body
        $body = array(
            'amount' => floatval($args['amount']),
            'to_state' => sanitize_text_field($args['to_state']),
        );
        
        // Optional fields
        if (!empty($args['to_zip'])) {
            $body['to_zip'] = sanitize_text_field($args['to_zip']);
        }
        if (!empty($args['to_city'])) {
            $body['to_city'] = sanitize_text_field($args['to_city']);
        }
        if (!empty($args['to_country'])) {
            $body['to_country'] = sanitize_text_field($args['to_country']);
        }
        if (isset($args['shipping'])) {
            $body['shipping'] = floatval($args['shipping']);
        }
        if (!empty($args['from_state'])) {
            $body['from_state'] = sanitize_text_field($args['from_state']);
        }
        if (!empty($args['from_zip'])) {
            $body['from_zip'] = sanitize_text_field($args['from_zip']);
        }
        if (!empty($args['from_city'])) {
            $body['from_city'] = sanitize_text_field($args['from_city']);
        }
        if (!empty($args['product_tax_code'])) {
            $body['product_tax_code'] = sanitize_text_field($args['product_tax_code']);
        }
        if (!empty($args['line_items'])) {
            $body['line_items'] = $args['line_items'];
        }
        
        // Generate cache key
        $cache_key = 'sails_tax_' . md5(wp_json_encode($body));
        
        // Check cache first
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            self::log('Using cached tax calculation');
            return $cached;
        }
        
        // Make API request
        $response = wp_remote_post(
            self::$api_url . '/tax/calculate',
            array(
                'timeout' => 15,
                'headers' => array(
                    'Authorization' => 'Bearer ' . $api_key,
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'SailsTax-WooCommerce/' . SAILS_TAX_VERSION,
                ),
                'body' => wp_json_encode($body),
            )
        );
        
        // Check for errors
        if (is_wp_error($response)) {
            self::log('API request failed: ' . $response->get_error_message());
            return $response;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        $data = json_decode($response_body, true);
        
        if ($status_code !== 200) {
            $error_message = isset($data['error']) ? $data['error'] : 'Unknown error';
            self::log('API error (' . $status_code . '): ' . $error_message);
            return new WP_Error('api_error', $error_message);
        }
        
        // Cache successful response
        set_transient($cache_key, $data, self::CACHE_DURATION);
        
        self::log('Tax calculated: ' . wp_json_encode($data));
        
        return $data;
    }

    /**
     * Verify API key is valid
     *
     * @param string $api_key API key to verify
     * @return bool|WP_Error True if valid, WP_Error if not
     */
    public static function verify_api_key($api_key) {
        if (empty($api_key)) {
            return new WP_Error('empty_key', 'API key cannot be empty');
        }
        
        // Make a simple test calculation
        $response = wp_remote_post(
            self::$api_url . '/tax/calculate',
            array(
                'timeout' => 15,
                'headers' => array(
                    'Authorization' => 'Bearer ' . $api_key,
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'SailsTax-WooCommerce/' . SAILS_TAX_VERSION,
                ),
                'body' => wp_json_encode(array(
                    'amount' => 100,
                    'to_state' => 'CA',
                    'to_zip' => '90210',
                )),
            )
        );
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        
        if ($status_code === 401) {
            return new WP_Error('invalid_key', 'Invalid API key');
        }
        
        if ($status_code !== 200) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            $error = isset($body['error']) ? $body['error'] : 'API verification failed';
            return new WP_Error('api_error', $error);
        }
        
        return true;
    }

    /**
     * Log message if debug mode is enabled
     *
     * @param string $message Message to log
     */
    public static function log($message) {
        if (get_option('sails_tax_debug_mode', 'no') === 'yes') {
            if (function_exists('wc_get_logger')) {
                $logger = wc_get_logger();
                $logger->debug($message, array('source' => 'sails-tax'));
            } else {
                error_log('[Sails Tax] ' . $message);
            }
        }
    }
}
