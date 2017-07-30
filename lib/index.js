'use strict';

const _ = require('lodash');
const Joi = require('joi');
const Boom = require('boom');


/**
 *
 */
class Hapify {

	/**
	 *
	 */
    constructor(app, options) {
        this._app = app;
        this._options = Object.assign({ boom: {}, joi: {} }, options);
    }

    /**
     * Add single route to express app
     */
    addRoute(route) {
        if (!_.isObject(route)) {
            throw new Error('route must be an object');
        }
        this._validateRoute(route);
        this._buildRoute(route);
    }

    /**
     * Add array of routes to express app
     */
    addRoutes(routes) {
        if (!_.isArray(routes)) {
            throw new Error('routes must be and array');
        }
        const self = this;
        routes.forEach(function (route) {
            self._validateRoute(route);
            self._buildRoute(route);
        });
    }


    /**
     * create boom methon on response object
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    _boomMiddleware(req, res, next) {
        const self = this;
        res.boom = function (boom) {
            if (!boom.isBoom) {
                throw new Error('res.boom param value must be boom object');
            }
            const output = boom.output;
            if (!_.isEmpty(output.headers)) {
                res.header(output.headers);
            }

            const transformFunc = self._options.boom.transform;
            if (transformFunc) {
                res.status(output.statusCode).json(transformFunc(output.payload));
            } else {
                res.status(output.statusCode).json(output.payload);
            }
        }

        next();
    }



    /**
     * Validate request items based on joi schema
     * @param {*} schema 
     */
    _joiValidate(schema) {
        if (!schema) {
            throw new Error('Please provide a validation schema');
        }

        const keys = ['headers', 'body', 'query', 'params', 'cookies'];

        const self = this;
        return function (req, res, next) {

            for (const key of keys) {
                if (_.has(schema, key)) {
                    const s = schema[key];
                    const value = req[key];
                    const result = Joi.validate(value, s, self._options.joi);

                    if (result.error) {
                        return res.boom(Boom.wrap(result.error, 400));
                    }
                }
            }

            next();
        }
    }




    /**
     * Check required properties for route object
     * @param {*} route 
     */
    _validateRoute(route) {
        const routeStr = JSON.stringify(route);

        if (!_.has(route, 'method')) {
            throw new Error('\'method\' missing from route : ' + routeStr);
        }

        if (!_.has(route, 'path')) {
            throw new Error('\'path\' missing from route : ' + routeStr);
        }

        if (!_.has(route, 'config')) {
            throw new Error('\'config\' missing from route : ' + routeStr);
        }

        if (!_.isObjectLike(route.config)) {
            throw new Error('\'config\' must be an object for route : ' + routeStr);
        }


        const config = route.config;

        if (!_.has(config, 'handler')) {
            throw new Error('\'handler\' missing from route.config : ' + routeStr);
        }

        if (!_.isFunction(config.handler)) {
            throw new Error('\'handler\' must be a function for route.config.handler : ' + routeStr);
        }

        if (_.has(config, 'validate') && !_.isObjectLike(config.validate)) {
            throw new Error('\'validate\' must be and object for route.config.validate : ' + routeStr);
        }

        if (_.has(config, 'middleware')) {
            const middleware = config.middleware;
            if (!_.isFunction(middleware) && !_.isArray(middleware)) {
                throw new Error('\'middleware\' must be a function or array of functions for route.config.middleware : ' + routeStr);
            }
        }
    }



    /**
     * Create express middlewares using route object
     * @param {*} route 
     */
    _buildRoute(route) {
        const app = this._app;
        const method = _.lowerCase(route.method);
        const path = route.path;
        const config = route.config;
        const handler = route.config.handler;

        let middlewares = [];

        middlewares.push(this._boomMiddleware.bind(this));

        // add validation as middleware
        if (config.validate) {
            const v = this._joiValidate(config.validate);
            middlewares.push(v);
        }

        // concat middlewares if provided in the route
        if (config.middleware) {
            middlewares = _.concat(middlewares, config.middleware);
        }

        // at the end put handler as middleware
        middlewares.push(handler);

        // start creating routes for different methods
        if (method == 'get') {
            app.get(path, middlewares);

        } else if (method == 'post') {
            app.post(path, middlewares);

        } else if (method == 'put') {
            app.put(path, middlewares);

        } else if (method == 'delete') {
            app.delete(path, middlewares);

        } else if (method == 'options') {
            app.options(path, middlewares);

        } else if (method == 'trace') {
            app.trace(path, middlewares);

        } else if (method == 'all') {
            app.all(path, middlewares);

        } else {
            throw new Error(method + 'not supported');
        }
    }
}

module.exports = Hapify;