/**
 * Sails Tax Admin JavaScript
 */
(function($) {
    'use strict';

    $(document).ready(function() {
        // Verify API key button
        $('#sails-tax-verify-btn').on('click', function(e) {
            e.preventDefault();
            
            var $btn = $(this);
            var $status = $('#sails-tax-connection-status');
            var apiKey = $('#sails_tax_api_key').val();
            
            if (!apiKey) {
                alert('Please enter an API key first.');
                return;
            }
            
            $btn.prop('disabled', true).text(sailsTaxAdmin.strings.verifying);
            
            $.ajax({
                url: sailsTaxAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'sails_tax_verify_api_key',
                    nonce: sailsTaxAdmin.nonce,
                    api_key: apiKey
                },
                success: function(response) {
                    if (response.success) {
                        $status.find('.status-indicator')
                            .removeClass('status-disconnected status-disabled')
                            .addClass('status-connected')
                            .html('<span class="dashicons dashicons-yes-alt"></span> ' + sailsTaxAdmin.strings.connected);
                        
                        // Show success message
                        $('<span class="sails-tax-success-msg">' + response.data.message + '</span>')
                            .insertAfter($btn)
                            .delay(3000)
                            .fadeOut(function() { $(this).remove(); });
                    } else {
                        $status.find('.status-indicator')
                            .removeClass('status-connected')
                            .addClass('status-disconnected')
                            .html('<span class="dashicons dashicons-warning"></span> ' + sailsTaxAdmin.strings.error + ': ' + response.data.message);
                    }
                },
                error: function() {
                    $status.find('.status-indicator')
                        .removeClass('status-connected')
                        .addClass('status-disconnected')
                        .html('<span class="dashicons dashicons-warning"></span> ' + sailsTaxAdmin.strings.error);
                },
                complete: function() {
                    $btn.prop('disabled', false).text('Verify Connection');
                }
            });
        });

        // Show/hide API key
        var $apiKeyField = $('#sails_tax_api_key');
        if ($apiKeyField.length) {
            var $toggleBtn = $('<button type="button" class="button button-secondary sails-tax-toggle-key">Show</button>');
            $apiKeyField.after($toggleBtn);
            
            $toggleBtn.on('click', function(e) {
                e.preventDefault();
                if ($apiKeyField.attr('type') === 'password') {
                    $apiKeyField.attr('type', 'text');
                    $(this).text('Hide');
                } else {
                    $apiKeyField.attr('type', 'password');
                    $(this).text('Show');
                }
            });
        }
    });

})(jQuery);
