<?php
/**
 * Sails Tax Calculator
 *
 * Hooks into WooCommerce to calculate taxes via Sails Tax API.
 *
 * @package Sails_Tax
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Calculator class
 */
class Sails_Tax_Calculator {

    /**
     * Initialize calculator hooks
     */
    public static function init() {
        // Only hook if enabled
        if (get_option('sails_tax_enabled', 'no') !== 'yes') {
            return;
        }
        
        if (empty(get_option('sails_tax_api_key', ''))) {
            return;
        }
        
        // Hook into WooCommerce tax calculation
        add_action('woocommerce_after_calculate_totals', array(__CLASS__, 'calculate_cart_tax'), 99);
        
        // Hook into order tax calculation (for admin orders)
        add_action('woocommerce_order_after_calculate_totals', array(__CLASS__, 'calculate_order_tax'), 99, 2);
        
        // Filter to override tax rates
        add_filter('woocommerce_find_rates', array(__CLASS__, 'override_tax_rates'), 99, 2);
    }

    /**
     * Calculate tax for cart
     *
     * @param WC_Cart $cart Cart object
     */
    public static function calculate_cart_tax($cart) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        // Get customer shipping address
        $customer = WC()->customer;
        if (!$customer) {
            return;
        }
        
        $to_state = $customer->get_shipping_state();
        $to_zip = $customer->get_shipping_postcode();
        $to_city = $customer->get_shipping_city();
        $to_country = $customer->get_shipping_country();
        
        // Only calculate for US addresses
        if ($to_country !== 'US' || empty($to_state)) {
            return;
        }
        
        // Calculate cart totals
        $subtotal = 0;
        $line_items = array();
        
        foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
            $product = $cart_item['data'];
            $quantity = $cart_item['quantity'];
            $price = $product->get_price();
            $line_total = $price * $quantity;
            $subtotal += $line_total;
            
            // Get product tax class/code
            $tax_class = $product->get_tax_class();
            $product_tax_code = self::map_tax_class_to_code($tax_class);
            
