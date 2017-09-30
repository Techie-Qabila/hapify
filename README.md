# Hapify
Do you like [Hapi](https://github.com/hapijs/hapi) Routing format, [Joi](https://github.com/hapijs/joi) validation and [Boom](https://github.com/hapijs/boom) error objects but you don't want to leave [Express](https://github.com/expressjs/express) and it's middlewares echosystem! For the same reasons I creted this library.

# Usage Example
```javascript
const Express = require('express');
const BodyParser = require('body-parser');
const Errorhandler = require('errorhandler');

const Hapify = require('hapify');
const Joi = require('joi');
const Boom = require('boom');


/**
 * Create Express server.
 */
const app = Express();
app.use(Errorhandler())
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

/**
 * Create Hapify instance, settings are optional 
 * in case you want to transform boom response
 * or you want to change Joi settings
 */
const hapify = new Hapify(app, {
    boom: {
        transform: function (payload) {
            return { error: payload };
        }
    }
});


/**
 * Add Hapi like routes using hapify instance
 */
hapify.addRoute({
    method: 'GET',
    path: '/success',
    config: {
        handler: function (req, res) {
            res.json({ status: 'success' });
        }
    }
});

/**
 * res.boom is a function that receives Boom object
 */
hapify.addRoute({
    method: 'GET',
    path: '/boom',
    config: {
        handler: function (req, res) {
            res.boom(Boom.badRequest('I am boom response'));
        }
    }
});


/**
 * Joi validation
 */
hapify.addRoute({
    method: 'POST',
    path: '/validate/:homeId/profile/:profileId',
    config: {
        validate: {
            params: {
                homeId: Joi.string().required(),
                profileId: Joi.string().optional()
            },
            body: {
                name: Joi.string().required()
            }
        },
        handler: function (req, res) {
            const data = {
                params : req.params,
                body: req.body
            };

            res.json(data);
        }
    }
});

/**
 * Express middlewares 
 */
const isAuthenticated = function(req, res, next) {
    const token = req.get('authorization');

    if (!token) {
        return res.boom(Boom.unauthorized('Authorization param missing'));
    }

    next();
}


/**
 * Joi validation
 */
hapify.addRoute({
    method: 'GET',
    path: '/auth',
    config: {
        middleware: isAuthenticated,
        handler: function (req, res) {
            
            res.json({status: 'You are authorzed'});
        }
    }
});



/**
 * Start Express server.
 */
const server = app.listen(3000, function () {
    const port = server.address().port;
    console.log('App listening at %s', port);
});
```