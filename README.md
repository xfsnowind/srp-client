### Javascript Client for the Secure Remote Protocol (SRP)

This project is an experiment, that simply applys the Secure Remote Protocol (SRP) in Javascript Client for register and login. The library I used is [This](https://github.com/symeapp/srp-client), which provides both the client and server side interfaces ( **Warning**: the library I used is an alpha release and uses Mozilla Public License (MPL) 2.0, which means the projects using it must also be open-sourced.) Since we are using Java in the server side, so only the client API is used here. To display the result, the ['Server'](https://gitlab.nsd.uib.no/fx/srpserver) project is also needed.

###Building and running
--------------------

The project is based on Grunt which again use [npm](http://npmjs.org).  It is assumed that npm is already installed on your system.

After cloning the project with git, run `npm -g install grunt-cli` and then `npm install`. This will download grunt and the projects build dependecies.

Once grunt is in place, run `grunt server` to resolve dependencies, build and serve the project, then open `http://localhost:9001` in your browser. Any changes will automatically be picked up and redeployed as long as `grunt server` is running.

### Usage
To display the result, the following procedures are required:

In the client side (for this project):
```bash
npm install -g grunt-cli
npm install
grunt server
```
In the server side, you have to follow [this]().

### Further Reading

- RFC 2945 - The SRP Authentication and Key Exchange System
- RFC 5054 - Using the Secure Remote Password (SRP) Protocol for TLS Authentication

### License

This [library](https://github.com/symeapp/srp-client) used is released under the `MPL`.
