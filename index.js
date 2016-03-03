var rest = require('restler');

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var self = this;
        var url = step.input('url').first();
        var api_key = dexter.environment('INSTAPARSER_API_KEY');

        if (url == undefined) {
            return self.fail({'message': 'Invalid URL'});
        }

        var api_ep = 'https://www.instaparser.com/api/parse?url=' + encodeURIComponent(url) + '&api_key=' + api_key;
        rest.get(api_ep).on('complete', function(result, response) {
            if (response.statusCode != 200) {
                return self.fail({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    data: result,
                    message: 'Parse failed. Invalid status code: ' + response.statusCode
                });
            }

            self.complete({
                'url': result.url,
                'site_title': result.source_title,
                'title': result.title,
                'author': result.author,
                'pubtime': result.pubtime,
                'description': result.summary,
                'body': result.body,
                'words': result.words,
                'images': result.images,
                'videos': result.videos,
                'thumbnail': result.og_image
            });
        });
    }
};
