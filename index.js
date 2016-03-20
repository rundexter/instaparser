var agent = require('superagent')
  , q     = require('q')
  , _     = require('lodash')
  , aws   = require('aws-sdk')
  , s3    = new aws.S3()
;

module.exports = {

    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var api_key  = dexter.environment('INSTAPARSER_API_KEY')
          , bucket   = dexter.environment('AWS_S3_BUCKET') || 'env.rundexter.com'
        ;

        if(api_key) {
            this.log("API key found in local env");
            this.process(step, dexter, api_key);
        } else {
            q.ninvoke(s3, 'getObject', { Bucket: bucket, Key: 'instaparser.json' })
              .then(function(data) {
                  return JSON.parse(data.Body.toString().trim()).API_KEY;
              })
              .then(this.process.bind(this, step, dexter))
              .catch(this.fail.bind(this));
        }
    }

    /**
     *  Process the requested URLs using the API Key
     *
     *  @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     *  @param {AppData} dexter Container for all data used in this workflow.
     *  @param {String} api_key The instaparser API Key to use.
     */
    , process: function(step, dexter, api_key) {
        var self     = this
          , urls     = step.input('url')
          , baseUrl  = 'https://www.instaparser.com/api/parse?api_key='+api_key+'&'
          , promises = []
          , api_ep 
        ;

        //at least one url is required
        if (!urls.length) 
            return this.fail({'message': 'Invalid URL'});

        //for each URL generate a promise chain
        urls.each(function(url) {
            promises.push(
                promisify(
                  agent.get(baseUrl + 'url=' + encodeURIComponent(url))
                  , 'end', 'body'
                )
            );
        });

        return q.all(promises)
                 .then(this.complete.bind(this))
                 .catch(this.fail.bind(this))
               ;
    }
};

/**
 * Generate a promise from a superagent request
 * 
 * @param {object} scope - context to bind to
 * @param {string} call - name of function to call
 * @param {string} path - dot notation of path to return from response object
 * 
 * @return q/Promise - a promise that gets resolved on a successful request
 */
function promisify(scope, call, path) {
    var deferred = q.defer(); 

    scope[call](function(err, result) {
        return err || result.statusCode >= 400
          ? deferred.reject(err || result.body)
          : deferred.resolve(_.get(result, path))
        ;
    });

    return deferred.promise;
}
