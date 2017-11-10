## About
This package provides a modern javascript solution for interfacing with the [Poloniex cryptoexchange API][api_ref]. 
Currently, only the REST API has been implemented.  Support for for the Push API is in the works.

This library is intended to be used with ES6, TypeScript, etc.  In the interest of moving towards the more-readable 
`async/await` pattern, callbacks are not supported.  Only native Promise-based interaction is supported.

## Getting Started

#### Install

###### npm
```bash
npm i poloniex-exchange-api
```

###### yarn
```bash
yarn add poloniex-exchange-api
```

#### Quick Start

###### TypeScript
```typescript
import { getClient, IPoloniexClient } from 'poloniex-exchange-api';

const main = async (): Promise<{}> => {
    try {
        const client: IPoloniexClient = getClient({
            publicKey : '', // Your public key
            privateKey: '', // Your private key
        });

        const { status, data } = await client.returnBalances();
        return Promise.resolve(data);
    } catch (err) {
        return Promise.reject(err);
    }
};

main().then(data => console.log(data))
      .catch((err) => {
          console.error(err);
      });
```

###### JavaScript
*This example shows usage without `async/await`.*
```javascript
const poloniex = require('poloniex-exchange-api');

const client = poloniex.getClient({
    publicKey : '', // Your public key
    privateKey: '', // Your private key
});

client.returnBalances()
      .then(response => {
          const { status, data } = response;
          console.log(data);
      })
      .catch(err => console.error(err));

```

***Note: the remainder of this README.md will use TypeScript examples.***

## API Detail

### Public Requests
In order to place requests with public endpoints, simply instantiate the client with no parameters:

###### TypeScript
```typescript
const client: IPoloniexClient = getClient(); 
```

### Private Request

##### Authentication
In order to authenticate a client with the Poloniex API, a private request must provide a public key and a correctly 
signed request.  This library handles request signatures - the user simply provides a public/private key pair. You 
can [generate your own API keys][api_keys_ref] through the Poloniex interface.

#### Available Endpoints

[api_ref]: https://poloniex.com/support/api/
[api_keys_ref]: https://poloniex.com/apiKeys