            $line_items[] = array(
                'id' => $cart_item_key,
                'quantity' => $quantity,
                'unit_price' => floatval($price),
                'product_tax_code' => $product_tax_code,
            );
        }
        
        // Get shipping total
        $shipping = floatval($cart->get_shipping_total());
        
        // Build API request
        $args = array(
            'amount' => $subtotal,
            'shipping' => $shipping,
            'to_state' => $to_state,
            'to_zip' => $to_zip,
            'to_city' => $to_city,
            'to_country' => $to_country,
            'line_items' => $line_items,
        );
        
        // Add from address if configured
        $from_state = get_option('sails_tax_from_state', '');
        if (!empty($from_state)) {
            $args['from_state'] = $from_state;
            $args['from_zip'] = get_option('sails_tax_from_zip', '');
            $args['from_city'] = get_option('sails_tax_from_city', '');
        }
        
        // Call API
        $result = Sails_Tax_API::calculate_tax($args);
        
        if (is_wp_error($result)) {
            Sails_Tax_API::log('Cart tax calculation failed: ' . $result->get_error_message());
            return;
        }
        
        if (!isset($result['tax']['amount_to_collect'])) {
            Sails_Tax_API::log('Invalid API response: ' . wp_json_encode($result));
            return;
        }
        
        // Store the calculated rate for use in woocommerce_find_rates filter
        $rate = floatval($result['tax']['rate']);
        WC()->session->set('sails_tax_rate', $rate);
        WC()->session->set('sails_tax_amount', floatval($result['tax']['amount_to_collect']));
        
        Sails_Tax_API::log('Cart tax calculated: rate=' . $rate . ', amount=' . $result['tax']['amount_to_collect']);
    }

    /**
     * Calculate tax for an order (admin)
     *
     * @param bool $and_taxes Whether to calculate taxes
     * @param WC_Order $order Order object
     */
    public static function calculate_order_tax($and_taxes, $order) {
        if (!$and_taxes) {
            return;
        }
        
        $to_state = $order->get_shipping_state();
        $to_zip = $order->get_shipping_postcode();
        $to_city = $order->get_shipping_city();
        $to_country = $order->get_shipping_country();
        
        // Only calculate for US addresses
        if ($to_country !== 'US' || empty($to_state)) {
            return;
        }
        
        // Calculate order subtotal
        $subtotal = 0;
        foreach ($order->get_items() as $item) {
            $subtotal += floatval($item->get_subtotal());
        }
        
        $shipping = floatval($order->get_shipping_total());
        
        // Build API request
        $args = array(
            'amount' => $subtotal,
            'shipping' => $shipping,
            'to_state' => $to_state,
            'to_zip' => $to_zip,
            'to_city' => $to_city,
            'to_country' => $to_country,
        );
        
        // Add from address if configured
        $from_state = get_option('sails_tax_from_state', '');
        if (!empty($from_state)) {
            $args['from_state'] = $from_state;
            $args['from_zip'] = get_option('sails_tax_from_zip', '');
            $args['from_city'] = get_option('sails_tax_from_city', '');
        }
        
        // Call API
        $result = Sails_Tax_API::calculate_tax($args);
        
        if (is_wp_error($result) || !isset($result['tax']['amount_to_collect'])) {
            return;
        }
        
        // Apply tax to order
        $tax_amount = floatval($result['tax']['amount_to_collect']);
        $rate_label = sprintf('%s Sales Tax', $to_state);
        
        // Remove existing taxes
        $order->remove_order_items('tax');
        
        // Add new tax
        $item = new WC_Order_Item_Tax();
        $item->set_rate_id(999999999); // Dynamic rate ID
        $item->set_label($rate_label);
        $item->set_tax_total($tax_amount);
        $item->set_shipping_tax_total(0);
        $item->set_rate_percent(floatval($result['tax']['rate']) * 100);
        
        $order->add_item($item);
        $order->set_cart_tax($tax_amount);
        
        Sails_Tax_API::log('Order tax calculated: ' . $tax_amount);
    }

    /**
     * Override WooCommerce tax rates with Sails Tax rates
     *
     * @param array $matched_rates Matched tax rates
     * @param array $args Rate lookup arguments
     * @return array Modified rates
     */
    public static function override_tax_rates($matched_rates, $args) {
        // Only override for US addresses
        if (!isset($args['country']) || $args['country'] !== 'US') {
            return $matched_rates;
        }
        
        // Get stored rate from session
        $rate = WC()->session ? WC()->session->get('sails_tax_rate') : null;
        
        if ($rate === null) {
            return $matched_rates;
        }
        
        $state = isset($args['state']) ? $args['state'] : '';
        $rate_label = !empty($state) ? sprintf('%s Sales Tax', $state) : 'Sales Tax';
        
        // Return our calculated rate
        return array(
            999999999 => array(
                'rate' => $rate * 100, // WooCommerce expects percentage
                'label' => $rate_label,
                'shipping' => 'yes',
                'compound' => 'no',
            ),
        );
    }

    /**
     * Map WooCommerce tax class to Sails Tax product tax code
     *
     * @param string $tax_class WooCommerce tax class
     * @return string|null Product tax code
     */
    private static function map_tax_class_to_code($tax_class) {
        // Extract code from tax class name (e.g., "Clothing - 20010" -> "20010")
        if (preg_match('/\-\s*(\d+)$/', $tax_class, $matches)) {
            return $matches[1];
        }
        
        // Common mappings
        $mappings = array(
            'clothing' => '20010',
            'food' => '40030',
            'grocery' => '40030',
            'digital' => '31000',
            'software' => '30070',
        );
        
        $tax_class_lower = strtolower($tax_class);
        if (isset($mappings[$tax_class_lower])) {
            return $mappings[$tax_class_lower];
        }
        
        return null; // Default/general category
    }
}
