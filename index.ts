import * as axiosDefault from 'axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import * as qs from 'qs';

/**
 * Just an alias.
 */
const axios = axiosDefault.default;

/**
 * Default configuration.
 */
const defaultConfig = {
    rootUrl: `https://poloniex.com`,
    timeout: 5000,
};

/**
 * Default HTTP agent configuration.
 */
const defaultAgentConfig = {
    baseURL: defaultConfig.rootUrl,
    headers: {
        'User-Agent'  : `Poloniex API Client (poloniex-api node package)`,
    },
    method : 'GET',
    timeout: defaultConfig.timeout,
};

/**
 * The public agent is essentially an alias for the default configuration.
 *
 * @type {{}}
 */
const publicAgentConfig = {
    ...defaultAgentConfig,
};

/**
 * The private agent begins life the same as the public agent, but with 'POST' specified.
 *
 * @type {{method: string}}
 */
const privateAgentConfig = {
    ...defaultAgentConfig,
    method: 'POST',
};

/**
 * The post body shape.
 */
export interface IPostBody {
    command: string;
    nonce: number;
}

/**
 * This function is exported so that a user can experiment with/understand how Poloniex wants requests to be signed.
 * Essentially, for user edification ;).
 *
 * @param {IPostBody} postBody
 * @param {string} privateKey
 * @returns {string}
 */
export const signMessage = (postBody: IPostBody, privateKey: string): string => {

    // Stringify the post data
    const message = qs.stringify(postBody);

    // Return the HMAC digest
    return crypto.createHmac('sha512', privateKey)
                 .update(message)
                 .digest('hex');
};

/**
 * Convenient container for API keys.
 */
export interface IApiAuth {
    publicKey: string;
    privateKey: string;
}

export interface IQueryParams {
    command: string;
}

/**
 * The shape of a Poloniex client.
 */
export interface IPoloniexClient {
    auth?: IApiAuth;

    isUpgraded(): boolean;

    getPublicEndpoint(queryParams?: IQueryParams): Promise<IPoloniexResponse>;

    postToPrivateEndpoint(data: IPostBody): Promise<IPoloniexResponse>;

    signMessage(postBody: IPostBody, privateKey: string): string;

    upgrade(newAuth: IApiAuth): void;
}

/**
 * Factory function to get a new Poloniex client.
 *
 * @param {IApiAuth} auth
 * @returns {IPoloniexClient}
 */
export const getClient = (auth?: IApiAuth): IPoloniexClient => ({

    /**
     * This holds the user's API keys.
     */
    auth,

    /**
     * Fetches data from the public (unauthenticated) endpoints.
     *
     * @param {{}} queryParams
     * @returns {Promise<IPoloniexResponse>}
     */
    async getPublicEndpoint(queryParams?: IQueryParams): Promise<IPoloniexResponse> {

        // The uri is a relative path to the publicAgentConfig,baseUrl
        const uri = `/public?${qs.stringify(queryParams)}`;

        // Construct the actual config to be used
        const agentConfig = { ...publicAgentConfig, url: uri };

        // Finally, send the request and return the response
        return Promise.resolve(await axios(agentConfig));
    },

    /**
     * Checks if the user has supplied API keys.
     *
     * @returns {boolean}
     */
    isUpgraded(): boolean { return this.auth; },

    /**
     * Posts to the private (authenticated) endpoints.  If no API keys have been provided, this function will fail.
     *
     * @param {IPostBody} data
     * @returns {Promise<IPoloniexResponse>}
     */
    async postToPrivateEndpoint(data: IPostBody): Promise<IPoloniexResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/tradingApi`;

        // Add the appropriate POST request headers (API-Key and API-Sign)
        const headers = {
            ...privateAgentConfig.headers,
            Key : this.auth.publicKey,
            Sign: this.signMessage(data, this.auth.privateKey),
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, url: uri, data: qs.stringify(data) };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    /**
     * Include the exported #signMessage function for convenience.
     */
    signMessage,

    /**
     * Upgrades a client with new credentials.
     *
     * @param {IApiAuth} newAuth
     */
    upgrade(newAuth: IApiAuth): void { this.auth = newAuth; },
});

/**
 * Alias for Axios request options.
 */
export interface IPoloniexRequestConfig extends AxiosRequestConfig {}

/**
 * Alias for Axios response.
 */
export interface IPoloniexResponse extends AxiosResponse {}
