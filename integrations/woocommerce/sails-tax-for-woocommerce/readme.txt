=== Sails Tax for WooCommerce ===
Contributors: sailstax
Tags: sales tax, tax calculation, woocommerce tax, tax automation, ecommerce
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
WC requires at least: 5.0
WC tested up to: 8.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Automatic sales tax calculation for WooCommerce. Accurate rates for all US states, counties, and cities.

== Description ==

**Sails Tax for WooCommerce** provides automatic, accurate sales tax calculation for your WooCommerce store. Stop worrying about complex tax rates and let Sails Tax handle it for you.

= Features =

* **Accurate Tax Rates** - Real-time tax rates for all 13,000+ US tax jurisdictions
* **County & City Level** - Not just state rates, but county, city, and special district rates
* **Product Tax Codes** - Support for different product categories (clothing, food, digital goods)
* **Origin-Based Calculation** - Proper handling for origin-based tax states
* **Smart Caching** - Minimizes API calls for faster checkout
* **Easy Setup** - Connect in minutes with just an API key
* **Debug Logging** - Troubleshoot issues with detailed logs

= Why Sails Tax? =

1. **Simple Pricing** - Transparent, affordable pricing with no hidden fees
2. **Accurate Rates** - County-level accuracy that other solutions miss
3. **Fast API** - Sub-second response times for seamless checkout
4. **Great Support** - Real humans ready to help

= How It Works =

1. Install and activate the plugin
2. Enter your Sails Tax API key
3. Configure your business address
4. Enable tax calculation

That's it! Sails Tax will automatically calculate the correct tax for every order based on your customer's shipping address.

= Requirements =

* WordPress 5.0 or higher
* WooCommerce 5.0 or higher
* PHP 7.4 or higher
* A Sails Tax account ([sign up free](https://sails.tax))

== Installation ==

= Automatic Installation =

1. Go to Plugins > Add New in your WordPress admin
2. Search for "Sails Tax for WooCommerce"
3. Click "Install Now" and then "Activate"
4. Go to WooCommerce > Settings > Sails Tax
5. Enter your API key and configure settings

= Manual Installation =

1. Download the plugin zip file
2. Go to Plugins > Add New > Upload Plugin
3. Upload the zip file and click "Install Now"
4. Activate the plugin
5. Configure at WooCommerce > Settings > Sails Tax

== Frequently Asked Questions ==

= Where do I get an API key? =

Sign up for a free account at [sails.tax](https://sails.tax) and generate an API key from your dashboard.

= Which countries are supported? =

Currently, Sails Tax supports tax calculation for the United States. More countries coming soon!

= How are tax rates determined? =

Tax rates are determined based on the customer's shipping address, including state, county, city, and special tax districts. We use real-time data to ensure accuracy.

= Does this work with product tax classes? =

Yes! You can assign WooCommerce tax classes to products, and Sails Tax will apply the appropriate product tax code for exemptions and special rates.

= Will this slow down my checkout? =

No. Sails Tax uses smart caching to minimize API calls. Most calculations complete in under 100ms.

= What if the API is unavailable? =

If the Sails Tax API is temporarily unavailable, WooCommerce will fall back to its standard tax calculation. We maintain 99.99% uptime.

== Screenshots ==

1. Settings page - Configure your Sails Tax integration
2. Connection status - Verify your API key is working
3. Checkout - Tax calculated automatically based on address

== Changelog ==

= 1.0.0 =
* Initial release
* Automatic tax calculation for US addresses
* Support for product tax codes
* WooCommerce HPOS compatibility
* Debug logging

== Upgrade Notice ==

= 1.0.0 =
Initial release of Sails Tax for WooCommerce.
