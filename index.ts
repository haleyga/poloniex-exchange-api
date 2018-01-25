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
    baseURL       : defaultConfig.rootUrl,
    headers       : {
        'User-Agent': `Poloniex API Client (poloniex-exchange-api node package)`,
    },
    method        : 'GET',
    timeout       : defaultConfig.timeout,
    validateStatus: () => true,
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
 * Generates a new nonce.
 *
 * @returns {number}
 */
//tslint:disable:no-magic-numbers
export const generateNonce = (): number => Date.now() * 1000;

//tslint:enable:no-magic-numbers

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

export interface IRawAgent {
    auth?: IApiAuth;

    isUpgraded(): boolean;

    getPublicEndpoint(queryParams?: IQueryParams, configOverride?: IPoloniexRequestConfig): Promise<AxiosResponse>;

    postToPrivateEndpoint(data: IPostBody, configOverride?: IPoloniexRequestConfig): Promise<AxiosResponse>;

    signMessage(postBody: IPostBody, privateKey: string): string;

    upgrade(newAuth: IApiAuth): void;
}

const getRawAgent = (auth?: IApiAuth): IRawAgent => ({

    /**
     * This holds the user's API keys.
     */
    auth,

    /**
     * Fetches data from the public (unauthenticated) endpoints.
     *
     * @param {{}} queryParams
     * @param configOverride
     * @returns {Promise<IPoloniexResponse>}
     */
    async getPublicEndpoint(queryParams?: IQueryParams,
                            configOverride?: IPoloniexRequestConfig): Promise<AxiosResponse> {

        // Construct local config object
        const config = { ...defaultConfig, ...configOverride };


        // The uri is a relative path to the publicAgentConfig,baseUrl
        const uri = `/public?${qs.stringify(queryParams)}`;

        // Construct the actual config to be used
        const agentConfig = { ...publicAgentConfig, url: uri, ...config };

        try {
            // Finally, send the request and return the response
            return Promise.resolve(await axios(agentConfig));
        } catch (err) {
            return Promise.reject(err);
        }
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
     * @param configOverride
     * @returns {Promise<IPoloniexResponse>}
     */
    async postToPrivateEndpoint(data: IPostBody,
                                configOverride?: IPoloniexRequestConfig): Promise<AxiosResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`not authenticated`);

        // Construct local config object
        const config = { ...defaultConfig, ...configOverride };

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/tradingApi`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (API-Key and API-Sign)
        const headers = {
            ...privateAgentConfig.headers,
            Key : this.auth.publicKey,
            Sign: this.signMessage(data, this.auth.privateKey),
            ...headersOverride,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, url: uri, data: qs.stringify(data), ...config };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            return Promise.reject(err);
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

export type IReturnOrderBookParams = { currencyPair: string, depth?: string };
export type IReturnPublicTradeHistoryParams = { currencyPair: string, start?: string, end?: string };
export type IReturnChartDataParams = { currencyPair: string, start: string, end: string, period: string };
export type IReturnLoanOrdersParams = { currency?: string };

export type IReturnCompleteBalancesParams = { account: string };
export type IGenerateNewAddressParams = { currency: string };
export type IReturnDepositsWithdrawalsParams = { start: string, end: string };
export type IReturnOpenOrdersParams = { currencyPair: string };
export type IReturnPrivateTradeHistoryParams = { currencyPair: string, start?: string, end?: string, limit?: string };
export type IReturnOrderTradesParams = { orderNumber: string; };
export type IBuyParams = {
    currencyPair: string,
    rate: number,
    amount: number,
    fillOrKill: string,
    immediateOrCancel: string,
    postOnly: string,
};

export type ISellParams = {
    currencyPair: string,
    rate: number,
    amount: number,
    fillOrKill: string,
    immediateOrCancel: string,
    postOnly: string,
};

export type ICancelOrderParams = { orderNumber: string; };
export type IMoveOrderParams =
    { orderNumber: string, rate: number, amount?: number, immediateOrCancel: string, postOnly: string };
export type IWithdrawParams = { currency: string, amount: number, address: string, paymentId?: string };
export type IAvailableBalancesParams = { account: string };
export type ITransferBalanceParams = { currency: string, amount: number, fromAddress: string, toAddress: string };
export type IMarginBuyParams = { currencyPair: string, rate: number, amount: number, lendingRate?: number };
export type IMarginSellParams = { currencyPair: string, rate: number, amount: number, lendingRate?: number };
export type IGetMarginPositionParams = { currencyPair: string };
export type ICloseMarginPositionParams = { currencyPair: string };
export type ICreateLoanOfferParams =
    { currency: string, amount: number, duration: number, autoRenew: number, lendingRate: number };
export type ICancelLoanOfferParams = { orderNumber: string };
export type IReturnLendingHistoryParams = { start: string, end: string, limit?: number };
export type IToggleAutoRenvewParams = { orderNumber: string };

/**
 * The shape of a Poloniex client.
 */
export interface IPoloniexClient {

    rawAgent: IRawAgent;

    isUpgraded(): boolean;

    upgrade(newAuth: IApiAuth): void;

    returnTicker(): Promise<IPoloniexResponse>;

    return24Volume(): Promise<IPoloniexResponse>;

    returnOrderBook(queryParams?: IReturnOrderBookParams): Promise<IPoloniexResponse>;

    returnPublicTradeHistory(queryParams: IReturnPublicTradeHistoryParams): Promise<IPoloniexResponse>;

    returnChartData(queryParams: IReturnChartDataParams): Promise<IPoloniexResponse>;

    returnCurrencies(): Promise<IPoloniexResponse>;

    returnLoanOrders(queryParams: IReturnLoanOrdersParams): Promise<IPoloniexResponse>;

    returnBalances(): Promise<IPoloniexResponse>;

    returnCompleteBalances(queryParams?: IReturnCompleteBalancesParams): Promise<IPoloniexResponse>;

    returnDepositAddress(): Promise<IPoloniexResponse>;

    generateNewAddress(queryParams: IGenerateNewAddressParams): Promise<IPoloniexResponse>;

    returnDepositsWithdrawals(queryParams: IReturnDepositsWithdrawalsParams): Promise<IPoloniexResponse>;

    returnOpenOrders(queryParams?: IReturnOpenOrdersParams): Promise<IPoloniexResponse>;

    returnPrivateTradeHistory(queryParams?: IReturnPrivateTradeHistoryParams): Promise<IPoloniexResponse>;

    returnOrderTrades(queryParams?: IReturnOrderTradesParams): Promise<IPoloniexResponse>;

    buy(queryParams: IBuyParams): Promise<IPoloniexResponse>;

    sell(queryParams: ISellParams): Promise<IPoloniexResponse>;

    cancelOrder(queryParams: ICancelOrderParams): Promise<IPoloniexResponse>;

    moveOrder(queryParams: IMoveOrderParams): Promise<IPoloniexResponse>;

    withdraw(queryParams: IWithdrawParams): Promise<IPoloniexResponse>;

    returnFeeInfo(): Promise<IPoloniexResponse>;

    returnAvailableAccountBalances(queryParams?: IAvailableBalancesParams): Promise<IPoloniexResponse>;

    returnTradableBalances(): Promise<IPoloniexResponse>;

    transferBalance(queryParams: ITransferBalanceParams): Promise<IPoloniexResponse>;

    returnMarginAccountSummary(): Promise<IPoloniexResponse>;

    marginBuy(queryParams: IMarginBuyParams): Promise<IPoloniexResponse>;

    marginSell(queryParams: IMarginSellParams): Promise<IPoloniexResponse>;

    getMarginPosition(queryParams?: IGetMarginPositionParams): Promise<IPoloniexResponse>;

    closeMarginPosition(queryParams: ICloseMarginPositionParams): Promise<IPoloniexResponse>;

    createLoanOffer(queryParams: ICreateLoanOfferParams): Promise<IPoloniexResponse>;

    cancelLoanOffer(queryParams: ICancelLoanOfferParams): Promise<IPoloniexResponse>;

    returnOpenLoanOffers(): Promise<IPoloniexResponse>;

    returnActiveLoans(): Promise<IPoloniexResponse>;

    returnLendingHistory(queryParams: IReturnLendingHistoryParams): Promise<IPoloniexResponse>;

    toggleAutoRenew(queryParams: IToggleAutoRenvewParams): Promise<IPoloniexResponse>;
}

/**
 * Factory function to get a new Poloniex client.
 *
 * @param {IApiAuth} auth
 * @param requestConfig
 * @returns {IPoloniexClient}
 */
export const getClient = (auth?: IApiAuth, requestConfig: IPoloniexRequestConfig = null): IPoloniexClient => ({

    rawAgent: getRawAgent(auth),

    isUpgraded(): boolean { return this.rawAgent.isUpgraded(); },

    upgrade(newAuth: IApiAuth): void { this.rawAgent.upgrade(newAuth); },

    async returnTicker(): Promise<IPoloniexResponse> {
        const command = 'returnTicker';
        const params  = { command };

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async return24Volume(): Promise<IPoloniexResponse> {
        const command = 'return24hVolume';
        const params  = { command };

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async returnOrderBook(queryParams?: IReturnOrderBookParams): Promise<IPoloniexResponse> {
        const command  = 'returnOrderBook';
        const required = { command };
        const optional = queryParams ?
                         (({ currencyPair, depth }) => ({ currencyPair, depth }))(queryParams) :
                         { currencyPair: 'all' };
        const params   = { ...required, ...optional };

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async returnPublicTradeHistory(queryParams: IReturnPublicTradeHistoryParams): Promise<IPoloniexResponse> {
        const command = 'returnTradeHistory';
        const params  = (({ currencyPair, start, end }) =>
            ({ command, currencyPair, start, end }))(queryParams);

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async returnChartData(queryParams: IReturnChartDataParams): Promise<IPoloniexResponse> {
        const command = 'returnChartData';
        const params  = (({ currencyPair, start, end, period }) =>
            ({ command, currencyPair, start, end, period }))(queryParams);

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async returnCurrencies(): Promise<IPoloniexResponse> {
        const command = 'returnCurrencies';
        const params  = { command };

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async returnLoanOrders(queryParams: IReturnLoanOrdersParams): Promise<IPoloniexResponse> {
        const command = 'returnLoanOrders';
        const params  = (({ currency }) =>
            ({ command, currency }))(queryParams);

        return this.rawAgent.getPublicEndpoint(params, requestConfig);
    },

    async returnBalances(): Promise<IPoloniexResponse> {
        const command = 'returnBalances';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnCompleteBalances(queryParams?: IReturnCompleteBalancesParams): Promise<IPoloniexResponse> {
        const command  = 'returnCompleteBalances';
        const nonce    = generateNonce();
        const required = { command, nonce };
        const optional = queryParams ?
                         (({ account }) => ({ account }))(queryParams) :
                         { account: 'all' };
        const params   = { ...required, ...optional };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnDepositAddress(): Promise<IPoloniexResponse> {
        const command = 'returnDepositAddress';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async generateNewAddress(queryParams: IGenerateNewAddressParams): Promise<IPoloniexResponse> {
        const command = 'generateNewAddress';
        const nonce   = generateNonce();
        const params  = (({ currency }) =>
            ({ command, nonce, currency }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnDepositsWithdrawals(queryParams: IReturnDepositsWithdrawalsParams): Promise<IPoloniexResponse> {
        const command = 'returnDepositsWithdrawals';
        const nonce   = generateNonce();
        const params  = (({ start, end }) =>
            ({ command, nonce, start, end }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnOpenOrders(queryParams?: IReturnOpenOrdersParams): Promise<IPoloniexResponse> {
        const command  = 'returnOpenOrders';
        const nonce    = generateNonce();
        const required = { command, nonce };
        const optional = queryParams ?
                         (({ currencyPair }) => ({ currencyPair }))(queryParams) :
                         { currencyPair: 'all' };
        const params   = { ...required, ...optional };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnPrivateTradeHistory(queryParams?: IReturnPrivateTradeHistoryParams): Promise<IPoloniexResponse> {
        const command  = 'returnTradeHistory';
        const nonce    = generateNonce();
        const required = { command, nonce };
        const optional = queryParams ?
                         (({ currencyPair, start, end, limit }) =>
                             ({ currencyPair, start, end, limit }))(queryParams) :
                         { currencyPair: 'all' };
        const params   = { ...required, ...optional };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnOrderTrades(queryParams: IReturnOrderTradesParams): Promise<IPoloniexResponse> {
        const command = 'returnOrderTrades';
        const nonce   = generateNonce();
        const params  = (({ orderNumber }) =>
            ({ command, nonce, orderNumber }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async buy(queryParams: IBuyParams): Promise<IPoloniexResponse> {
        const command = 'buy';
        const nonce   = generateNonce();
        const params  = (({ currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly }) =>
            ({ command, nonce, currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async sell(queryParams: ISellParams): Promise<IPoloniexResponse> {
        const command = 'sell';
        const nonce   = generateNonce();
        const params  = (({ currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly }) =>
            ({ command, nonce, currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async cancelOrder(queryParams: ICancelOrderParams): Promise<IPoloniexResponse> {
        const command = 'cancelOrder';
        const nonce   = generateNonce();
        const params  = (({ orderNumber }) =>
            ({ command, nonce, orderNumber }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async moveOrder(queryParams: IMoveOrderParams): Promise<IPoloniexResponse> {
        const command = 'moveOrder';
        const nonce   = generateNonce();
        const params  = (({ orderNumber, rate, amount, immediateOrCancel, postOnly }) =>
            ({ command, nonce, orderNumber, rate, amount, immediateOrCancel, postOnly }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async withdraw(queryParams: IWithdrawParams): Promise<IPoloniexResponse> {
        const command = 'withdraw';
        const nonce   = generateNonce();
        const params  = (({ currency, amount, address, paymentId }) =>
            ({ command, nonce, currency, amount, address, paymentId }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnFeeInfo(): Promise<IPoloniexResponse> {
        const command = 'returnFeeInfo';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnAvailableAccountBalances(queryParams?: IAvailableBalancesParams): Promise<IPoloniexResponse> {
        const command  = 'returnAvailableAccountBalances';
        const nonce    = generateNonce();
        const required = { command, nonce };
        const optional = queryParams ?
                         (({ account }) =>
                             ({ account }))(queryParams) :
                         null;
        const params   = { ...required, ...optional };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnTradableBalances(): Promise<IPoloniexResponse> {
        const command = 'returnTradableBalances';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async transferBalance(queryParams: ITransferBalanceParams): Promise<IPoloniexResponse> {
        const command = 'transferBalance';
        const nonce   = generateNonce();
        const params  = (({ currency, amount, fromAddress, toAddress }) =>
            ({ command, nonce, currency, amount, fromAddress, toAddress }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnMarginAccountSummary(): Promise<IPoloniexResponse> {
        const command = 'returnMarginAccountSummary';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async marginBuy(queryParams: IMarginBuyParams): Promise<IPoloniexResponse> {
        const command = 'marginBuy';
        const nonce   = generateNonce();
        const params  = (({ currencyPair, rate, amount, lendingRate }) =>
            ({ command, nonce, currencyPair, rate, amount, lendingRate }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async marginSell(queryParams: IMarginSellParams): Promise<IPoloniexResponse> {
        const command = 'marginSell';
        const nonce   = generateNonce();
        const params  = (({ currencyPair, rate, amount, lendingRate }) =>
            ({ command, nonce, currencyPair, rate, amount, lendingRate }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async getMarginPosition(queryParams?: IGetMarginPositionParams): Promise<IPoloniexResponse> {
        const command  = 'getMarginPosition';
        const nonce    = generateNonce();
        const required = { command, nonce };
        const optional = queryParams ?
                         (({ currencyPair }) =>
                             ({ currencyPair }))(queryParams) :
                         { currencyPair: 'all' };
        const params   = { ...required, ...optional };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async closeMarginPosition(queryParams: ICloseMarginPositionParams): Promise<IPoloniexResponse> {
        const command = 'closeMarginPosition';
        const nonce   = generateNonce();
        const params  = (({ currencyPair }) =>
            ({ command, nonce, currencyPair }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async createLoanOffer(queryParams: ICreateLoanOfferParams): Promise<IPoloniexResponse> {
        const command = 'createLoanOffer';
        const nonce   = generateNonce();
        const params  = (({ currency, amount, duration, autoRenew, lendingRate }) =>
            ({ command, nonce, currency, amount, duration, autoRenew, lendingRate }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async cancelLoanOffer(queryParams: ICancelLoanOfferParams): Promise<IPoloniexResponse> {
        const command = 'cancelLoanOffer';
        const nonce   = generateNonce();
        const params  = (({ orderNumber }) =>
            ({ command, nonce, orderNumber }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnOpenLoanOffers(): Promise<IPoloniexResponse> {
        const command = 'returnOpenLoanOffers';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnActiveLoans(): Promise<IPoloniexResponse> {
        const command = 'returnActiveLoans';
        const nonce   = generateNonce();
        const params  = { command, nonce };

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async returnLendingHistory(queryParams: IReturnLendingHistoryParams): Promise<IPoloniexResponse> {
        const command = 'returnLendingHistory';
        const nonce   = generateNonce();
        const params  = (({ start, end, limit }) =>
            ({ command, nonce, start, end, limit }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },

    async toggleAutoRenew(queryParams: IToggleAutoRenvewParams): Promise<IPoloniexResponse> {
        const command = 'toggleAutoRenew';
        const nonce   = generateNonce();
        const params  = (({ orderNumber }) =>
            ({ command, nonce, orderNumber }))(queryParams);

        return this.rawAgent.postToPrivateEndpoint(params, requestConfig);
    },
});

/**
 * Alias for Axios request config.
 */
export interface IPoloniexRequestConfig extends AxiosRequestConfig {}

/**
 * Alias for Axios response.
 */
export interface IPoloniexResponse extends AxiosResponse {}
